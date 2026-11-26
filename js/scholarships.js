/** scholarships.js - Scholarship card grid + eligibility checker. Students can apply directly from here. */
(function () {
  'use strict';
  if (!Auth.guard()) return;                       // any signed-in role may browse scholarships
  UI.renderShell('scholarships');

  const { Api } = SMS;
  const $ = id => document.getElementById(id);
  const me = Auth.current();
  const isStudent = Auth.isStudent();
  let schs = [], mine = [];
  let myCgpa = null;                               // set by the eligibility checker

  const appliedIds = () => new Set(mine.map(a => a.scholarshipId));

  /** Is this scholarship open to a student with this CGPA? (schs already carry live quota figures) */
  function evaluate(s, cgpa) {
    if (cgpa < s.minCgpa) return { ok: false, reason: 'Needs CGPA ' + s.minCgpa.toFixed(2) + '+' };
    if (s.closed) return { ok: false, reason: 'Applications closed' };
    if (s.full) return { ok: false, reason: 'Quota full' };
    return { ok: true, reason: 'You qualify' };
  }

  /** The button at the bottom of each card depends on who is looking. */
  function actionButton(s, ev) {
    const canApply = !s.closed && !s.full;

    if (!isStudent) {                              // staff enter applications on the Applicants page
      return canApply
        ? `<a class="btn btn-primary btn-sm" href="applicants.html?apply=${s.id}"><i class="bi bi-pencil-square me-1" aria-hidden="true"></i>Enter application</a>`
        : `<button class="btn btn-outline-secondary btn-sm" type="button" disabled>${s.closed ? 'Applications closed' : 'Quota full'}</button>`;
    }

    if (appliedIds().has(s.id)) {
      return `<a class="btn btn-outline-success btn-sm" href="my-applications.html"><i class="bi bi-check2-circle me-1" aria-hidden="true"></i>Applied - view status</a>`;
    }
    if (s.closed) return '<button class="btn btn-outline-secondary btn-sm" type="button" disabled>Applications closed</button>';
    if (s.full)   return '<button class="btn btn-outline-secondary btn-sm" type="button" disabled>Quota full</button>';
    if (me.cgpa < s.minCgpa) return `<button class="btn btn-outline-secondary btn-sm" type="button" disabled>Your CGPA is below ${s.minCgpa.toFixed(2)}</button>`;
    return `<button class="btn btn-primary btn-sm" type="button" data-apply="${s.id}"><i class="bi bi-send me-1" aria-hidden="true"></i>Apply now</button>`;
  }

  /* ---------- Cards ---------- */
  function render() {
    const q = $('searchInput').value.trim().toLowerCase();
    const cat = $('categoryFilter').value;
    const openOnly = $('openOnly').checked;

    const list = schs.filter(s =>
      (!q || s.name.toLowerCase().includes(q)) && (!cat || s.category === cat) &&
      (!openOnly || (!s.closed && !s.full)));

    if (!list.length) {
      $('grid').innerHTML = `<div class="col-12"><div class="card"><div class="card-body">${UI.emptyState('bi-search', 'No scholarships found', 'Try a different search, category or turn off "Open only".')}</div></div></div>`;
      return;
    }

    $('grid').innerHTML = list.map(s => {
      const pct = Math.min(100, Math.round((s.used / s.quota) * 100));
      const deadlineText = s.closed ? 'Closed' : s.daysLeft === 0 ? 'Closes today' : s.daysLeft + ' days left';
      const deadlineCls = s.closed ? 'secondary' : s.daysLeft <= 30 ? 'warning' : 'light border';
      const ev = myCgpa === null ? null : evaluate(s, myCgpa);

      const match = ev
        ? `<span class="badge ${ev.ok ? 'text-bg-success' : 'text-bg-secondary'}"><i class="bi ${ev.ok ? 'bi-check-circle' : 'bi-dash-circle'} me-1" aria-hidden="true"></i>${UI.esc(ev.reason)}</span>`
        : '';

      return `
      <div class="col-md-6 col-xl-4">
        <article class="card sch-card shadow-sm h-100 ${ev && ev.ok ? 'sch-match' : ''}" aria-labelledby="t-${s.id}">
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2 gap-2 flex-wrap">
              <span class="badge rounded-pill category-pill">${UI.esc(s.category)}</span>
              <span class="badge text-bg-${deadlineCls}">${deadlineText}</span>
            </div>
            <h2 class="h5" id="t-${s.id}">${UI.esc(s.name)}</h2>
            <p class="text-body-secondary small flex-grow-1">${UI.esc(s.description)}</p>
            ${match ? `<div class="mb-2">${match}</div>` : ''}
            <dl class="row small mb-3">
              <dt class="col-6 fw-normal text-body-secondary">Award</dt><dd class="col-6 fw-semibold mb-1">${UI.money(s.amount)}</dd>
              <dt class="col-6 fw-normal text-body-secondary">Min CGPA</dt><dd class="col-6 mb-1">${s.minCgpa.toFixed(2)}</dd>
              <dt class="col-6 fw-normal text-body-secondary">Deadline</dt><dd class="col-6 mb-1">${UI.formatDate(s.deadline)}</dd>
              <dt class="col-6 fw-normal text-body-secondary">Applicants</dt><dd class="col-6 mb-0">${s.applied}</dd>
            </dl>
            <div class="d-flex align-items-center gap-3 mb-3">${UI.orbit(pct, s.full)}<div class="small"><div class="fw-semibold">Quota used</div><div class="text-body-secondary">${s.used} of ${s.quota} awards${s.full ? ' (full)' : ''}</div></div></div>
            ${actionButton(s, ev)}
          </div>
        </article>
      </div>`;
    }).join('');
  }

  /* ---------- Eligibility checker ---------- */
  function runChecker(e) {
    if (e) e.preventDefault();
    const input = $('checkCgpa');
    const out = $('checkResult');
    const v = parseFloat(input.value);

    if (isNaN(v) || v < 0 || v > 4) {
      input.classList.add('is-invalid');
      myCgpa = null; out.innerHTML = ''; render();
      return;
    }
    input.classList.remove('is-invalid');
    myCgpa = v;

    const ok = schs.map(s => ({ s, ev: evaluate(s, v) })).filter(x => x.ev.ok).sort((a, b) => b.s.amount - a.s.amount);
    const who = isStudent ? 'Your CGPA of ' + v.toFixed(2) : 'With a CGPA of ' + v.toFixed(2);
    if (ok.length) {
      out.innerHTML = `<div class="alert alert-success mb-0" role="status">
        <strong>${who} qualifies you for ${ok.length} of ${schs.length} scholarships.</strong>
        Highest award: ${UI.esc(ok[0].s.name)} (${UI.money(ok[0].s.amount)}).</div>`;
    } else {
      const lowest = Math.min.apply(null, schs.map(s => s.minCgpa));
      out.innerHTML = `<div class="alert alert-warning mb-0" role="status">
        No open scholarship matches ${who.toLowerCase()}. The lowest requirement is ${lowest.toFixed(2)}.</div>`;
    }
    render();
  }

  /* ---------- Student: apply from the card ---------- */
  $('grid').addEventListener('click', async e => {
    const btn = e.target.closest('[data-apply]');
    if (!btn) return;
    const s = schs.find(x => x.id === btn.dataset.apply);
    if (!s) return;

    const ok = await UI.confirm({
      title: 'Apply for ' + s.name + '?',
      body: 'We will send your name, matric number (' + me.matric + '), faculty (' + me.faculty + ') and CGPA (' + Number(me.cgpa).toFixed(2) + ') with this application.',
      okText: 'Submit application', okClass: 'btn-primary'
    });
    if (!ok) return;

    btn.disabled = true;
    try {
      const rec = await Api.applyAsStudent(s.id);
      mine.push(rec);
      s.applied += 1;                              // keep the card's counter in step without reloading
      UI.toast('Application submitted for ' + s.name + '. Track it under My Applications.');
    } catch (err) {
      UI.toast(err.message, 'danger');
    }
    render();
  });

  /* ---------- Init ---------- */
  (async function init() {
    $('grid').innerHTML = Array.from({ length: 3 }, () =>
      `<div class="col-md-6 col-xl-4"><div class="card skeleton" style="height:340px"></div></div>`).join('');
    try {
      [schs, mine] = await Promise.all([Api.getScholarshipSummaries(), isStudent ? Api.getMyApplications() : Promise.resolve([])]);
      $('categoryFilter').innerHTML += [...new Set(schs.map(s => s.category))].map(c => `<option>${UI.esc(c)}</option>`).join('');
      $('searchInput').addEventListener('input', render);
      $('categoryFilter').addEventListener('change', render);
      $('openOnly').addEventListener('change', render);
      $('checkForm').addEventListener('submit', runChecker);

      if (isStudent) {                             // students are checked against their own profile CGPA
        $('checkCgpa').value = Number(me.cgpa).toFixed(2);
        $('checkCgpa').readOnly = true;
        runChecker();
      } else {
        render();
      }
    } catch (err) {
      $('grid').innerHTML = '';
      UI.showError('Unable to load scholarships. ' + err.message);
    }
  })();
})();
