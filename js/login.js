/** login.js - Login / Register page controller (registration creates Student accounts) */
(function () {
  'use strict';

  // Already signed in? Go straight to the right home page for this role.
  if (Auth.current()) { window.location.replace(Auth.home()); return; }

  UI.bindThemeToggle();
  document.getElementById('yr').textContent = new Date().getFullYear();

  const alertBox = document.getElementById('authAlert');
  function showAlert(msg, type) {
    alertBox.className = 'alert alert-' + type;
    alertBox.textContent = msg;
  }
  function clearAlert() { alertBox.className = 'alert d-none'; alertBox.textContent = ''; }

  /* Show / hide password */
  document.querySelectorAll('[data-toggle-password]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.togglePassword);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      btn.firstElementChild.className = show ? 'bi bi-eye-slash' : 'bi bi-eye';
    });
  });

  /* Demo credential buttons fill the form (handy for the lecturer) */
  document.querySelectorAll('[data-fill]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [u, p] = btn.dataset.fill.split(':');
      document.getElementById('loginUser').value = u;
      document.getElementById('loginPass').value = p;
      document.getElementById('loginForm').classList.remove('was-validated');
      clearAlert();
      document.getElementById('loginBtn').focus();
    });
  });

  /* Lockout: 3 wrong attempts start a 30 second cool-down (stored for this tab only) */
  const LOCK_KEY = 'sms_lock_v1', MAX_TRIES = 3, LOCK_SECONDS = 30;
  let tries = 0, lockTimer = null;
  const lockLeft = () => Math.max(0, Math.ceil((Number(sessionStorage.getItem(LOCK_KEY) || 0) - Date.now()) / 1000));
  function tickLock() {
    const btn = document.getElementById('loginBtn'), label = btn.querySelector('.btn-label'), left = lockLeft();
    if (left > 0) {
      btn.disabled = true; label.textContent = 'Try again in ' + left + 's';
      showAlert('Too many failed attempts. Wait ' + left + ' seconds, then try again.', 'warning');
      lockTimer = setTimeout(tickLock, 1000);
    } else {
      if (lockTimer) clearAlert();
      lockTimer = null; tries = 0; btn.disabled = false; label.textContent = 'Sign In';
    }
  }
  tickLock();

  /* LOGIN */
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    if (lockLeft() > 0) return;
    clearAlert();
    loginForm.classList.add('was-validated');
    if (!loginForm.checkValidity()) return;

    const btn = document.getElementById('loginBtn');
    const spinner = btn.querySelector('.spinner-border');
    btn.disabled = true; spinner.classList.remove('d-none');

    // Small delay to simulate a network request
    setTimeout(() => {
      const res = Auth.login(document.getElementById('loginUser').value, document.getElementById('loginPass').value);
      if (res.ok) {
        window.location.href = Auth.home();
      } else {
        tries++;
        spinner.classList.add('d-none');
        if (tries >= MAX_TRIES) {
          sessionStorage.setItem(LOCK_KEY, String(Date.now() + LOCK_SECONDS * 1000));
          tickLock();
        } else {
          const left = MAX_TRIES - tries;
          showAlert(res.message + ' ' + left + ' attempt' + (left === 1 ? '' : 's') + ' left.', 'danger');
          btn.disabled = false;
        }
        document.getElementById('loginPass').value = '';
        document.getElementById('loginPass').focus();
        loginForm.classList.remove('was-validated');
      }
    }, 500);
  });

  /* REGISTER (students) */
  const regForm = document.getElementById('registerForm');
  const p1 = document.getElementById('regPass'), p2 = document.getElementById('regPass2');
  const checkMatch = () => p2.setCustomValidity(p1.value && p1.value !== p2.value ? 'mismatch' : '');
  p1.addEventListener('input', checkMatch); p2.addEventListener('input', checkMatch);

  regForm.addEventListener('submit', e => {
    e.preventDefault();
    clearAlert(); checkMatch();
    regForm.classList.add('was-validated');
    if (!regForm.checkValidity()) return;

    const res = Auth.register({
      fullName: document.getElementById('regName').value.trim(),
      matric: document.getElementById('regMatric').value.trim(),
      faculty: document.getElementById('regFaculty').value,
      cgpa: document.getElementById('regCgpa').value,
      username: document.getElementById('regUser').value.trim(),
      password: p1.value
    });
    if (res.ok) {
      showAlert('Account created! You can now log in and apply for scholarships.', 'success');
      regForm.reset(); regForm.classList.remove('was-validated');
      bootstrap.Tab.getOrCreateInstance(document.getElementById('login-tab')).show();
    } else {
      showAlert(res.message, 'danger');
    }
  });
})();
