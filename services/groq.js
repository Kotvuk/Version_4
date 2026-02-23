// ===== Groq AI service =====

const https = require('https');
const { GROQ_MAX_TOKENS, GROQ_AGENT_MAX_TOKENS } = require('../utils/constants');

// ===== Groq: ключи из .env =====
const GROQ_KEYS = [];
for (let i = 1; i <= 15; i++) {
  const key = process.env[`GROQ_KEY_${i}`] || '';
  const modelIndex = Math.ceil(i / 3); // 1-3 → model 1, 4-6 → model 2, ...
  const model = process.env[`GROQ_MODEL_${modelIndex}`] || 'llama-3.3-70b-versatile';
  GROQ_KEYS.push({ key, model });
}

const GROQ_GROUPS = [
  [GROQ_KEYS[0],  GROQ_KEYS[1],  GROQ_KEYS[2]],
  [GROQ_KEYS[3],  GROQ_KEYS[4],  GROQ_KEYS[5]],
  [GROQ_KEYS[6],  GROQ_KEYS[7],  GROQ_KEYS[8]],
  [GROQ_KEYS[9],  GROQ_KEYS[10], GROQ_KEYS[11]],
  [GROQ_KEYS[12], GROQ_KEYS[13], GROQ_KEYS[14]],
];

// ===== Groq запрос =====
async function groqRequest(keyEntry, prompt, maxTokens = GROQ_MAX_TOKENS) {
  if (!keyEntry || !keyEntry.key) return null;
  const body = JSON.stringify({
    model: keyEntry.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: maxTokens,
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${keyEntry.key}`,
        'Content-Length': Buffer.byteLength(body),
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ===== Ансамблевый анализ =====
async function callGroqEnsemble(prompt) {
  for (const group of GROQ_GROUPS) {
    const [master, agent1, agent2] = group;
    if (!master || !master.key) continue;
    try {
      const [r1, r2] = await Promise.all([
        groqRequest(agent1, prompt, GROQ_AGENT_MAX_TOKENS).catch(() => null),
        groqRequest(agent2, prompt, GROQ_AGENT_MAX_TOKENS).catch(() => null),
      ]);

      const opinions = [];
      if (r1 && r1.status === 200) opinions.push(r1.data.choices[0].message.content);
      if (r2 && r2.status === 200) opinions.push(r2.data.choices[0].message.content);
      if (opinions.length === 0) continue;

      const jsonSchema = `{"signal":"LONG или SHORT","confidence":число 60-95,"confidence_reason":"почему именно эта точность","summary":"общая картина 1-2 предложения","trend_analysis":"анализ тренда","indicator_analysis":"разбор индикаторов","entry_reason":"почему входить сейчас","risk_analysis":"риски и сценарий отмены","tp_percent":число,"sl_percent":число}`;

      const masterPrompt = opinions.length === 2
        ? `Ты главный аналитик. Два независимых ИИ-агента проанализировали актив.\n\nМнение Агента 1:\n${opinions[0]}\n\nМнение Агента 2:\n${opinions[1]}\n\nОбъедини оба мнения, найди консенсус. Верни ТОЛЬКО валидный JSON без markdown:\n${jsonSchema}`
        : `На основе анализа агента сформируй полный финальный анализ. Верни ТОЛЬКО валидный JSON без markdown:\n${opinions[0]}\nФормат: ${jsonSchema}`;

      const masterResult = await groqRequest(master, masterPrompt, GROQ_MAX_TOKENS).catch(() => null);
      if (masterResult && masterResult.status === 200) {
        return masterResult.data.choices[0].message.content;
      }
      continue;
    } catch (e) {
      continue;
    }
  }
  throw new Error('Все группы Groq исчерпаны');
}

module.exports = { groqRequest, callGroqEnsemble };
