/** my-applications.js - Student view: only their own applications, with withdraw for Pending ones. */
(function () {
  'use strict';
  if (!Auth.guard('student')) return;
  UI.renderShell('my-applications');

  const { Api, SCHOLARSHIPS } = SMS;
  const $ = id => document.getElementById(id);
  let mine = [];

  const NOTE = {
    Approved: { cls: 'status-ok',   icon: 'bi-trophy',        text: 'Congratulations! Your application was approved.' },
    Rejected: { cls: 'status-bad',  icon: 'bi-x-octagon',     text: 'Unfortunately this application was not successful.' },
    Pending:  { cls: 'status-wait', icon: 'bi-hourglass-split', text: 'Under review. You can withdraw it while it is pending.' }
  };

  function render() {
    if (!mine.length) {
      $('list').innerHTML = `<div class="col-12"><div class="card"><div class="card-body">
        ${UI.emptyState('bi-journal-x', 'No applications yet', 'Apply for a scholarship and it will show up here.')}
        <div class="text-center"><a href="scholarships.html" class="btn btn-primary">Browse scholarships</a></div>
      </div></div></div>`;
      return;
    }
    const sorted = [...mine].sort((a, b) => b.date.localeCompare(a.date));
    $('list').innerHTML = sorted.map(a => {
      const s = SCHOLARSHIPS.find(x => x.id === a.scholarshipId);
      const n = NOTE[a.status] || NOTE.Pending;
      return `
      <div class="col-md-6 col-xl-4">
        <article class="card shadow-sm h-100"><div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <span class="badge rounded-pill category-pill">${UI.esc(s ? s.category : '-')}</span>
            ${UI.badge(a.status)}
          </div>
          <h2 class="h5">${UI.esc(s ? s.name : a.scholarshipId)}</h2>
          <dl class="row small mb-3">
            <dt class="col-6 fw-normal text-body-secondary">Award</dt><dd class="col-6 fw-semibold mb-1">${UI.money(s ? s.amount : 0)}</dd>
            <dt class="col-6 fw-normal text-body-secondary">Applied on</dt><dd class="col-6 mb-1">${UI.formatDate(a.date)}</dd>
            <dt class="col-6 fw-normal text-body-secondary">Reference</dt><dd class="col-6 mb-0">${UI.esc(a.id)}</dd>
          </dl>
          <div class="status-note ${n.cls} mb-3"><i class="bi ${n.icon} me-1" aria-hidden="true"></i>${n.text}</div>
          ${a.status === 'Pending'
            ? `<button class="btn btn-outline-danger btn-sm mt-auto" type="button" data-withdraw="${a.id}"><i class="bi bi-box-arrow-left me-1" aria-hidden="true"></i>Withdraw</button>`
            : ''}
        </div></article>
      </div>`;
    }).join('');
  }

  $('list').addEventListener('click', async e => {
    const btn = e.target.closest('[data-withdraw]');
    if (!btn) return;
    const a = mine.find(x => x.id === btn.dataset.withdraw);
    if (!a) return;
    const s = SCHOLARSHIPS.find(x => x.id === a.scholarshipId);
    const ok = await UI.confirm({
      title: 'Withdraw application?',
      body: 'Your application for ' + (s ? s.name : a.scholarshipId) + ' will be removed. You can apply again later if it is still open.',
      okText: 'Withdraw', okClass: 'btn-danger'
    });
    if (!ok) return;
    btn.disabled = true;
    try {
      await Api.withdrawMyApplication(a.id);
      mine = mine.filter(x => x.id !== a.id);
      UI.toast('Application withdrawn.');
    } catch (err) {
      UI.toast(err.message, 'danger');
    }
    render();
  });

  (async function init() {
    $('list').innerHTML = Array.from({ length: 3 }, () =>
      '<div class="col-md-6 col-xl-4"><div class="card skeleton" style="height:230px"></div></div>').join('');
    try {
      mine = await Api.getMyApplications();
      render();
    } catch (err) {
      $('list').innerHTML = '';
      UI.showError('Unable to load your applications. ' + err.message);
    }
  })();
})();
