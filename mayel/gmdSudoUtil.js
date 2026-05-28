// gmdSudoUtil.js — Pure-JS storage (NO better-sqlite3, no native compilation)
// Drop-in replacement: same function signatures as the SQLite version.
// Stores everything in a single JSON file: mayel/prince-data.json

const path = require("path");
const fs   = require("fs");

const dataPath = path.join(__dirname, "prince-data.json");

let store = {
  sudo_users:     [],
  bot_settings:   {},
  group_settings: {},
  user_notes:     [],
  temp_emails:    {},
  user_warnings:  [],
  _noteIdCounter: 0,
};

function loadStore() {
  try {
    if (fs.existsSync(dataPath)) {
      const raw    = fs.readFileSync(dataPath, "utf8");
      const parsed = JSON.parse(raw);
      store = { ...store, ...parsed };
    }
  } catch (e) {
    console.error("[STORE][LOAD_ERROR]:", e.message);
  }
}

let saveTimer = null;
function saveStore() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(dataPath, JSON.stringify(store, null, 2)); }
    catch (e) { console.error("[STORE][SAVE_ERROR]:", e.message); }
  }, 200);
}

function saveNow() {
  try { fs.writeFileSync(dataPath, JSON.stringify(store, null, 2)); }
  catch (e) { console.error("[STORE][SAVE_ERROR]:", e.message); }
}

loadStore();

// Migrate old sudo.json if present
(function migrateOldData() {
  const oldSudoFile = path.join(__dirname, "sudo.json");
  if (fs.existsSync(oldSudoFile)) {
    try {
      const oldData = JSON.parse(fs.readFileSync(oldSudoFile, "utf8"));
      if (Array.isArray(oldData)) {
        for (const num of oldData) {
          if (!store.sudo_users.includes(num)) store.sudo_users.push(num);
        }
        saveNow();
        console.log(`✅ Migrated ${oldData.length} sudo users from JSON`);
      }
      fs.unlinkSync(oldSudoFile);
    } catch (e) {
      console.error("[MIGRATE_ERROR]:", e.message);
    }
  }
})();

// ─── SUDO ─────────────────────────────────────────────────────────────────────
function getSudoNumbers() { return [...store.sudo_users]; }

function setSudo(number) {
  if (store.sudo_users.includes(number)) return false;
  store.sudo_users.push(number);
  saveStore();
  return true;
}

function delSudo(number) {
  const idx = store.sudo_users.indexOf(number);
  if (idx === -1) return false;
  store.sudo_users.splice(idx, 1);
  saveStore();
  return true;
}

function clearAllSudo() {
  const count = store.sudo_users.length;
  store.sudo_users = [];
  saveStore();
  return count;
}

// ─── BOT SETTINGS ─────────────────────────────────────────────────────────────
function getSetting(key, defaultValue) {
  return store.bot_settings.hasOwnProperty(key) ? store.bot_settings[key] : defaultValue;
}

function setSetting(key, value) {
  store.bot_settings[key] = value;
  saveStore();
  return true;
}

function resetSetting(key) {
  try {
    const config = require("../config");
    const defaultValue = config[key] || null;
    if (defaultValue) {
      store.bot_settings[key] = defaultValue;
    } else {
      delete store.bot_settings[key];
    }
    saveStore();
    return defaultValue;
  } catch (e) {
    console.error("[SETTINGS][RESET_ERROR]:", e.message);
    return null;
  }
}

function resetAllSettings() {
  const count = Object.keys(store.bot_settings).length;
  store.bot_settings = {};
  saveStore();
  return count;
}

// ─── GROUP SETTINGS ───────────────────────────────────────────────────────────
function getGroupSetting(groupJid, key, defaultValue) {
  const g = store.group_settings[groupJid];
  if (g && g.hasOwnProperty(key)) return g[key];
  return defaultValue;
}

function setGroupSetting(groupJid, key, value) {
  if (!store.group_settings[groupJid]) store.group_settings[groupJid] = {};
  store.group_settings[groupJid][key] = value;
  saveStore();
  return true;
}

function deleteGroupSetting(groupJid, key) {
  if (store.group_settings[groupJid]) {
    delete store.group_settings[groupJid][key];
    saveStore();
  }
  return true;
}

function resetAllGroupSettings(groupJid) {
  if (store.group_settings[groupJid]) {
    const count = Object.keys(store.group_settings[groupJid]).length;
    delete store.group_settings[groupJid];
    saveStore();
    return count;
  }
  return 0;
}

function getAllGroupSettings(groupJid) {
  return { ...(store.group_settings[groupJid] || {}) };
}

// ─── NOTES ────────────────────────────────────────────────────────────────────
function addNote(userJid, content) {
  const userNotes  = store.user_notes.filter(n => n.user_jid === userJid);
  const maxNum     = userNotes.reduce((max, n) => Math.max(max, n.note_number), 0);
  const noteNumber = maxNum + 1;
  store._noteIdCounter = (store._noteIdCounter || 0) + 1;
  const note = { id: store._noteIdCounter, user_jid: userJid, note_number: noteNumber, content, created_at: new Date().toISOString() };
  store.user_notes.push(note);
  saveStore();
  return { noteNumber, content, createdAt: new Date(note.created_at) };
}

