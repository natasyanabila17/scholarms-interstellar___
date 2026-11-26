/**
 * ui.js - Reusable UI helpers: navbar, footer, theme toggle, toast, confirm dialog,
 * badges, escaping and formatting. Every page uses these instead of repeating markup.
 */
(function (global) {
  'use strict';

  const NAV_STAFF = [
    { id: 'dashboard',    href: 'dashboard.html',    label: 'Dashboard',    icon: 'bi-speedometer2' },
    { id: 'applicants',   href: 'applicants.html',   label: 'Applicants',   icon: 'bi-people' },
    { id: 'scholarships', href: 'scholarships.html', label: 'Scholarships', icon: 'bi-award' }
  ];
  const NAV_STUDENT = [
    { id: 'scholarships',    href: 'scholarships.html',    label: 'Scholarships',    icon: 'bi-award' },
    { id: 'my-applications', href: 'my-applications.html', label: 'My Applications', icon: 'bi-journal-check' }
  ];

  /** Escape user-controlled text before inserting into HTML (prevents XSS). */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const money = n => 'RM ' + Number(n).toLocaleString('en-MY');

  const formatDate = iso => {
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? esc(iso) : d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  /** "5 min ago", "3 d ago", or a date for anything older than a week. */
  function timeAgo(iso) {
    const d = new Date(iso);
    const s = (Date.now() - d.getTime()) / 1000;
    if (isNaN(s)) return '';
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    if (s < 604800) return Math.floor(s / 86400) + ' d ago';
    return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const badge = status => {
    const c = { Approved: 'ok', Pending: 'wait', Rejected: 'bad' }[status] || 'wait';
    return `<span class="stamp stamp-${c}">${esc(status)}</span>`;
  };

  const roleClass = role => role === 'Administrator' ? 'role-admin' : role === 'Student' ? 'role-student' : 'role-officer';

  const emptyState = (icon, title, text) => `
    <div class="empty-state"><i class="bi ${icon}" aria-hidden="true"></i>
    <h3 class="h6">${esc(title)}</h3><p class="small mb-0">${esc(text)}</p></div>`;

  /* ---------- Theme toggle ---------- */
  function syncThemeButtons() {
    const dark = global.Theme.current() === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(b => {
      b.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      b.setAttribute('title', dark ? 'Switch to light theme' : 'Switch to dark theme');
      b.innerHTML = `<i class="bi ${dark ? 'bi-sun' : 'bi-moon-stars'}" aria-hidden="true"></i>`;
    });
  }

  function bindThemeToggle() {
    document.addEventListener('click', e => {
      if (e.target.closest('[data-theme-toggle]')) global.Theme.toggle();
    });
    global.addEventListener('themechange', syncThemeButtons);
    syncThemeButtons();
  }

  /** Animate a number inside an element (keeps prefix/suffix such as "RM "). */
  function countUp(el) {
    const m = el.textContent.match(/[\d,]+/);
    if (!m || global.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const end = parseInt(m[0].replace(/,/g, ''), 10);
    const pre = el.textContent.slice(0, m.index), post = el.textContent.slice(m.index + m[0].length);
    const t0 = performance.now();
    (function frame(t) {
      const p = Math.min(1, (t - t0) / 900);
      el.textContent = pre + Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString('en-MY') + post;
      if (p < 1) requestAnimationFrame(frame);
    })(t0);
  }

  /** Celebration burst, used when an application is approved. */
  function confetti() {
    if (global.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.createElement('div');
    box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
    const cols = ['#E8A15B', '#F2E6D2', '#D9602B', '#8FA3B8', '#5FC9A0'];
    for (let i = 0; i < 48; i++) {
      const p = document.createElement('i');
      p.style.cssText = 'left:' + Math.random() * 100 + '%;background:' + cols[i % 5] +
        ';animation-delay:' + Math.random() * 0.3 + 's;--dx:' + (Math.random() * 160 - 80) + 'px';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2200);
  }

  /** Quick menu: press Ctrl+K (or Cmd+K) to jump to any page or action. */
  function initPalette(nav) {
    const items = nav.map(n => ({ label: 'Go to ' + n.label, icon: n.icon, run: () => { location.href = n.href; } })).concat([
      { label: 'Switch light / dark theme', icon: 'bi-circle-half', run: () => global.Theme.toggle() },
      { label: 'Switch live / calm sky', icon: 'bi-stars', run: () => { const b = document.getElementById('skyBtn'); if (b) b.click(); } },
      { label: 'Log out', icon: 'bi-box-arrow-right', run: () => global.Auth.logout() }
    ]);
    const dlg = document.createElement('dialog');
    dlg.className = 'palette'; dlg.setAttribute('aria-label', 'Quick menu');
    dlg.innerHTML = '<input type="search" class="form-control" placeholder="Type a page or action" aria-label="Search pages and actions"><ul class="list-unstyled mb-0" role="listbox"></ul>';
    document.body.appendChild(dlg);
    const input = dlg.querySelector('input'), ul = dlg.querySelector('ul');
    let shown = [], idx = 0;
    function draw() {
      const q = input.value.trim().toLowerCase();
      shown = items.filter(i => i.label.toLowerCase().includes(q));
      idx = Math.min(idx, Math.max(0, shown.length - 1));
      ul.innerHTML = shown.length ? shown.map((i, k) =>
        `<li role="option" aria-selected="${k === idx}" class="${k === idx ? 'on' : ''}" data-k="${k}"><i class="bi ${i.icon} me-2" aria-hidden="true"></i>${esc(i.label)}</li>`).join('')
        : '<li class="text-body-secondary">Nothing matches. Try a page name or "theme".</li>';
    }
    function open() { input.value = ''; idx = 0; draw(); dlg.showModal(); input.focus(); }
    function pick(k) { const it = shown[k]; if (it) { dlg.close(); it.run(); } }
    input.addEventListener('input', () => { idx = 0; draw(); });
    dlg.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(idx + 1, shown.length - 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(idx - 1, 0); draw(); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(idx); }
    });
    ul.addEventListener('click', e => { const li = e.target.closest('[data-k]'); if (li) pick(+li.dataset.k); });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dlg.open ? dlg.close() : open(); }
    });
    const b = document.getElementById('paletteBtn');
    if (b) b.addEventListener('click', open);
  }

  /** Renders navbar + footer into #app-nav and #app-footer. The menu depends on the role. */
  function renderShell(activeId) {
    const user = global.Auth.current();
    const isAdmin = global.Auth.isAdmin();
    const NAV = global.Auth.isStudent() ? NAV_STUDENT : NAV_STAFF;

    const links = NAV.map(n => `
      <li class="nav-item">
        <a class="nav-link ${n.id === activeId ? 'active' : ''}" href="${n.href}" ${n.id === activeId ? 'aria-current="page"' : ''}>
          <i class="bi ${n.icon} me-1" aria-hidden="true"></i>${n.label}
        </a>
      </li>`).join('');

    const nav = document.getElementById('app-nav');
    if (nav) nav.innerHTML = `
      <nav class="navbar navbar-expand-lg app-navbar sticky-top shadow-sm" data-bs-theme="dark" aria-label="Main navigation">
        <div class="container">
          <a class="navbar-brand navbar-brand-text" href="${global.Auth.home()}"><svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><ellipse cx="16" cy="16" rx="15" ry="3.2" fill="none" stroke="currentColor" stroke-width="1.3" opacity=".7"/><circle cx="16" cy="16" r="7.4" fill="#000" stroke="currentColor" stroke-width="1.3"/><path d="M1 16a15 3.2 0 0 0 30 0" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><span>ScholarMS</span></a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav"
                  aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation"><span class="navbar-toggler-icon"></span></button>
          <div class="collapse navbar-collapse" id="mainNav">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">${links}</ul>
            <div class="d-flex align-items-center gap-2 pb-2 pb-lg-0">
              <button class="btn btn-sm btn-outline-light" type="button" id="paletteBtn" aria-label="Open quick menu (Ctrl+K)" title="Quick menu (Ctrl+K)"><i class="bi bi-command" aria-hidden="true"></i></button>
              <button class="btn btn-sm btn-outline-light" type="button" id="skyBtn"></button>
              <button class="btn btn-sm btn-outline-light" type="button" data-theme-toggle></button>
              <div class="dropdown">
                <button class="btn btn-sm btn-outline-light dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="bi bi-person-circle me-1" aria-hidden="true"></i>${esc(user ? user.fullName : 'Guest')}
                </button>
                <ul class="dropdown-menu dropdown-menu-end" data-bs-theme="${global.Theme.current()}">
                  <li><span class="dropdown-item-text small"><span class="role-pill ${roleClass(user && user.role)}">${esc(user ? user.role : '')}</span></span></li>
                  <li><hr class="dropdown-divider"></li>
                  ${isAdmin ? '<li><button class="dropdown-item" type="button" id="resetBtn"><i class="bi bi-arrow-repeat me-2" aria-hidden="true"></i>Reset demo data</button></li>' : ''}
                  <li><button class="dropdown-item" type="button" id="logoutBtn"><i class="bi bi-box-arrow-right me-2" aria-hidden="true"></i>Logout</button></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </nav>`;

    const footer = document.getElementById('app-footer');
    if (footer) footer.innerHTML = `
      <footer class="app-footer pt-4 pb-3" role="contentinfo">
        <div class="container">
          <div class="row gy-3">
            <div class="col-md-5">
              <h2 class="h6">ScholarMS</h2>
              <p class="small mb-2">Student Scholarship Management System. Applications, quotas and funding in one place.</p>
              <p class="motto mb-0">Per aspera ad astra.</p>
            </div>
            <div class="col-6 col-md-3">
              <h2 class="h6">Quick links</h2>
              <ul class="list-unstyled small mb-0">
                ${NAV.map(n => `<li><a href="${n.href}">${n.label}</a></li>`).join('')}
              </ul>
            </div>
            <div class="col-6 col-md-4">
              <h2 class="h6">Contact</h2>
              <address class="small mb-0">
                Scholarship Office<br>
                <a href="mailto:scholarship@example.edu.my">scholarship@example.edu.my</a>
              </address>
            </div>
          </div>
          <hr class="border-secondary my-3">
          <p class="small text-center mb-0">&copy; ${new Date().getFullYear()} ScholarMS &middot; Natasya Nabila &middot; IMS566 Individual Assignment</p>
        </div>
      </footer>`;

    const out = document.getElementById('logoutBtn');
    if (out) out.addEventListener('click', global.Auth.logout);

    const reset = document.getElementById('resetBtn');
    if (reset) reset.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Reset demo data?',
        body: 'All applications and the activity log return to the original sample data. User accounts are kept.',
        okText: 'Reset data', okClass: 'btn-danger'
      });
      if (!ok) return;
      try { await global.SMS.Api.resetDemo(); window.location.reload(); }
      catch (err) { toast(err.message, 'danger'); }
    });

    /* Calm sky: freezes and dims the starfield for comfortable reading (remembered between visits) */
    const sky = document.getElementById('skyBtn');
    if (sky) {
      const root = document.documentElement;
      const sync = () => {
        const calm = root.dataset.sky === 'calm';
        const msg = calm ? 'Calm sky is on. Switch to the live sky' : 'Live sky is on. Switch to a calm sky';
        sky.setAttribute('aria-pressed', calm); sky.setAttribute('aria-label', msg); sky.title = msg;
        sky.innerHTML = '<i class="bi ' + (calm ? 'bi-star' : 'bi-stars') + '" aria-hidden="true"></i>';
      };
      sky.addEventListener('click', () => {
        const calm = root.dataset.sky !== 'calm';
        if (calm) root.dataset.sky = 'calm'; else delete root.dataset.sky;
        try { localStorage.setItem('sms_sky_v1', calm ? 'calm' : 'live'); } catch (e) { /* ignore */ }
        global.dispatchEvent(new Event('skychange')); sync();
      });
      sync();
    }
    initPalette(NAV);
    bindThemeToggle();
  }

  /** Accessible toast notification. */
  function toast(message, type) {
    type = type || 'success';
    let box = document.getElementById('toastBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toastBox';
      box.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = `toast align-items-center text-bg-${type} border-0`;
    el.setAttribute('role', type === 'danger' ? 'alert' : 'status');
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    box.appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 3500 });
    el.addEventListener('hidden.bs.toast', () => el.remove());
    t.show();
  }

  /** Promise-based confirm dialog (replaces the ugly window.confirm). Resolves true / false. */
  function confirmDialog(opts) {
    return new Promise(resolve => {
      const old = document.getElementById('confirmModal');
      if (old) old.remove();
      const el = document.createElement('div');
      el.className = 'modal fade';
      el.id = 'confirmModal';
      el.tabIndex = -1;
      el.setAttribute('aria-labelledby', 'confirmTitle');
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title h5" id="confirmTitle">${esc(opts.title)}</h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">${esc(opts.body)}</div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn ${opts.okClass || 'btn-danger'}" id="confirmOk">${esc(opts.okText || 'Confirm')}</button>
          </div>
        </div></div>`;
      document.body.appendChild(el);
      const modal = new bootstrap.Modal(el);
      let result = false;
      el.querySelector('#confirmOk').addEventListener('click', () => { result = true; modal.hide(); });
      el.addEventListener('hidden.bs.modal', () => { el.remove(); resolve(result); });
      modal.show();
    });
  }

  function showError(msg) {
    const box = document.getElementById('errorBox');
    if (!box) return;
    box.innerHTML = `<i class="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>${esc(msg)}
      <button class="btn btn-sm btn-outline-danger ms-3" type="button" onclick="location.reload()">Retry</button>`;
    box.classList.remove('d-none');
  }

  /** Quota gauge: a planet that has travelled pct% of the way round its orbit. */
  function orbit(pct, full) {
    const r = 26, circ = 2 * Math.PI * r, a = pct / 100 * 2 * Math.PI - Math.PI / 2;
    return `<svg class="orbit" viewBox="0 0 64 64" role="img" aria-label="${pct}% of the quota used">
      <circle class="o-track" cx="32" cy="32" r="${r}"/>
      <circle class="o-arc ${full ? 'full' : ''}" cx="32" cy="32" r="${r}" stroke-dasharray="${(circ * pct / 100).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 32 32)"/>
      <circle class="o-planet ${full ? 'full' : ''}" cx="${(32 + r * Math.cos(a)).toFixed(1)}" cy="${(32 + r * Math.sin(a)).toFixed(1)}" r="4.5"/>
      <text class="o-text" x="32" y="36.5" text-anchor="middle">${pct}%</text></svg>`;
  }

  /** The sky: a slow starfield, a black hole with a lensed amber accretion disk (drawn once to a sprite, then
   composited), and a tiny ring-shaped spacecraft drifting across. Only dark mode and the login page show it. */
  function stars() {
    if (document.getElementById('stars')) return;
    const c = document.createElement('canvas');
    c.id = 'stars'; c.setAttribute('aria-hidden', 'true'); document.body.prepend(c);
    const x = c.getContext('2d'), reduce = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const auth = document.body.classList.contains('auth-body');
    const TINT = ['#FFF8EA', '#FFF8EA', '#FFF8EA', '#CFE0F5', '#FFD9A8'];
    let w, h, dpr = 1, pts = [], hole = null, cx = 0, cy = 0, R = 0, mx = 0, my = 0, running = false;
    const calm = () => document.documentElement.dataset.sky === 'calm';
    const asleep = () => !auth && global.Theme.current() === 'light';

    /* Render the black hole once. R is its shadow radius in device pixels. */
    function buildHole(r) {
      const W = Math.ceil(r * 8), H = Math.ceil(r * 5), o = document.createElement('canvas');
      o.width = W; o.height = H;
      const g = o.getContext('2d'), mx0 = W / 2, my0 = H / 2;
      let gr = g.createRadialGradient(mx0, my0, r * 0.9, mx0, my0, r * 2.45);          // ambient glow
      gr.addColorStop(0, 'rgba(232,161,91,.30)'); gr.addColorStop(0.4, 'rgba(217,96,43,.10)'); gr.addColorStop(1, 'rgba(217,96,43,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      gr = g.createRadialGradient(mx0, my0, r, mx0, my0, r * 2.1);                      // lensed halo: the far side of the disk bent over the top and under the bottom
      gr.addColorStop(0, 'rgba(255,238,208,.95)'); gr.addColorStop(0.07, 'rgba(255,200,130,.7)');
      gr.addColorStop(0.28, 'rgba(232,150,80,.26)'); gr.addColorStop(1, 'rgba(217,96,43,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(mx0, my0, r * 2.1, 0, 6.2832); g.fill();
      g.fillStyle = '#000'; g.beginPath(); g.arc(mx0, my0, r, 0, 6.2832); g.fill();      // the shadow
      g.strokeStyle = 'rgba(255,240,215,.9)'; g.lineWidth = Math.max(1, r * 0.014);     // photon ring
      g.beginPath(); g.arc(mx0, my0, r * 1.012, 0, 6.2832); g.stroke();
      const lens = (ry, m, reach) => {                                                   // the disk seen edge-on; brighter on the approaching (left) side
        g.save(); g.translate(mx0, my0); g.scale(1, ry); g.globalCompositeOperation = 'lighter';
        const lg = g.createLinearGradient(-reach, 0, reach, 0), a = v => Math.min(1, v * m).toFixed(2);
        lg.addColorStop(0, 'rgba(200,90,40,0)'); lg.addColorStop(0.16, 'rgba(215,100,45,' + a(0.4) + ')');
        lg.addColorStop(0.33, 'rgba(255,170,90,' + a(0.8) + ')'); lg.addColorStop(0.47, 'rgba(255,225,185,' + a(0.65) + ')');
        lg.addColorStop(0.53, 'rgba(255,225,185,' + a(0.5) + ')'); lg.addColorStop(0.67, 'rgba(240,160,90,' + a(0.55) + ')');
        lg.addColorStop(0.84, 'rgba(200,90,40,' + a(0.22) + ')'); lg.addColorStop(1, 'rgba(200,90,40,0)');
        g.fillStyle = lg; g.beginPath(); g.arc(0, 0, reach, 0, 6.2832); g.fill(); g.restore();
      };
      lens(0.1, 0.3, r * 3.9); lens(0.022, 1.5, r * 3.7);
      return o;
    }

    function layout() {
      const m = Math.min(w, h);
      if (auth) { if (w >= 992) { cx = w * 0.3; cy = h * 0.5; R = m * 0.19; } else { cx = w * 0.5; cy = h * 0.2; R = Math.min(w * 0.15, h * 0.1); } }
      else if (w < 700) { cx = w * 0.82; cy = h * 0.12; R = w * 0.06; }
      else { cx = w * 0.86; cy = h * 0.2; R = m * 0.085; }
      hole = buildHole(R * dpr);
    }
    function size() {
      dpr = Math.min(2, global.devicePixelRatio || 1);
      w = innerWidth; h = innerHeight; c.width = w * dpr; c.height = h * dpr;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = Array.from({ length: Math.round(w * h / 5200) }, () => ({
        x: Math.random() * w, y: Math.random() * h, z: Math.random() * 0.9 + 0.1, t: Math.random() * 6.28, c: TINT[Math.floor(Math.random() * 5)]
      }));
      layout();
    }

    /* A tiny ring-shaped ship with twelve modules, turning slowly as it drifts. */
    function ship(t) {
      const s = reduce ? 0 : t, px = reduce ? w * 0.2 : ((s / 90) % (w + 120)) - 60, py = h * 0.8 + Math.sin(s / 7000) * 10, re = 13;
      x.save(); x.translate(px, py); x.rotate(-0.28);
      x.strokeStyle = 'rgba(207,214,224,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-17, 0); x.lineTo(17, 0); x.stroke();
      for (let i = 0; i < 12; i++) {
        const a = s / 5000 + i * Math.PI / 6, sy = Math.sin(a), depth = 0.5 + 0.5 * sy;
        x.globalAlpha = 0.35 + 0.55 * depth; x.fillStyle = depth > 0.6 ? '#F2E6D2' : '#8FA3B8';
        x.fillRect(Math.cos(a) * re - 1.6, sy * re * 0.34 - 1.1, 3.2, 2.2);
      }
      x.restore();
    }

    function draw(t) {
      if (asleep()) { running = false; return; }
      x.clearRect(0, 0, w, h);
      for (const p of pts) {
        x.fillStyle = p.c;
        x.globalAlpha = 0.8 * (reduce ? 1 : 0.6 + 0.4 * Math.sin(t / 1100 + p.t)) * p.z;
        if (!reduce && !calm()) { p.x -= p.z * 0.04; if (p.x < 0) p.x = w; }
        x.beginPath(); x.arc(p.x, p.y, p.z * 1.3, 0, 6.2832); x.fill();
      }
      const ox = (mx - w / 2) * 0.006, oy = (my - h / 2) * 0.006;
      x.save(); x.translate(cx - ox, cy - oy); x.rotate(-0.09);
      x.globalAlpha = (auth ? 1 : 0.9) * (reduce ? 1 : 0.94 + 0.06 * Math.sin(t / 2600));
      x.drawImage(hole, -hole.width / dpr / 2, -hole.height / dpr / 2, hole.width / dpr, hole.height / dpr);
      x.restore(); x.globalAlpha = 1;
      ship(t);
      if (!reduce && !calm()) requestAnimationFrame(draw); else running = false;
    }
    const kick = () => { if (!running) { running = true; requestAnimationFrame(draw); } };
    mx = innerWidth / 2; my = innerHeight / 2;
    addEventListener('resize', () => { size(); if (!running) kick(); });
    addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    global.addEventListener('skychange', kick);
    global.addEventListener('themechange', kick);
    size(); kick();
  }
  stars();

  global.UI = { esc, money, formatDate, timeAgo, badge, roleClass, emptyState, renderShell, bindThemeToggle, toast, confirm: confirmDialog, showError, countUp, confetti, orbit };
})(window);
