// @ts-check
// Minimal RFC 4180 CSV reader/writer (quoted fields, embedded commas,
// quotes and newlines, CRLF, UTF-8 BOM). No dependencies.

/**
 * @param {string} text
 * @returns {Record<string,string>[]}
 */
export function parseCsv(text) {
  const s = String(text).replace(/^﻿/, '');
  /** @type {string[][]} */
  const rows = [];
  let row = [], field = '', i = 0, q = false;
  while (i < s.length) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { q = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((x) => x.trim() !== ''));
  if (!nonEmpty.length) return [];
  const head = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => Object.fromEntries(head.map((h, k) => [h, r[k] ?? ''])));
}

/** Neutralise spreadsheet formula injection in exported cells. */
function safeCell(v) {
  const s = String(v ?? '');
  return /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? "'" + s : s;
}

/**
 * @param {string[]} columns
 * @param {Record<string,any>[]} rows
 */
export function toCsv(columns, rows) {
  const q = (v) => '"' + safeCell(v).replace(/"/g, '""') + '"';
  return '﻿' + [columns.map(q).join(','), ...rows.map((r) => columns.map((c) => q(r[c])).join(','))].join('\r\n');
}
