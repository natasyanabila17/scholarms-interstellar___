/** applicants.js - Applicants data view: search, filter, sort, paginate, detail panel, role-based actions */
(function () {
  'use strict';
  if (!Auth.guard('staff')) return;
  UI.renderShell('applicants');

  const { Api, SCHOLARSHIPS, scholarshipState } = SMS;
  const isAdmin = Auth.isAdmin();
  const PAGE_SIZE = 8;
  const state = { all: [], q: '', status: '', faculty: '', sortKey: 'date', sortDir: 'desc', page: 1 };

  const $ = id => document.getElementById(id);
  const sch = id => SCHOLARSHIPS.find(s => s.id === id);
  const schName = id => (sch(id) || {}).name || id;

  // Officers can view and submit, but only administrators can decide or delete.
  if (!isAdmin) {
    const note = $('roleNote');
    note.innerHTML = '<i class="bi bi-info-circle me-2" aria-hidden="true"></i>You are signed in as <strong>Scholarship Officer</strong>. You can view and submit applications. Only an <strong>Administrator</strong> can approve, reject or delete.';
    note.classList.remove('d-none');
  }

  /* ---------- Derived (filtered + sorted) data ---------- */
  function getView() {
    const q = state.q.trim().toLowerCase();
    const rows = state.all.filter(a =>
      (!q || a.name.toLowerCase().includes(q) || a.matric.includes(q)) &&
      (!state.status || a.status === state.status) &&
      (!state.faculty || a.faculty === state.faculty));

    const dir = state.sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const x = a[state.sortKey], y = b[state.sortKey];
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
    });
    return rows;
  }

  /* ---------- Rendering ---------- */
  function actionButtons(a) {
    const view = `<button class="btn btn-sm btn-outline-primary" data-view="${a.id}" aria-label="View details of ${UI.esc(a.name)}"><i class="bi bi-eye" aria-hidden="true"></i></button>`;
    if (!isAdmin) return view;
    return view + `
      <button class="btn btn-sm btn-outline-success" data-act="Approved" data-id="${a.id}" ${a.status === 'Approved' ? 'disabled' : ''} aria-label="Approve ${UI.esc(a.name)}"><i class="bi bi-check-lg" aria-hidden="true"></i></button>
      <button class="btn btn-sm btn-outline-danger" data-act="Rejected" data-id="${a.id}" ${a.status === 'Rejected' ? 'disabled' : ''} aria-label="Reject ${UI.esc(a.name)}"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
      <button class="btn btn-sm btn-outline-secondary" data-act="Pending" data-id="${a.id}" ${a.status === 'Pending' ? 'disabled' : ''} aria-label="Reset ${UI.esc(a.name)} to pending"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i></button>
      <button class="btn btn-sm btn-outline-danger" data-del="${a.id}" aria-label="Delete application of ${UI.esc(a.name)}"><i class="bi bi-trash" aria-hidden="true"></i></button>`;
  }

  function render() {
    const rows = getView();
    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * PAGE_SIZE;
    const slice = rows.slice(start, start + PAGE_SIZE);

    const body = $('appBody');
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="7">${UI.emptyState('bi-search', 'No applicants found', 'Try changing your search or filters.')}</td></tr>`;
    } else {
      body.innerHTML = slice.map(a => `
        <tr>
          <th scope="row">
            <div class="fw-semibold">${UI.esc(a.name)}</div>
            <div class="small text-body-secondary d-lg-none fw-normal">${UI.esc(a.matric)}</div>
          </th>
          <td class="d-none d-lg-table-cell">${UI.esc(a.matric)}</td>
          <td class="d-none d-md-table-cell">${UI.esc(a.faculty)}</td>
          <td>${Number(a.cgpa).toFixed(2)}</td>
          <td class="d-none d-md-table-cell">${UI.esc(schName(a.scholarshipId))}</td>
          <td>${UI.badge(a.status)}</td>
          <td class="text-end"><div class="d-flex flex-wrap gap-1 justify-content-end">${actionButtons(a)}</div></td>
        </tr>`).join('');
    }

    $('resultCount').textContent = `${rows.length} application${rows.length === 1 ? '' : 's'} found`;
    $('pageInfo').textContent = rows.length ? `Showing ${start + 1}-${start + slice.length} of ${rows.length}` : '';
    renderPager(pages);
    updateSortHeaders();
  }

  function renderPager(pages) {
    const p = $('pager');
    if (pages <= 1) { p.innerHTML = ''; return; }
    let html = `<li class="page-item ${state.page === 1 ? 'disabled' : ''}"><button class="page-link" data-page="${state.page - 1}" aria-label="Previous page">&laquo;</button></li>`;
    for (let i = 1; i <= pages; i++) {
      html += `<li class="page-item ${i === state.page ? 'active' : ''}"><button class="page-link" data-page="${i}" ${i === state.page ? 'aria-current="page"' : ''}>${i}</button></li>`;
    }
    html += `<li class="page-item ${state.page === pages ? 'disabled' : ''}"><button class="page-link" data-page="${state.page + 1}" aria-label="Next page">&raquo;</button></li>`;
    p.innerHTML = html;
  }

  function updateSortHeaders() {
    document.querySelectorAll('#appTable thead th').forEach(th => {
      const btn = th.querySelector('.sort-btn');
      if (!btn) return;
      const active = btn.dataset.key === state.sortKey;
      th.setAttribute('aria-sort', active ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
      btn.querySelector('i').className = 'bi ' + (active ? (state.sortDir === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-arrow-down-up');
    });
  }

  function showLoading() {
    $('appBody').innerHTML = Array.from({ length: 5 }, () =>
      `<tr><td colspan="7"><div class="skeleton rounded" style="height:28px"></div></td></tr>`).join('');
  }

  /* ---------- Detail panel (offcanvas) ---------- */
  function check(ok, title, text) {
    return `<li class="list-group-item d-flex gap-3 align-items-start">
      <i class="bi ${ok ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'} fs-5" aria-hidden="true"></i>
      <div><div class="fw-semibold">${title}</div><div class="small text-body-secondary">${text}</div></div></li>`;
  }

  function openDetail(id) {
    const a = state.all.find(x => x.id === id);
    if (!a) return;
    const s = sch(a.scholarshipId) || { name: a.scholarshipId, minCgpa: 0, quota: 0, amount: 0, deadline: a.date, category: '-' };
    const info = scholarshipState(s, state.all);
    const quotaOk = a.status === 'Approved' || !info.full;

    $('detailTitle').textContent = a.name;
    $('detailBody').innerHTML = `
      <div class="mb-3">${UI.badge(a.status)} <span class="small text-body-secondary ms-2">${UI.esc(a.id)}</span></div>
      <dl class="row small mb-4">
        <dt class="col-5 fw-normal text-body-secondary">Matric number</dt><dd class="col-7">${UI.esc(a.matric)}</dd>
        <dt class="col-5 fw-normal text-body-secondary">Faculty</dt><dd class="col-7">${UI.esc(a.faculty)}</dd>
        <dt class="col-5 fw-normal text-body-secondary">CGPA</dt><dd class="col-7">${Number(a.cgpa).toFixed(2)}</dd>
        <dt class="col-5 fw-normal text-body-secondary">Scholarship</dt><dd class="col-7">${UI.esc(s.name)}</dd>
        <dt class="col-5 fw-normal text-body-secondary">Award</dt><dd class="col-7">${UI.money(s.amount)}</dd>
        <dt class="col-5 fw-normal text-body-secondary">Applied on</dt><dd class="col-7">${UI.formatDate(a.date)}</dd>
      </dl>
      <h3 class="h6">Eligibility check</h3>
      <ul class="list-group mb-3">
        ${check(a.cgpa >= s.minCgpa, 'CGPA requirement', Number(a.cgpa).toFixed(2) + ' against a minimum of ' + Number(s.minCgpa).toFixed(2))}
        ${check(quotaOk, 'Quota available', info.used + ' of ' + s.quota + ' awards already approved')}
        ${check(a.date <= s.deadline, 'Submitted before deadline', 'Deadline: ' + UI.formatDate(s.deadline))}
      </ul>`;

    const foot = $('detailFoot');
    if (isAdmin) {
      foot.innerHTML = `
        <button class="btn btn-success" data-act="Approved" data-id="${a.id}" ${a.status === 'Approved' ? 'disabled' : ''}><i class="bi bi-check-lg me-1" aria-hidden="true"></i>Approve</button>
        <button class="btn btn-danger" data-act="Rejected" data-id="${a.id}" ${a.status === 'Rejected' ? 'disabled' : ''}><i class="bi bi-x-lg me-1" aria-hidden="true"></i>Reject</button>`;
      foot.classList.remove('d-none');
    } else {
      foot.classList.add('d-none');
    }
    bootstrap.Offcanvas.getOrCreateInstance($('detailCanvas')).show();
  }

  /* ---------- Actions ---------- */
  async function decide(id, status, btn) {
    if (btn) btn.disabled = true;
    try {
      const updated = await Api.updateStatus(id, status);
      const i = state.all.findIndex(a => a.id === updated.id);
      state.all[i] = updated;
      UI.toast(`${updated.name} marked as ${updated.status}.`);
      if (updated.status === 'Approved') UI.confetti();
      bootstrap.Offcanvas.getOrCreateInstance($('detailCanvas')).hide();
    } catch (err) {
      UI.toast(err.message, 'danger');
    }
    render();
  }

  async function remove(id) {
    const a = state.all.find(x => x.id === id);
    if (!a) return;
    const ok = await UI.confirm({
      title: 'Delete application?',
      body: `This permanently removes the application of ${a.name}. This cannot be undone.`,
      okText: 'Delete', okClass: 'btn-danger'
    });
    if (!ok) return;
    try {
      await Api.deleteApplication(id);
      state.all = state.all.filter(x => x.id !== id);
      UI.toast('Application deleted.');
    } catch (err) {
      UI.toast(err.message, 'danger');
    }
    render();
  }

  /* ---------- Events ---------- */
  let debounce;
  $('searchInput').addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.q = e.target.value; state.page = 1; render(); }, 200);
  });
  $('statusFilter').addEventListener('change', e => { state.status = e.target.value; state.page = 1; render(); });
  $('facultyFilter').addEventListener('change', e => { state.faculty = e.target.value; state.page = 1; render(); });
  $('clearBtn').addEventListener('click', () => {
    state.q = state.status = state.faculty = ''; state.page = 1;
    $('searchInput').value = ''; $('statusFilter').value = ''; $('facultyFilter').value = '';
    render();
  });

  // Press "/" anywhere to jump to search
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/^(input|textarea|select)$/i.test(document.activeElement.tagName)) {
      e.preventDefault(); $('searchInput').focus();
    }
  });

  document.querySelectorAll('.sort-btn').forEach(btn => btn.addEventListener('click', () => {
    const key = btn.dataset.key;
    state.sortDir = state.sortKey === key && state.sortDir === 'asc' ? 'desc' : 'asc';
    state.sortKey = key; state.page = 1; render();
  }));

  $('pager').addEventListener('click', e => {
    const b = e.target.closest('[data-page]');
    if (!b) return;
    state.page = Number(b.dataset.page); render();
    $('appTable').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // One delegated listener handles view / decide / delete for the table
  $('appBody').addEventListener('click', e => {
    const v = e.target.closest('[data-view]');
    if (v) { openDetail(v.dataset.view); return; }
    const act = e.target.closest('[data-act]');
    if (act) { decide(act.dataset.id, act.dataset.act, act); return; }
    const del = e.target.closest('[data-del]');
    if (del) remove(del.dataset.del);
  });
  $('detailFoot').addEventListener('click', e => {
    const act = e.target.closest('[data-act]');
    if (act) decide(act.dataset.id, act.dataset.act, act);
  });

  // CSV export (respects the current filters)
  $('exportBtn').addEventListener('click', () => {
    const rows = getView();
    if (!rows.length) { UI.toast('Nothing to export.', 'warning'); return; }
    const cell = v => '"' + String(v).replace(/"/g, '""') + '"';
    const csv = [['ID', 'Name', 'Matric', 'Faculty', 'CGPA', 'Scholarship', 'Status', 'Date'].join(',')]
      .concat(rows.map(a => [a.id, a.name, a.matric, a.faculty, a.cgpa, schName(a.scholarshipId), a.status, a.date].map(cell).join(','))).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'applicants.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    UI.toast('Exported ' + rows.length + ' rows.');
  });

  /* ---------- Add application modal ---------- */
  const form = $('addForm');
  $('fScholarship').innerHTML += SCHOLARSHIPS.map(s =>
    `<option value="${s.id}">${UI.esc(s.name)}</option>`).join('');

  function updateHint() {
    const s = sch($('fScholarship').value);
    $('fHint').textContent = s ? `${s.name}: minimum CGPA ${s.minCgpa.toFixed(2)}, award ${UI.money(s.amount)}.` : '';
  }
  $('fScholarship').addEventListener('change', updateHint);

  $('addModal').addEventListener('hidden.bs.modal', () => {
    form.reset(); form.classList.remove('was-validated'); $('formError').classList.add('d-none'); updateHint();
  });
  $('addModal').addEventListener('shown.bs.modal', () => $('fName').focus());

  form.addEventListener('submit', async e => {
    e.preventDefault();
    form.classList.add('was-validated');
    $('formError').classList.add('d-none');
    if (!form.checkValidity()) return;

    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const created = await Api.addApplication({
        name: $('fName').value, matric: $('fMatric').value, cgpa: $('fCgpa').value,
        faculty: $('fFaculty').value, scholarshipId: $('fScholarship').value
      });
      state.all.push(created);
      state.page = 1; state.sortKey = 'date'; state.sortDir = 'desc';
      bootstrap.Modal.getInstance($('addModal')).hide();
      UI.toast('Application submitted for ' + created.name + '.');
      render();
    } catch (err) {
      $('formError').textContent = err.message;
      $('formError').classList.remove('d-none');
    } finally {
      submit.disabled = false;
    }
  });

  /* ---------- Init ---------- */
  (async function init() {
    showLoading();
    try {
      state.all = await Api.getApplications();
      const faculties = [...new Set(state.all.map(a => a.faculty))].sort();
      $('facultyFilter').innerHTML += faculties.map(f => `<option>${UI.esc(f)}</option>`).join('');

      // Deep links: ?status=Pending (from the dashboard chart) and ?apply=SCH01 (from the scholarships page)
      const params = new URLSearchParams(window.location.search);
      const st = params.get('status');
      if (['Pending', 'Approved', 'Rejected'].includes(st)) { state.status = st; $('statusFilter').value = st; }
      render();

      const apply = params.get('apply');
      if (apply && sch(apply)) {
        $('fScholarship').value = apply; updateHint();
        bootstrap.Modal.getOrCreateInstance($('addModal')).show();
      }
    } catch (err) {
      $('appBody').innerHTML = '';
      UI.showError('Unable to load applicants. ' + err.message);
    }
  })();
})();
