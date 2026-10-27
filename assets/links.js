/* © 2026 CSGHS YuHsuan Hsiao. All rights reserved. 保留所有權利，未經作者書面同意不得重製、改作或散布。詳見 LICENSE。 */
/* Public URL validation. This is not authentication or authorization. */
(function (root) {
  'use strict';
  function parse(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    try {
      const u = new URL(raw.trim());
      if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
      return u;
    } catch (_) { return null; }
  }
  function booking(raw) {
    const u = parse(raw);
    if (!u || u.hostname !== 'script.google.com' || u.search || u.hash) return '';
    // Standard deployments and Workspace-domain scoped deployments are supported.
    if (!/^\/macros\/(?:a\/[A-Za-z0-9.-]+\/)?s\/[A-Za-z0-9_-]{8,}\/exec$/.test(u.pathname)) return '';
    return u.href;
  }
  function form(raw) {
    const u = parse(raw);
    if (!u || u.hash) return '';
    if (u.hostname === 'forms.gle' && /^\/[A-Za-z0-9]+\/?$/.test(u.pathname) && !u.search) return u.href;
    if (u.hostname !== 'docs.google.com' || !/^\/forms\/d\/(?:e\/)?[A-Za-z0-9_-]+\/viewform$/.test(u.pathname)) return '';
    // Allow only presentation parameters; strip prefilled answers / identity fields.
    for (const key of [...u.searchParams.keys()]) if (!['usp', 'hl'].includes(key)) u.searchParams.delete(key);
    return u.href;
  }
  function main(raw) {
    const u = parse(raw);
    return u && !u.search && !u.hash ? u.href : '';
  }
  const api = Object.freeze({ booking, form, main });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.IslandLinks = api;
})(typeof window === 'undefined' ? globalThis : window);
