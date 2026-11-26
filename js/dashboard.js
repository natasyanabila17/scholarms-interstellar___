/** dashboard.js - Dashboard controller: KPIs, 4 charts, quota progress, activity feed, recent table */
(function () {
  'use strict';
  if (!Auth.guard('staff')) return;
  UI.renderShell('dashboard');

  const { Api, SCHOLARSHIPS } = SMS;
  const $ = id => document.getElementById(id);
  const user = Auth.current();

  $('welcome').textContent = 'Welcome back, ' + user.fullName + '.';
  const pill = $('rolePill');
  pill.textContent = user.role;
  pill.className = 'role-pill ' + (Auth.isAdmin() ? 'role-admin' : 'role-officer');

  let stats = null, activity = [];
  const charts = {};
  const STATUS_COLORS = { Approved: '#5FC9A0', Pending: '#E8B04B', Rejected: '#E5675D' };

  /* ---------- Chart helpers (read theme colours from CSS so dark mode works) ---------- */
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function applyChartTheme() {
    Chart.defaults.color = css('--bs-secondary-color') || '#6c757d';
    Chart.defaults.borderColor = css('--chart-grid') || 'rgba(0,0,0,.08)';
    Chart.defaults.font.family = css('--bs-body-font-family') || 'system-ui, sans-serif';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
  }

  function make(id, config) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($(id), config);
  }

  /* ---------- KPI cards ---------- */
  function renderKpis(s) {
    const cards = [
      { label: 'Total Applications', value: s.total,                  icon: 'bi-folder2-open',   sub: s.pending + ' awaiting review' },
      { label: 'Approved',           value: s.approved,               icon: 'bi-check2-circle',  sub: s.approvalRate + '% approval rate' },
      { label: 'Pending Review',     value: s.pending,                icon: 'bi-hourglass-split', sub: 'Need a decision' },
      { label: 'Funds Awarded',      value: UI.money(s.totalAwarded), icon: 'bi-cash-coin',      sub: 'Across ' + s.approved + ' awards' }
    ];
    $('kpiRow').innerHTML = cards.map(c => `
      <div class="col-6 col-lg-3">
        <div class="card kpi shadow-sm h-100"><div class="card-body d-flex align-items-center gap-3">
          <div class="kpi-icon" aria-hidden="true"><i class="bi ${c.icon}"></i></div>
          <div class="min-w-0"><div class="text-body-secondary small">${c.label}</div>
            <div class="kpi-value">${c.value}</div>
            <div class="small text-body-secondary">${c.sub}</div></div>
        </div></div>
      </div>`).join('');
  }

  /* ---------- Charts ---------- */
  function drawCharts() {
    if (!stats) return;
    if (typeof Chart === 'undefined') {
      document.querySelectorAll('.chart-wrap').forEach(w => {
        w.innerHTML = '<p class="text-body-secondary small p-3">Charts could not load. Check your internet connection and reload.</p>';
      });
      return;
    }
    applyChartTheme();
    const s = stats, brand = css('--brand'), surface = css('--bs-body-bg');

    /* 1. Status doughnut (click a slice to open the filtered applicants list) */
    const labels = ['Approved', 'Pending', 'Rejected'];
    $('statusChart').setAttribute('aria-label',
      'Doughnut chart of application status: ' + s.approved + ' approved, ' + s.pending + ' pending, ' + s.rejected + ' rejected.');
    make('statusChart', {
      type: 'doughnut',
      data: { labels, datasets: [{ data: [s.approved, s.pending, s.rejected], backgroundColor: labels.map(l => STATUS_COLORS[l]), borderColor: surface, borderWidth: 3 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        onClick: (e, els) => { if (els.length) window.location.href = 'applicants.html?status=' + encodeURIComponent(labels[els[0].index]); },
        onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: ctx => {
            const pct = s.total ? ((ctx.parsed / s.total) * 100).toFixed(1) : 0;
            return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
          } } }
        }
      }
    });

    /* 2. Monthly trend line */
    $('trendChart').setAttribute('aria-label',
      'Line chart of applications received per month, from ' + s.monthly.labels[0] + ' to ' + s.monthly.labels[s.monthly.labels.length - 1] + '.');
    make('trendChart', {
      type: 'line',
      data: { labels: s.monthly.labels, datasets: [{
        label: 'Applications', data: s.monthly.values, borderColor: brand, backgroundColor: brand + '33',
        fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: brand
      }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + ctx.parsed.y + ' applications' } } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Applications' } }, x: { grid: { display: false } } }
      }
    });

    /* 3. Bar by scholarship (toggle: demand vs funds) */
    const isAmount = $('chartMetric').value === 'amount';
    $('scholarshipChart').setAttribute('aria-label',
      'Bar chart of ' + (isAmount ? 'funds awarded' : 'applications received') + ' for each scholarship.');
    make('scholarshipChart', {
      type: 'bar',
      data: { labels: s.perScholarship.map(p => p.name), datasets: [{
        label: isAmount ? 'Funds awarded (RM)' : 'Applications received',
        data: s.perScholarship.map(p => isAmount ? p.amount : p.count), backgroundColor: brand, borderRadius: 6
      }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => isAmount ? ' ' + UI.money(ctx.parsed.y) : ' ' + ctx.parsed.y + ' applications' } } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: isAmount ? 'RM' : 'Applications' } },
          x: { ticks: { maxRotation: 40, minRotation: 0 }, grid: { display: false } }
        }
      }
    });

    /* 4. Faculty horizontal bar */
    $('facultyChart').setAttribute('aria-label',
      'Horizontal bar chart of applications by faculty. Highest: ' + s.byFaculty[0].faculty + ' with ' + s.byFaculty[0].count + '.');
    make('facultyChart', {
      type: 'bar',
      data: { labels: s.byFaculty.map(f => f.faculty), datasets: [{ label: 'Applications', data: s.byFaculty.map(f => f.count), backgroundColor: css('--cyan') || '#8FA3B8', borderRadius: 6 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + ctx.parsed.x + ' applications' } } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } }
      }
    });
  }

  /* ---------- Quota utilisation ---------- */
  function renderQuota(s) {
    $('quotaList').innerHTML = s.perScholarship.map(p => {
      const pct = Math.round((p.used / p.quota) * 100);
      const cls = pct >= 100 ? 'bg-danger' : pct >= 75 ? 'bg-warning' : 'bg-success';
      return `<li class="mb-3">
        <div class="d-flex justify-content-between small mb-1"><span class="fw-semibold">${UI.esc(p.name)}</span>
          <span>${p.used} / ${p.quota}${pct >= 100 ? ' (full)' : ''}</span></div>
        <div class="progress" role="progressbar" aria-label="Quota used for ${UI.esc(p.name)}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar ${cls}" style="width:${pct}%"></div></div></li>`;
    }).join('');
  }

  /* ---------- Activity feed ---------- */
  const ACT_ICON = {
    approve: 'bi-check-circle-fill text-success', reject: 'bi-x-circle-fill text-danger',
    reset: 'bi-arrow-counterclockwise text-secondary', add: 'bi-plus-circle-fill text-primary',
    delete: 'bi-trash-fill text-danger'
  };
  function renderActivity(list) {
    $('activityList').innerHTML = list.length ? list.map(a => `
      <li class="activity-item d-flex gap-3">
        <i class="bi ${ACT_ICON[a.type] || 'bi-info-circle-fill text-secondary'} fs-5" aria-hidden="true"></i>
        <div class="min-w-0"><div>${UI.esc(a.text)}</div>
          <div class="small text-body-secondary">${UI.esc(a.user)} &middot; <time datetime="${UI.esc(a.ts)}">${UI.timeAgo(a.ts)}</time></div></div>
      </li>`).join('') : '<li class="text-body-secondary small">No activity yet.</li>';
  }

  /* ---------- Recent applications table ---------- */
  function renderRecent(s) {
    const body = $('recentBody');
    if (!s.recent.length) {
      body.innerHTML = `<tr><td colspan="4">${UI.emptyState('bi-inbox', 'No applications yet', 'New applications will appear here.')}</td></tr>`;
      return;
    }
    body.innerHTML = s.recent.map(a => {
      const sch = SCHOLARSHIPS.find(x => x.id === a.scholarshipId);
      return `<tr>
        <th scope="row" class="fw-semibold">${UI.esc(a.name)}<div class="small text-body-secondary fw-normal">${UI.formatDate(a.date)}</div></th>
        <td class="d-none d-md-table-cell">${UI.esc(a.faculty)}</td>
        <td>${UI.esc(sch ? sch.name : a.scholarshipId)}</td>
        <td>${UI.badge(a.status)}</td></tr>`;
    }).join('');
  }

  /* ---------- Insight: one plain-language sentence about what needs attention ---------- */
  function renderInsight(s) {
    const top = [...s.perScholarship].sort((a, b) => (b.used / b.quota) - (a.used / a.quota))[0];
    const pct = Math.round((top.used / top.quota) * 100);
    const left = top.quota - top.used;
    const box = $('insight');
    box.innerHTML = `<i class="bi bi-lightbulb-fill" aria-hidden="true"></i>
      <p class="mb-0"><strong>${UI.esc(top.name)}</strong> is the most filled award at ${pct}% of its quota
      (${left > 0 ? left + ' left' : 'full'}). ${s.pending} application${s.pending === 1 ? ' is' : 's are'} waiting for a decision.</p>
      <a class="btn btn-sm btn-light ms-auto" href="applicants.html?status=Pending">Review pending</a>`;
    box.classList.remove('d-none');
  }

  /* ---------- Init ---------- */
  (async function init() {
    try {
      [stats, activity] = await Promise.all([Api.getStats(), Api.getActivity(6)]);
      renderKpis(stats);
      document.querySelectorAll('.kpi-value').forEach(UI.countUp);
      renderInsight(stats);
      renderQuota(stats);
      renderActivity(activity);
      renderRecent(stats);
      drawCharts();
      $('chartMetric').addEventListener('change', drawCharts);
      window.addEventListener('themechange', drawCharts);   // redraw with the new theme colours
    } catch (err) {
      UI.showError('Unable to load dashboard data. ' + err.message);
    }
  })();
})();
