// ===================================
// ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ
// ===================================

// Текущая страница
let currentPage = 'dashboard';

// ===== JWT Auth Helper =====
function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

// Универсальный fetch с авторизацией
async function apiFetch(url, options = {}) {
  const headers = authHeaders();
  if (options.headers) Object.assign(headers, options.headers);
  options.headers = headers;

  const response = await fetch(url, options);

  // Если 401 — токен невалидный, выкидываем на логин
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new Error('Unauthorized');
  }

  return response;
}

// Проверка авторизации при загрузке
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadUserInfo();
  loadPage('dashboard');
  setupNavigation();
});

// Проверка авторизации
function checkAuth() {
  const token = getToken();
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }
}

// Загрузка информации о пользователе
function loadUserInfo() {
  const userJson = localStorage.getItem('user');
  
  if (userJson) {
    const user = JSON.parse(userJson);
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userEmail').textContent = user.email;
  }
}

// Переключение sidebar
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
  
  if (sidebar.classList.contains('active')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

// Выход
function handleLogout() {
  if (confirm('Вы уверены, что хотите выйти?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }
}

// Навигация
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.getAttribute('data-page');
      
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      loadPage(page);
      
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

// Загрузка страницы
function loadPage(page) {
  currentPage = page;
  const contentArea = document.getElementById('contentArea');
  const pageTitle = document.querySelector('.page-title');
  
  const pageTitles = {
    dashboard: 'Дашборд',
    chart: 'График',
    trades: 'Список сделок',
    screener: 'Скринер',
    heatmap: 'Тепловая карта',
    ai: 'ИИ Анализ',
    settings: 'Настройки'
  };
  pageTitle.textContent = pageTitles[page] || 'KotvukAI';
  
  switch (page) {
    case 'dashboard':
      contentArea.innerHTML = getDashboardContent();
      break;
    case 'trades':
      contentArea.innerHTML = getTradesContent();
      loadTradesPage();
      break;
    case 'screener':
      contentArea.innerHTML = getScreenerContent();
      initScreenerPage();
      break;
    case 'heatmap':
      contentArea.innerHTML = getHeatmapContent();
      initHeatmapPage();
      break;
    case 'ai':
      contentArea.innerHTML = getAIContent();
      initAIPage();
      break;
    case 'chart':
    case 'settings':
      contentArea.innerHTML = getUnderDevelopmentContent(pageTitles[page]);
      break;
    default:
      contentArea.innerHTML = getDashboardContent();
  }
}

// ESC закрывает sidebar
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
});
