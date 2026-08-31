/* v2: missionId is an id (not a positional index); anoms are [id, code]
   pairs instead of a positional array. v1 saves are orphaned on purpose
   (one-time, user-approved) — see Phase 1 spec §5. */
const KEY = 'farside.anaximenes.v3';

export const Save = {
  read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch { return null; }
  },
  write(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch { return false; }
  },
  clear() { try { localStorage.removeItem(KEY); } catch { /* private mode */ } },
  settings() {
    try { return JSON.parse(localStorage.getItem(KEY + '.set') || 'null') || {}; }
    catch { return {}; }
  },
  saveSettings(s) {
    try { localStorage.setItem(KEY + '.set', JSON.stringify(s)); } catch { /* ignore */ }
  }
};