function getNote(userJid, noteNumber) {
  const row = store.user_notes.find(n => n.user_jid === userJid && n.note_number === Number(noteNumber));
  if (!row) return null;
  return { noteNumber: row.note_number, content: row.content, createdAt: new Date(row.created_at) };
}

function getAllNotes(userJid) {
  return store.user_notes
    .filter(n => n.user_jid === userJid)
    .sort((a, b) => a.note_number - b.note_number)
    .map(r => ({ noteNumber: r.note_number, content: r.content, createdAt: new Date(r.created_at) }));
}

function updateNote(userJid, noteNumber, newContent) {
  const row = store.user_notes.find(n => n.user_jid === userJid && n.note_number === Number(noteNumber));
  if (!row) return null;
  row.content = newContent;
  saveStore();
  return { noteNumber: Number(noteNumber), content: newContent };
}

function deleteNote(userJid, noteNumber) {
  const idx = store.user_notes.findIndex(n => n.user_jid === userJid && n.note_number === Number(noteNumber));
  if (idx === -1) return false;
  store.user_notes.splice(idx, 1);
  saveStore();
  return true;
}

function deleteAllNotes(userJid) {
  const before = store.user_notes.length;
  store.user_notes = store.user_notes.filter(n => n.user_jid !== userJid);
  saveStore();
  return before - store.user_notes.length;
}

function getAllUsersNotes() {
  return store.user_notes
    .slice()
    .sort((a, b) => a.user_jid < b.user_jid ? -1 : a.user_jid > b.user_jid ? 1 : a.note_number - b.note_number)
    .map(r => ({ id: r.id, userJid: r.user_jid, noteNumber: r.note_number, content: r.content, createdAt: new Date(r.created_at) }));
}

function deleteNoteById(noteId) {
  const idx = store.user_notes.findIndex(n => n.id === Number(noteId));
  if (idx === -1) return false;
  store.user_notes.splice(idx, 1);
  saveStore();
  return true;
}

function updateNoteById(noteId, newContent) {
  const row = store.user_notes.find(n => n.id === Number(noteId));
  if (!row) return null;
  row.content = newContent;
  saveStore();
  return { id: Number(noteId), content: newContent };
}

// ─── TEMP EMAIL ───────────────────────────────────────────────────────────────
const TEMPMAIL_EXPIRY_MINUTES = 15;

function setTempEmail(userJid, email) {
  store.temp_emails[userJid] = { email, created_at: Math.floor(Date.now() / 1000) };
  saveStore();
  return true;
}

function getTempEmail(userJid) {
  const row = store.temp_emails[userJid];
  if (!row) return null;
  const now           = Math.floor(Date.now() / 1000);
  const elapsed       = now - row.created_at;
  const expirySeconds = TEMPMAIL_EXPIRY_MINUTES * 60;
  if (elapsed >= expirySeconds) {
    delete store.temp_emails[userJid];
    saveStore();
    return null;
  }
  const remaining = expirySeconds - elapsed;
  return { email: row.email, timeRemaining: `${Math.floor(remaining / 60)}m ${remaining % 60}s`, createdAt: row.created_at };
}

function deleteTempEmail(userJid) {
  delete store.temp_emails[userJid];
  saveStore();
  return true;
}

// ─── WARNINGS ─────────────────────────────────────────────────────────────────
function addWarning(groupJid, userJid, reason, type) {
  let row = store.user_warnings.find(w => w.group_jid === groupJid && w.user_jid === userJid);
  if (row) {
    row.count += 1; row.reason = reason; row.type = type;
    saveStore();
    return row.count;
  }
  store.user_warnings.push({ group_jid: groupJid, user_jid: userJid, reason, type, count: 1 });
  saveStore();
  return 1;
}

function getUserWarnings(groupJid, userJid) {
  const row = store.user_warnings.find(w => w.group_jid === groupJid && w.user_jid === userJid);
  return row ? { count: row.count } : { count: 0 };
}

function resetWarnings(groupJid, userJid) {
  const idx = store.user_warnings.findIndex(w => w.group_jid === groupJid && w.user_jid === userJid);
  if (idx !== -1) { store.user_warnings.splice(idx, 1); saveStore(); }
  return true;
}

// ─── STUB db (backward compat pour les imports existants) ────────────────────
const db = {
  prepare: () => ({ run: () => ({ changes: 0 }), get: () => null, all: () => [] }),
  exec:    () => {},
  pragma:  () => {},
};

module.exports = {
  getSudoNumbers, setSudo, delSudo, clearAllSudo,
  getSetting, setSetting, resetSetting, resetAllSettings,
  getGroupSetting, setGroupSetting, deleteGroupSetting, resetAllGroupSettings, getAllGroupSettings,
  addNote, getNote, getAllNotes, updateNote, deleteNote, deleteAllNotes,
  getAllUsersNotes, deleteNoteById, updateNoteById,
  setTempEmail, getTempEmail, deleteTempEmail,
  addWarning, getUserWarnings, resetWarnings,
  TEMPMAIL_EXPIRY_MINUTES, db,
};
