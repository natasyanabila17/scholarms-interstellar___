/** theme.js - Light/dark theme. Loaded in <head> so the theme is applied before the page paints. */
(function (global) {
  'use strict';
  const KEY = 'sms_theme_v2';

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function preferred() {
    return stored() || 'dark';
  }
  function apply(mode) {
    document.documentElement.setAttribute('data-bs-theme', mode);
  }

  const Theme = {
    current() { return document.documentElement.getAttribute('data-bs-theme') || 'dark'; },
    set(mode) {
      try { localStorage.setItem(KEY, mode); } catch (e) { /* ignore */ }
      apply(mode);
      global.dispatchEvent(new Event('themechange'));
    },
    toggle() { Theme.set(Theme.current() === 'dark' ? 'light' : 'dark'); }
  };

  apply(preferred());
  try { if (localStorage.getItem('sms_sky_v1') === 'calm') document.documentElement.setAttribute('data-sky', 'calm'); } catch (e) { /* ignore */ }
  global.Theme = Theme;
})(window);
