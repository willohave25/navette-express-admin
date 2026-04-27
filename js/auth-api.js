/**
 * NAVETTE EXPRESS — Auth Bridge API
 * PWA Admin — Remplace Supabase par l'API backend
 * JAEBETS HOLDING
 */
(function () {
  'use strict';

  const API_BASE = 'https://api.jaebets-holding.com';
  const SESSION_KEY = 'adminSession';
  const ALLOWED_ROLES = ['super_admin', 'admin'];

  // ─── Helpers ──────────────────────────────────────────
  function saveSession(token, user) {
    const expires = Date.now() + 7 * 24 * 3600 * 1000; // 7 jours
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user, expires }));
    } catch(e) {}
  }

  function getSession() {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      return s ? JSON.parse(s) : null;
    } catch(e) { return null; }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function showError(msg) {
    // Toast si disponible (admin.js le charge), sinon alert
    if (window.Toast && typeof window.Toast.error === 'function') {
      window.Toast.error('Erreur de connexion', msg);
    } else {
      alert('Erreur : ' + msg);
    }
  }

  // ─── API Login ────────────────────────────────────────
  async function apiLogin(email, password) {
    const res = await fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  }

  // ─── Vérification de session (toutes les pages sauf login) ──
  function checkSession() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const publicPages = ['index.html', '', 'erreur.html'];
    if (publicPages.includes(page)) return;

    const session = getSession();
    if (!session || !session.token || session.expires < Date.now()) {
      clearSession();
      window.location.href = 'index.html';
    }
  }

  // ─── Intercepte le formulaire de login ────────────────
  function hookLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    // Capture = true : on passe AVANT le listener de admin.js
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();

      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const btn = document.getElementById('btnLogin');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!email || !password) {
        showError('Veuillez remplir tous les champs.');
        return;
      }

      if (btn) { btn.classList.add('loading'); btn.disabled = true; }

      try {
        const data = await apiLogin(email, password);

        if (!data.success) {
          showError(data.error?.message || 'Identifiants invalides');
          return;
        }

        const user = data.data.user;
        if (!ALLOWED_ROLES.includes(user.role)) {
          showError('Accès réservé aux administrateurs JAEBETS HOLDING.');
          return;
        }

        // Sauvegarder la session (format attendu par admin.js)
        saveSession(data.data.token, user);

        // Remember me
        const rememberMe = document.getElementById('rememberMe');
        if (rememberMe && rememberMe.checked) {
          localStorage.setItem('rememberedEmail', JSON.stringify(email));
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        if (window.Toast) window.Toast.success('Connexion réussie', 'Bienvenue ' + user.full_name);
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);

      } catch (err) {
        console.error('[AUTH-API]', err);
        showError('Impossible de contacter le serveur. Vérifiez votre connexion.');
      } finally {
        if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
      }

    }, true); // capture = true → avant admin.js
  }

  // ─── Exposer getToken pour les appels API des autres pages ──
  window.NavetteAuth = {
    getToken() {
      const s = getSession();
      return s ? s.token : null;
    },
    getUser() {
      const s = getSession();
      return s ? s.user : null;
    },
    isLoggedIn() {
      const s = getSession();
      return !!(s && s.token && s.expires > Date.now());
    },
    logout() {
      clearSession();
      window.location.href = 'index.html';
    },
    // Fetch authentifié vers l'API
    async apiFetch(path, options = {}) {
      const token = this.getToken();
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const res = await fetch(API_BASE + path, { ...options, headers });
      if (res.status === 401) { this.logout(); return null; }
      return res.json();
    }
  };

  // ─── Bouton déconnexion ───────────────────────────────
  function hookLogout() {
    document.querySelectorAll('#logoutBtn, .nav-link.logout').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        clearSession();
        window.location.href = 'index.html';
      });
    });
  }

  // ─── Init ─────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    checkSession();
    hookLoginForm();
    hookLogout();
  });

})();
