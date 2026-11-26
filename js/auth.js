/**
 * auth.js - Simulated authentication (hardcoded + localStorage) with three roles.
 * NOT for real security use: a real system must verify credentials on a server.
 */
(function (global) {
  'use strict';
  const { KEYS, Api } = global.SMS;
  const STAFF = ['Administrator', 'Scholarship Officer'];

  const Auth = {
    login(username, password) {
      const user = Api.users.all().find(u => u.username.toLowerCase() === username.trim().toLowerCase());
      if (!user) return { ok: false, message: 'Username not found. Please check and try again.' };
      if (user.password !== password) return { ok: false, message: 'Incorrect password. Please try again.' };
      // Students carry their profile in the session so applications can use it.
      sessionStorage.setItem(KEYS.session, JSON.stringify({
        username: user.username, fullName: user.fullName, role: user.role,
        matric: user.matric, faculty: user.faculty, cgpa: user.cgpa
      }));
      return { ok: true };
    },

    /** Public registration creates STUDENT accounts only. Staff accounts are issued by the office. */
    register({ fullName, username, password, matric, faculty, cgpa }) {
      const users = Api.users.all();
      if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        return { ok: false, message: 'That username is already taken.' };
      }
      if (users.some(u => u.matric && u.matric === matric)) {
        return { ok: false, message: 'A student with this matric number is already registered.' };
      }
      users.push({ username, password, role: 'Student', fullName, matric, faculty, cgpa: Number(cgpa) });
      Api.users.save(users);
      return { ok: true };
    },

    current() {
      try { return JSON.parse(sessionStorage.getItem(KEYS.session)); } catch (e) { return null; }
    },

    isAdmin()   { const u = Auth.current(); return !!u && u.role === 'Administrator'; },
    isStaff()   { const u = Auth.current(); return !!u && STAFF.includes(u.role); },
    isStudent() { const u = Auth.current(); return !!u && u.role === 'Student'; },

    /** The page each role lands on after login. */
    home() { return Auth.isStudent() ? 'scholarships.html' : 'dashboard.html'; },

    logout() {
      sessionStorage.removeItem(KEYS.session);
      window.location.href = 'index.html';
    },

    /**
     * Call at the top of every protected page.
     * guard()          any signed-in user
     * guard('staff')   admin or officer only (students are sent to their own page)
     * guard('student') students only
     */
    guard(area) {
      if (!Auth.current()) { window.location.replace('index.html'); return false; }
      if (area === 'staff' && !Auth.isStaff()) { window.location.replace('scholarships.html'); return false; }
      if (area === 'student' && !Auth.isStudent()) { window.location.replace('dashboard.html'); return false; }
      return true;
    }
  };

  global.Auth = Auth;
})(window);
