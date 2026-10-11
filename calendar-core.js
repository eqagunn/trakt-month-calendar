/* Shared date/DOM adapter. No API calls, credentials or persistent data. */
(function (root) {
  'use strict';
  const dayMs = 86400000;
  const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function parseDay(value) {
    const m = /^(?:day-)?(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value || '');
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3], 12);
    return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
  }
  const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n, 12);
  const monthStart = date => new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const monthEnd = date => new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
  const shiftMonth = (date, n) => new Date(date.getFullYear(), date.getMonth() + n, 1, 12);
  function monthCells(date, monday = true) {
    const first = monthStart(date);
    const offset = (first.getDay() + (monday ? 6 : 0)) % 7;
    const count = Math.ceil((offset + monthEnd(date).getDate()) / 7) * 7;
    return Array.from({ length: count }, (_, i) => addDays(first, i - offset));
  }
  function toolbarDates(source, reference = new Date(), locale = 'en') {
    const normalize = s => s.toLocaleLowerCase(locale).replace(/[.\s\u200e\u200f]/g, '');
    const names = new Map();
    for (let month = 0; month < 12; month++) {
      for (const width of ['short', 'long']) {
        const d = new Date(2026, month, 15);
        names.set(normalize(new Intl.DateTimeFormat(locale, { month: width }).format(d)), month);
        const part = new Intl.DateTimeFormat(locale, { month: width, day: 'numeric' }).formatToParts(d).find(p => p.type === 'month');
        if (part) names.set(normalize(part.value), month);
      }
    }
    const digits = new Map(Array.from({length:10}, (_, i) => [new Intl.NumberFormat(locale, {useGrouping:false}).format(i), String(i)]));
    return Array.from(source.querySelectorAll('.trakt-calendar-day-button')).map(button => {
      const spans = button.querySelectorAll(':scope > span');
      if (spans.length < 2) return null;
      const month = names.get(normalize(spans[0].textContent));
      const day = Number(Array.from(spans[1].textContent.trim()).map(c => digits.get(c) ?? c).join(''));
      if (month === undefined || !day) return null;
      const candidates = [-1, 0, 1].map(offset => new Date(reference.getFullYear() + offset, month, day, 12));
      return candidates.sort((a, b) => Math.abs(a - reference) - Math.abs(b - reference))[0];
    }).filter(Boolean);
  }
  function safeLink(href, origin) {
    try {
      const u = new URL(href, origin);
      if (u.origin !== origin || !/^\/(?:shows|movies)\//.test(u.pathname)) return null;
      return u.href;
    } catch { return null; }
  }
  function mediaHref(href, origin) {
    const safe = safeLink(href,origin);
    if (!safe) return null;
    const url = new URL(safe);
    return url.origin + url.pathname.split('/').slice(0,3).join('/');
  }
  function readEntries(source, origin) {
    const entries = new Map();
    for (const anchor of source.querySelectorAll('.calendar-day-anchor[id]')) {
      const date = parseDay(anchor.dataset?.tmcDate || anchor.id);
      if (!date) continue;
      const list = new Map();
      for (const card of anchor.querySelectorAll('trakt-calendar-item')) {
        const links = Array.from(card.querySelectorAll('a[href]'));
        const link = links.find(a=>{const href=safeLink(a.getAttribute('href'),origin);if(!href)return false;const url=new URL(href);return /\/seasons\/\d+\/episodes\/\d+/.test(url.pathname) || url.searchParams.get('view')==='episode'}) || links.find(a => safeLink(a.getAttribute('href'), origin));
        if (!link) continue;
        const href = safeLink(link.getAttribute('href'), origin);
        const subtitle = card.querySelector('.trakt-card-subtitle')?.textContent.trim() || '';
        const dedupe = href + '|' + subtitle;
        list.set(dedupe, {href,subtitle,mediaHref:mediaHref(href,origin),type:new URL(href).pathname.startsWith('/movies/')?'movie':'show'});
      }
      // Duplicate IDs can occur in nested GridList markup; merge rather than overwrite.
      const k = key(date);
      const merged = new Map((entries.get(k) || []).map(item => [item.href + '|' + item.subtitle, item]));
      for (const [id, item] of list) merged.set(id, item);
      entries.set(k, Array.from(merged.values()));
    }
    return entries;
  }
  function coverage(source, firstWeek) {
    const periods = source.querySelectorAll('.trakt-calendar-items').length;
    return firstWeek && periods ? { start: firstWeek, end: addDays(firstWeek, periods * 7 - 1), periods } : null;
  }
  root.TraktMonthCore = { key, parseDay, addDays, monthStart, monthEnd, shiftMonth, monthCells, toolbarDates, safeLink, mediaHref, readEntries, coverage, dayMs };
  if (typeof module !== 'undefined') module.exports = root.TraktMonthCore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
