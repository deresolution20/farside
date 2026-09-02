/* Per-region save slots: each region record (src/game/regions.js) carries its
   own saveKey ('farside.anaximenes.v3', 'farside.longshadow.v1', ...). The
   legacy KEY stays as the default slot — a call with no region record still
   lands in farside.anaximenes.v3 — and as the source of the one-time settings
   migration. Settings moved to the global key 'farside.set' (the selected
   region id, settings.region, rides there). */
const KEY = 'farside.anaximenes.v3';
const SET_KEY = 'farside.set';

export const Save = {
  read(r) {
    const key = (r && r.saveKey) || KEY;
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch { return null; }
  },
  write(r, data) {
    // legacy form: write(blob)
    if (data === undefined) { data = r; r = null; }
    const key = (r && r.saveKey) || KEY;
    try { localStorage.setItem(key, JSON.stringify(data)); return true; }
    catch { return false; }
  },
  clear(r) {
    const key = (r && r.saveKey) || KEY;
    try { localStorage.removeItem(key); } catch { /* private mode */ }
  },
  settings() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SET_KEY) || 'null'); } catch { s = null; }
    if (!s) {
      // One-time migration: the pre-regions settings slot was
      // farside.anaximenes.v3.set. Copy it into farside.set once; after that
      // the legacy slot is ignored.
      try {
        const legacy = JSON.parse(localStorage.getItem(KEY + '.set') || 'null');
        if (legacy) { s = legacy; localStorage.setItem(SET_KEY, JSON.stringify(legacy)); }
      } catch { /* ignore */ }
    }
    return s || {};
  },
  saveSettings(s) {
    try { localStorage.setItem(SET_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }
};
