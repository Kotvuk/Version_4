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

// Обработка формы входа
async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      // Сохраняем JWT токен и user
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard.html';
    } else {
      alert(data.error || 'Ошибка входа');
    }
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка подключения к серверу');
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
    alert('Пароли не совпадают!');
    return;
  }
  
  if (password.length < 6) {
    alert('Пароль должен содержать минимум 6 символов!');
    return;
  }
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      // Сохраняем JWT токен и user — сразу входим
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard.html';
    } else {
      alert(data.error || 'Ошибка регистрации');
    }
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка подключения к серверу');
  }
}
