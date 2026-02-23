// Переключение между формами входа и регистрации
function switchForm(formType) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  
  if (formType === 'register') {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  } else {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  }
}

// Показ/скрытие пароля
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const button = input.parentElement.querySelector('.toggle-password');
  const eyeOpen = button.querySelectorAll('.eye-open');
  const eyeClosed = button.querySelector('.eye-closed');
  
  if (input.type === 'password') {
    input.type = 'text';
    eyeOpen.forEach(el => el.style.display = 'none');
    eyeClosed.style.display = 'block';
  } else {
    input.type = 'password';
    eyeOpen.forEach(el => el.style.display = 'block');
    eyeClosed.style.display = 'none';
  }
}

// Simple toast for auth page (standalone since common.js is not loaded here)
function showAuthToast(message, type = 'error') {
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;top:24px;right:24px;padding:12px 20px;border-radius:8px;font-family:'Inter',sans-serif;font-size:0.9rem;z-index:9999;opacity:0;transform:translateY(-10px);transition:all 0.3s ease;${type === 'error' ? 'background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);' : 'background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid rgba(34,197,94,0.3);'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 10);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(-10px)'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Обработка формы входа
async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      // Сохраняем user info (token хранится в httpOnly cookie сервером)
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard.html';
    } else {
      showAuthToast(data.error || 'Ошибка входа');
    }
  } catch (error) {
    console.error('Ошибка:', error);
    showAuthToast('Ошибка подключения к серверу');
  }
}

// Обработка формы регистрации
async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
  
  if (password !== passwordConfirm) {
    showAuthToast('Пароли не совпадают!');
    return;
  }
  
  if (password.length < 6) {
    showAuthToast('Пароль должен содержать минимум 6 символов!');
    return;
  }
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      // Сохраняем user info (token хранится в httpOnly cookie сервером)
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard.html';
    } else {
      showAuthToast(data.error || 'Ошибка регистрации');
    }
  } catch (error) {
    console.error('Ошибка:', error);
    showAuthToast('Ошибка подключения к серверу');
  }
}
