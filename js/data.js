/**
 * data.js - Data layer: seed data, cache, permissions, activity log and a mock REST-style API.
 *
 * Architecture:  page JS -> Api (async, simulated latency) -> Cache (memory -> localStorage) -> seed data
 * To move to a real backend, replace the bodies of the Api functions with fetch() calls.
 *
 * Roles:  Administrator (everything) | Scholarship Officer (view + enter applications)
 *         Student (apply for themselves and see only their own applications)
 */
(function (global) {
  'use strict';

  /* ---------- Storage keys (v2 = this version's data shape) ---------- */
  const KEYS = {
    apps: 'sms_applications_v2',
    users: 'sms_users_v2',
    session: 'sms_session_v1',
    log: 'sms_activity_v1'
  };

  /* ---------- Seed data ---------- */
  const SCHOLARSHIPS = [
    { id: 'SCH01', name: "Dean's Merit Award",      category: 'Merit',          amount: 5000, quota: 6, minCgpa: 3.7, deadline: '2026-12-15', description: 'Awarded to students with outstanding academic achievement.' },
    { id: 'SCH02', name: 'B40 Financial Aid',       category: 'Need-based',     amount: 3500, quota: 8, minCgpa: 2.8, deadline: '2026-12-20', description: 'Supports students from low-income households.' },
    { id: 'SCH03', name: 'STEM Future Leaders',     category: 'Field-specific', amount: 6000, quota: 4, minCgpa: 3.5, deadline: '2027-01-10', description: 'For high-performing students in science and technology programmes.' },
    { id: 'SCH04', name: 'Sports Excellence Grant', category: 'Talent',         amount: 2500, quota: 3, minCgpa: 2.5, deadline: '2027-01-15', description: 'Recognises national and state-level athletes.' },
    { id: 'SCH05', name: 'Community Leadership',    category: 'Talent',         amount: 3000, quota: 4, minCgpa: 3.0, deadline: '2027-02-01', description: 'For students with proven leadership and volunteer records.' },
    { id: 'SCH06', name: 'Research Starter Fund',   category: 'Field-specific', amount: 4500, quota: 3, minCgpa: 3.6, deadline: '2027-02-15', description: 'Seed funding for undergraduate research projects.' }
  ];

  // [name, matric, faculty, cgpa, scholarshipId, status, date]
  const SEED_APPS = [
    ['Aiman Hakim', '2023456781', 'FSKM', 3.92, 'SCH01', 'Approved', '2026-03-04'],
    ['Nur Aisyah', '2023456782', 'FSKM', 3.85, 'SCH03', 'Approved', '2026-03-09'],
    ['Muhammad Irfan', '2022345123', 'FKE', 3.61, 'SCH03', 'Pending', '2026-04-12'],
    ['Siti Hajar', '2022345124', 'FKA', 2.95, 'SCH02', 'Approved', '2026-04-15'],
    ['Farid Danial', '2023456790', 'FPP', 3.10, 'SCH05', 'Pending', '2026-05-02'],
    ['Nurul Izzati', '2021234567', 'FSG', 3.74, 'SCH01', 'Approved', '2026-05-10'],
    ['Haziq Zulkifli', '2024567801', 'FSKM', 2.65, 'SCH04', 'Approved', '2026-05-21'],
    ['Aina Sofea', '2024567802', 'FPN', 3.28, 'SCH05', 'Rejected', '2026-06-03'],
    ['Daniel Lee', '2022345130', 'FKE', 3.55, 'SCH06', 'Pending', '2026-06-18'],
    ['Putri Balqis', '2023456795', 'FKA', 2.88, 'SCH02', 'Approved', '2026-06-25'],
    ['Syafiq Rahman', '2023456796', 'FSKM', 3.40, 'SCH03', 'Rejected', '2026-07-02'],
    ['Wan Nabila', '2021234570', 'FPP', 3.82, 'SCH01', 'Approved', '2026-07-11'],
    ['Khairul Anuar', '2024567810', 'FSG', 2.71, 'SCH02', 'Pending', '2026-07-19'],
    ['Alya Natasha', '2022345140', 'FSKM', 3.66, 'SCH06', 'Approved', '2026-08-04'],
    ['Zulhilmi Yusof', '2022345141', 'FKE', 2.55, 'SCH04', 'Pending', '2026-08-13'],
    ['Maryam Jamilah', '2023456800', 'FPN', 3.15, 'SCH05', 'Approved', '2026-08-22'],
    ['Adli Mustaqim', '2023456801', 'FKA', 2.92, 'SCH02', 'Approved', '2026-09-01'],
    ['Nadia Farhana', '2021234580', 'FSKM', 3.95, 'SCH01', 'Approved', '2026-09-09'],
    ['Imran Shah', '2024567820', 'FPP', 2.81, 'SCH02', 'Rejected', '2026-09-17'],
    ['Lim Wei Jie', '2022345150', 'FKE', 3.58, 'SCH03', 'Pending', '2026-09-28'],
    ['Sarah Amani', '2023456810', 'FSG', 3.72, 'SCH01', 'Pending', '2026-10-05'],
    ['Hafiz Kamal', '2024567830', 'FSKM', 3.05, 'SCH05', 'Pending', '2026-10-14'],
    ['Dina Marissa', '2022345160', 'FPN', 3.62, 'SCH06', 'Approved', '2026-10-24'],
    ['Zafran Idris', '2023456820', 'FKA', 2.60, 'SCH04', 'Pending', '2026-11-03']
  ].map((r, i) => ({
    id: 'APP' + String(i + 1).padStart(3, '0'),
    name: r[0], matric: r[1], faculty: r[2], cgpa: r[3],
    scholarshipId: r[4], status: r[5], date: r[6]
  }));

  const SEED_LOG = [
    { id: 'LOG0004', ts: '2026-11-03T14:05:00', user: 'Scholarship Officer',  type: 'add',     text: 'Submitted application for Zafran Idris' },
    { id: 'LOG0003', ts: '2026-10-24T10:40:00', user: 'System Administrator', type: 'approve', text: 'Approved Dina Marissa for Research Starter Fund' },
    { id: 'LOG0002', ts: '2026-09-17T16:20:00', user: 'System Administrator', type: 'reject',  text: 'Rejected Imran Shah for B40 Financial Aid' },
    { id: 'LOG0001', ts: '2026-09-09T09:15:00', user: 'System Administrator', type: 'approve', text: "Approved Nadia Farhana for Dean's Merit Award" }
  ];

  const DEFAULT_USERS = [
    { username: 'admin',   password: 'admin123',   role: 'Administrator',       fullName: 'System Administrator' },
    { username: 'officer', password: 'officer123', role: 'Scholarship Officer', fullName: 'Scholarship Officer' },
    { username: 'student', password: 'student123', role: 'Student',             fullName: 'Aisha Rahman', matric: '2023456999', faculty: 'FSKM', cgpa: 3.60 }
  ];

  /* ---------- Cache layer (memory -> localStorage) ---------- */
  const memory = {};

  function safeParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }

  const Cache = {
    read(key, seed) {
      if (memory[key]) return memory[key];                        // 1) memory hit
      let data = safeParse(localStorage.getItem(key), null);       // 2) persistent hit
      if (!data) {                                                 // 3) seed on first run
        data = seed;
        try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* storage full/blocked */ }
      }
      memory[key] = data;
      return data;
    },
    write(key, data) {
      memory[key] = data;                                          // keep memory in sync
      try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* ignore */ }
    },
    clear() { Object.keys(memory).forEach(k => delete memory[k]); }
  };

  /* ---------- Helpers ---------- */
  const delay = (ms = 450) => new Promise(r => setTimeout(r, ms));
  const clone = obj => JSON.parse(JSON.stringify(obj));

  function actor() {
    try {
      return JSON.parse(sessionStorage.getItem(KEYS.session)) || { fullName: 'System', role: 'System' };
    } catch (e) { return { fullName: 'System', role: 'System' }; }
  }

  /** Permission checks. The UI also hides buttons, but the API is what really enforces the rules. */
  const STAFF = ['Administrator', 'Scholarship Officer'];
  function requireStaff() {
    if (!STAFF.includes(actor().role)) throw new Error('This action is for scholarship staff only.');
  }
  function requireAdmin() {
    if (actor().role !== 'Administrator') throw new Error('Only administrators can do this.');
  }
  function requireStudent() {
    if (actor().role !== 'Student') throw new Error('This action is for students only.');
  }

  function log(type, text) {
    const list = Cache.read(KEYS.log, SEED_LOG);
    const entry = { id: 'LOG' + Date.now(), ts: new Date().toISOString(), user: actor().fullName, type, text };
    Cache.write(KEYS.log, [entry].concat(list).slice(0, 50));
  }

  /** Live state of one scholarship: quota used, remaining, deadline. */
  function scholarshipState(s, apps) {
    const list = apps.filter(a => a.scholarshipId === s.id);
    const used = list.filter(a => a.status === 'Approved').length;
    const daysLeft = Math.ceil((new Date(s.deadline + 'T23:59:59') - new Date()) / 86400000);
    return {
      applied: list.length,
      used,
      remaining: Math.max(0, s.quota - used),
      full: used >= s.quota,
      daysLeft,
      closed: daysLeft < 0
    };
  }

  /** Shared validation + record creation used by staff entry AND student self-service. */
  function buildApplication(apps, data) {
    const sch = SCHOLARSHIPS.find(s => s.id === data.scholarshipId);
    if (!sch) throw new Error('Selected scholarship does not exist.');
    if (scholarshipState(sch, apps).closed) throw new Error('Applications for "' + sch.name + '" are closed.');
    if (apps.some(a => a.matric === data.matric && a.scholarshipId === data.scholarshipId)) {
      throw new Error('This student has already applied for this scholarship.');
    }
    if (Number(data.cgpa) < sch.minCgpa) {
      throw new Error('CGPA is below the minimum (' + sch.minCgpa.toFixed(2) + ') for this scholarship.');
    }
    const nextNum = apps.reduce((m, a) => Math.max(m, parseInt(a.id.slice(3), 10)), 0) + 1;
    return {
      id: 'APP' + String(nextNum).padStart(3, '0'),
      name: data.name.trim(), matric: data.matric, faculty: data.faculty,
      cgpa: Number(data.cgpa), scholarshipId: data.scholarshipId,
      status: 'Pending', date: new Date().toISOString().slice(0, 10)
    };
  }

  /* ---------- Mock API ---------- */
  const Api = {
    /** Public: scholarships with live quota / deadline figures (no personal data). */
    async getScholarshipSummaries() {
      await delay();
      const apps = Cache.read(KEYS.apps, SEED_APPS);
      return SCHOLARSHIPS.map(s => Object.assign(clone(s), scholarshipState(s, apps)));
    },

    /* ----- Staff ----- */
    async getApplications() {
      await delay();
      requireStaff();
      return clone(Cache.read(KEYS.apps, SEED_APPS));
    },

    async addApplication(data) {
      await delay(300);
      requireStaff();
      const apps = Cache.read(KEYS.apps, SEED_APPS);
      const record = buildApplication(apps, data);
      Cache.write(KEYS.apps, apps.concat([record]));
      log('add', 'Submitted application for ' + record.name);
      return clone(record);
    },

    async updateStatus(id, status) {
      await delay(250);
      requireAdmin();
      const apps = clone(Cache.read(KEYS.apps, SEED_APPS));
      const app = apps.find(a => a.id === id);
      if (!app) throw new Error('Application not found.');
      const sch = SCHOLARSHIPS.find(s => s.id === app.scholarshipId);
      if (status === 'Approved') {
        const used = apps.filter(a => a.scholarshipId === sch.id && a.status === 'Approved' && a.id !== id).length;
        if (used >= sch.quota) throw new Error('Quota full for "' + sch.name + '" (' + sch.quota + ' awards).');
      }
      app.status = status;
      Cache.write(KEYS.apps, apps);
      const verb = { Approved: 'Approved', Rejected: 'Rejected', Pending: 'Reset to pending' }[status];
      const type = { Approved: 'approve', Rejected: 'reject', Pending: 'reset' }[status];
      log(type, verb + ' ' + app.name + ' for ' + sch.name);
      return clone(app);
    },

    async deleteApplication(id) {
      await delay(250);
      requireAdmin();
      const apps = Cache.read(KEYS.apps, SEED_APPS);
      const app = apps.find(a => a.id === id);
      if (!app) throw new Error('Application not found.');
      Cache.write(KEYS.apps, apps.filter(a => a.id !== id));
      log('delete', 'Deleted application of ' + app.name);
      return true;
    },

    async getActivity(limit = 6) {
      await delay(200);
      requireStaff();
      return clone(Cache.read(KEYS.log, SEED_LOG).slice(0, limit));
    },

    /** Aggregated figures for the dashboard (computed from cached data). */
    async getStats() {
      await delay();
      requireStaff();
      const apps = Cache.read(KEYS.apps, SEED_APPS);
      const byId = Object.fromEntries(SCHOLARSHIPS.map(s => [s.id, s]));
      const approved = apps.filter(a => a.status === 'Approved');
      const rejected = apps.filter(a => a.status === 'Rejected');

      const perScholarship = SCHOLARSHIPS.map(s => {
        const st = scholarshipState(s, apps);
        return { id: s.id, name: s.name, count: st.applied, used: st.used, quota: s.quota, amount: st.used * s.amount };
      });

      const facultyMap = {};
      apps.forEach(a => { facultyMap[a.faculty] = (facultyMap[a.faculty] || 0) + 1; });
      const byFaculty = Object.keys(facultyMap).map(f => ({ faculty: f, count: facultyMap[f] }))
        .sort((a, b) => b.count - a.count);

      const monthMap = {};
      apps.forEach(a => { const k = a.date.slice(0, 7); monthMap[k] = (monthMap[k] || 0) + 1; });
      const monthKeys = Object.keys(monthMap).sort();
      const monthly = {
        labels: monthKeys.map(k => new Date(k + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })),
        values: monthKeys.map(k => monthMap[k])
      };

      const decided = approved.length + rejected.length;
      return {
        total: apps.length,
        approved: approved.length,
        pending: apps.filter(a => a.status === 'Pending').length,
        rejected: rejected.length,
        approvalRate: decided ? Math.round((approved.length / decided) * 100) : 0,
        totalAwarded: approved.reduce((sum, a) => sum + byId[a.scholarshipId].amount, 0),
        perScholarship, byFaculty, monthly,
        recent: clone([...apps].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5))
      };
    },

    /** Admin only: wipe applications + activity back to the sample data. */
    async resetDemo() {
      await delay(200);
      requireAdmin();
      try {
        localStorage.removeItem(KEYS.apps);
        localStorage.removeItem(KEYS.log);
      } catch (e) { /* ignore */ }
      Cache.clear();
      return true;
    },

    /* ----- Student self-service ----- */
    /** A student sees ONLY their own applications (matched by matric number). */
    async getMyApplications() {
      await delay();
      requireStudent();
      const me = actor();
      return clone(Cache.read(KEYS.apps, SEED_APPS).filter(a => a.matric === me.matric));
    },

    /** A student applies for themselves; name, matric, faculty and CGPA come from their profile. */
    async applyAsStudent(scholarshipId) {
      await delay(300);
      requireStudent();
      const me = actor();
      const apps = Cache.read(KEYS.apps, SEED_APPS);
      const sch = SCHOLARSHIPS.find(s => s.id === scholarshipId);
      if (!sch) throw new Error('Selected scholarship does not exist.');
      if (scholarshipState(sch, apps).full) throw new Error('The quota for "' + sch.name + '" is full.');
      const record = buildApplication(apps, {
        name: me.fullName, matric: me.matric, faculty: me.faculty, cgpa: me.cgpa, scholarshipId
      });
      Cache.write(KEYS.apps, apps.concat([record]));
      log('add', me.fullName + ' applied for ' + sch.name);
      return clone(record);
    },

    /** A student can withdraw their own application while it is still Pending. */
    async withdrawMyApplication(id) {
      await delay(250);
      requireStudent();
      const me = actor();
      const apps = Cache.read(KEYS.apps, SEED_APPS);
      const app = apps.find(a => a.id === id && a.matric === me.matric);
      if (!app) throw new Error('Application not found.');
      if (app.status !== 'Pending') throw new Error('Only pending applications can be withdrawn.');
      Cache.write(KEYS.apps, apps.filter(a => a.id !== id));
      const sch = SCHOLARSHIPS.find(s => s.id === app.scholarshipId);
      log('delete', me.fullName + ' withdrew the application for ' + (sch ? sch.name : app.scholarshipId));
      return true;
    },

    /** Used by auth.js */
    users: {
      all() { return Cache.read(KEYS.users, DEFAULT_USERS); },
      save(list) { Cache.write(KEYS.users, list); }
    }
  };

  global.SMS = { KEYS, Api, Cache, SCHOLARSHIPS, scholarshipState };
})(window);
