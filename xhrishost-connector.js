/**
 * XHRIS HOST Connector v2.1
 *
 * Nouveautés v2.1 :
 *  - .id              → affiche votre ID XHRIS (à donner pour recevoir des coins)
 *  - .transfert <id> <montant> → demande confirmation (1=oui / 2=non) avec
 *                        nom + email du destinataire avant transfert
 *  - .hostlink (.host-link, .lien) → renvoie le lien du site
 *  - Aliases : .transfer, .id, .my-id, .monid
 *
 * Authentification par JID — chaque utilisateur WhatsApp a sa propre session.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const API_BASE  = process.env.XHRIS_API_URL || 'https://api.xhrishost.site/api';
const SITE_URL  = (process.env.XHRIS_SITE_URL || 'https://xhrishost.site').replace(/\/$/, '');
const DEFAULT_OWNER_NUMBER = '237694600007';

// ── Persistance des sessions sur disque ──────────────────────────────────────
const SESSIONS_FILE = path.join(process.cwd(), 'data', 'xhris-sessions.json');

function loadSessionsFromDisk() {
  try {
    const dir = path.dirname(SESSIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
      const map = new Map();
      for (const [jid, s] of Object.entries(data)) {
        map.set(jid, { ...s, connectedAt: new Date(s.connectedAt) });
      }
      console.log(`[XHRIS HOST] ${map.size} session(s) restaurée(s) depuis le disque`);
      return map;
    }
  } catch (e) {
    console.error('[XHRIS HOST] Erreur load sessions:', e.message);
  }
  return new Map();
}

function persistSessions() {
  try {
    const obj = {};
    for (const [jid, s] of sessions.entries()) obj[jid] = s;
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.error('[XHRIS HOST] Erreur save sessions:', e.message);
  }
}

// Per-JID session store: { [jid]: { apiKey, user, connectedAt } }
const sessions = loadSessionsFromDisk();

// Pending verification: { [jid]: requestId }
const awaitingCode = new Map();

// Pending transfer confirmation: { [jid]: { recipient, amount, ts } }
const awaitingTransferConfirm = new Map();
const CONFIRM_TIMEOUT_MS = 90 * 1000; // 90s pour répondre 1 ou 2

// ─── Fix Self-DM ─────────────────────────────────────────────────────────────
function fixSelfDmJid(remoteJid, msg, sock) {
  if (!remoteJid) return remoteJid
  if (remoteJid.endsWith('@g.us') || remoteJid.endsWith('@newsletter') || remoteJid === 'status@broadcast') return remoteJid
  if (!msg.key.fromMe) return remoteJid
  if (remoteJid.endsWith('@lid') && sock?.user?.id) {
    return sock.user.id.split(':')[0] + '@s.whatsapp.net'
  }
  return remoteJid
}

function getSession(jid) {
  const direct = sessions.get(jid);
  if (direct) return direct;
  // Chercher par numéro brut pour couvrir @lid vs @s.whatsapp.net
  const num = jid.split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
  if (num) {
    for (const [key, session] of sessions.entries()) {
      const keyNum = key.split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
      if (keyNum === num) return session;
    }
  }
  return null;
}

function senderJid(sock, msg) {
  const jid = msg.key.remoteJid || '';
  if (!jid.endsWith('@g.us')) return msg.key.fromMe ? (sock.user?.id || jid) : jid;
  return msg.key.participant || jid;
}

function isPrivileged(sock, msg) {
  if (msg.key.fromMe) return true;
  const jid = senderJid(sock, msg);
  const num = (jid || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
  const owner = (process.env.OWNER_NUMBER || process.env.OWNER || DEFAULT_OWNER_NUMBER).replace(/[^0-9]/g, '');
  if (num && owner && num === owner) return true;
  if (num === DEFAULT_OWNER_NUMBER) return true;
  const botNum = (sock.user?.id || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
  if (num && botNum && num === botNum) return true;
  const sudos = (process.env.SUDO || '').split(',').map(s => s.replace(/[^0-9]/g, '')).filter(Boolean);
  return sudos.includes(num);
}

async function apiCall(endpoint, method = 'GET', body = null, apiKey = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API_BASE + endpoint, opts);
    return res.json();
  } catch (e) {
    return { success: false, message: 'Erreur réseau: ' + e.message };
  }
}

async function onBotStart(sock, ownerJid) {
  const envKey = process.env.XHRIS_API_KEY || null;
  if (envKey && ownerJid) {
    const res = await apiCall('/users/me', 'GET', null, envKey);
    if (res.success) {
      // Key the session by the owner's number so it is found from any chat
      const ownerNum = (ownerJid || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
      const authJid = ownerNum ? (ownerNum + '@s.whatsapp.net') : ownerJid;
      sessions.set(authJid, { apiKey: envKey, user: res.data, connectedAt: new Date() });
      persistSessions();
      const deployType = process.env.XHRIS_DEPLOY_TYPE || 'upload';
      await sock.sendMessage(ownerJid, {
        text:
          '✅ *XHRIS HOSTING Connecté !*\n\n' +
          '👤 Utilisateur: ' + res.data.name + '\n' +
          '🤖 Bot: ' + (process.env.BOT_NAME || 'XHRIS-MD') + '\n' +
          '📦 Mode: ' + (deployType === '1click' ? '🚀 1-Click Deploy' : '📁 Upload') + '\n\n' +
          'Tapez *.host* pour le menu.',
      });
    }
  } else {
    console.log('[XHRIS HOST] Aucune clé env — les utilisateurs doivent s\'authentifier via .xhrishost');
  }
}

function normNum(j) {
  return (j || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
}

// ctx = { prefix, isPublic, isOwner } — provided by the bot so the connector
// honours the bot's live prefix and public/private mode.
async function handleCommand(sock, msg, ctx = {}) {
  // Resolve the prefix WITHOUT clobbering an empty (no-prefix) value.
  // `ctx.prefix || '.'` was wrong: '' is falsy, so a null/empty prefix became '.'
  let prefix = (ctx.prefix === undefined || ctx.prefix === null) ? '.' : String(ctx.prefix);
  if (/^(null|none|aucun|false)$/i.test(prefix)) prefix = '';
  const isPublic = !!ctx.isPublic;
  const isOwner = (ctx.isOwner !== undefined) ? !!ctx.isOwner : isPrivileged(sock, msg);

  const rawText =
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    '';
  const trimmed = (rawText || '').trim();
  if (!trimmed) return false;

  // Where to REPLY: the current chat
  const chatJid = fixSelfDmJid(msg.key.remoteJid, msg, sock);
  if (!chatJid || chatJid === 'status@broadcast' || chatJid.endsWith('@newsletter')) return false;

  // ── Mode gate: in PRIVATE mode, only the owner/sudo may use the connector ──
  if (!isPublic && !isOwner) return false;

  // ── Identity = the SENDER, so the session follows the user across EVERY chat.
  // Connect once (e.g. in your DM) and your commands work in any chat without
  // reconnecting, for as long as the bot stays online. ─────────────────────────
  const sender = senderJid(sock, msg);
  const senderNum = normNum(sender);
  const authJid = senderNum ? (senderNum + '@s.whatsapp.net') : chatJid;

  // Mirror the bot's normal reply path so messages don't stay "pending":
  // mark the incoming message as read (once) and quote it when replying.
  let _markedRead = false;
  const send = async (text) => {
    if (!_markedRead) {
      _markedRead = true;
      try { await sock.readMessages([msg.key]); } catch (e) {}
    }
    return sock.sendMessage(chatJid, { text }, { quoted: msg });
  };
  const session = getSession(authJid);

  // ── Confirmation transfert en attente (1 ou 2) ─────────────────────────
  if (awaitingTransferConfirm.has(authJid)) {
    const pending = awaitingTransferConfirm.get(authJid);

    if (Date.now() - pending.ts > CONFIRM_TIMEOUT_MS) {
      awaitingTransferConfirm.delete(authJid);
      await send('⏱️ Délai dépassé. Le transfert a été annulé.\nRelancez avec *' + prefix + 'transfert <id> <montant>*');
      return true;
    }

    const low = trimmed.toLowerCase();
    if (trimmed === '1' || low === 'oui' || low === 'yes') {
      awaitingTransferConfirm.delete(authJid);
      if (!session) {
        await send('🔒 Session expirée. Tapez *' + prefix + 'xhrishost*.');
        return true;
      }
      await send('🔄 Transfert en cours...');
      const res = await apiCall('/coins/transfer', 'POST', {
        recipientId: pending.recipient.id,
        amount: pending.amount,
      }, session.apiKey);

      if (res.success) {
        await send(
          '✅ *Transfert effectué !*\n\n' +
          '💰 Montant: *' + pending.amount + ' coins*\n' +
          '👤 Destinataire: *' + pending.recipient.name + '*\n' +
          '📧 ' + pending.recipient.email + '\n\n' +
          'Frais: 1 coin\n' +
          'Tapez *' + prefix + 'coins* pour voir votre solde.');
      } else {
        await send('❌ ' + (res.message || 'Erreur de transfert'));
      }
      return true;
    }

    if (trimmed === '2' || low === 'non' || low === 'no') {
      awaitingTransferConfirm.delete(authJid);
      await send('❌ Transfert annulé.');
      return true;
    }

    await send('❓ Répondez *1* pour confirmer ou *2* pour annuler.\n\n' +
      '(Demande expirera dans ' +
      Math.max(0, Math.ceil((CONFIRM_TIMEOUT_MS - (Date.now() - pending.ts)) / 1000)) + 's)');
    return true;
  }

  // ── Vérification du code (état en attente) ──────────────────────────────────
  if (awaitingCode.has(authJid) && /^\d{6}$/.test(trimmed)) {
    const requestId = awaitingCode.get(authJid);
    awaitingCode.delete(authJid);

    await send('🔄 Vérification en cours...');
    const res = await apiCall('/auth/whatsapp/verify', 'POST', { requestId, code: trimmed, whatsappJid: authJid });

    if (res.success) {
      const { apiKey, user } = res.data;
      sessions.set(authJid, { apiKey, user, connectedAt: new Date() });
      persistSessions();
      await send(
        '✅ *Connexion réussie !*\n\n' +
        '👤 ' + user.name + '\n' +
        '💰 ' + user.coins + ' coins\n' +
        '📦 Plan: ' + user.plan + '\n\n' +
        'Tapez *' + prefix + 'host* pour le menu complet.');
    } else {
      await send('❌ ' + (res.message || 'Code incorrect ou expiré') + '\n\nTapez *' + prefix + 'xhrishost* pour recommencer.');
    }
    return true;
  }

  // ── À partir d'ici, la commande doit commencer par le préfixe du bot ──
  if (!trimmed.startsWith(prefix)) return false;
  const body = trimmed.slice(prefix.length).trim();
  if (!body) return false;
  const parts = body.split(/\s+/);
  const cmdName = (parts[0] || '').toLowerCase();

  // ── xhrishost — Démarrer l'authentification ──────────────────────────────
  if (cmdName === 'xhrishost') {
    if (session) {
      await send('✅ Déjà connecté en tant que *' + session.user.name + '*\nTapez *' + prefix + 'host* pour le menu ou *' + prefix + 'deconnexion* pour vous déconnecter.');
      return true;
    }

    await send('🔄 Génération du code de vérification...');
    const res = await apiCall('/auth/whatsapp/request', 'POST', { whatsappJid: authJid });

    if (!res.success) {
      await send('❌ ' + (res.message || 'Erreur'));
      return true;
    }

    awaitingCode.set(authJid, res.data.requestId);
    const capturedRequestId = res.data.requestId;
    setTimeout(function () {
      if (awaitingCode.get(authJid) === capturedRequestId) awaitingCode.delete(authJid);
    }, 3 * 60 * 1000);

    await send(
      '🔐 *Authentification XHRIS HOST*\n\n' +
      '1️⃣ Ouvrez ce lien dans votre navigateur:\n' +
      '🔗 ' + res.data.verifyLink + '\n\n' +
      '2️⃣ Connectez-vous à votre compte\n' +
      '3️⃣ Copiez le code à 6 chiffres affiché\n' +
      '4️⃣ Envoyez-le ici dans ce chat\n\n' +
      '⏱️ Le code expire dans 3 minutes.');
    return true;
  }

  // ── hostlink — Lien du site ──────────────────────────────────────────────
  if (cmdName === 'hostlink' || cmdName === 'host-link' || cmdName === 'lien' || cmdName === 'site') {
    await send(
      '🌐 *XHRIS HOST*\n\n' +
      '🔗 ' + SITE_URL + '\n\n' +
      '🤖 Hébergement de bots WhatsApp, Telegram, Discord.\n' +
      '🚀 Déploiement en 1-clic depuis le Marketplace.\n' +
      '💰 Tarification flexible avec Coins.\n\n' +
      'Créez votre compte et déployez votre premier bot en moins de 2 minutes.');
    return true;
  }

  // ── deconnexion ──────────────────────────────────────────────────────────
  if (cmdName === 'deconnexion' || cmdName === 'logout') {
    sessions.delete(authJid);
    persistSessions();
    awaitingTransferConfirm.delete(authJid);
    await send('👋 Déconnecté. Tapez *' + prefix + 'xhrishost* pour vous reconnecter.');
    return true;
  }

  // ── host — Menu (auth requise) ───────────────────────────────────────────
  if (cmdName === 'host') {
    if (!session) {
      await send('🔒 Non connecté. Tapez *' + prefix + 'xhrishost* pour vous authentifier.');
      return true;
    }
    const p = prefix;
    await send(
      '🌐 *XHRIS HOST — MENU*\n\n' +
      '• ' + p + 'id          — Mon ID\n' +
      '• ' + p + 'profil      — Profil\n' +
      '• ' + p + 'coins       — Solde\n' +
      '• ' + p + 'serveurs    — Serveurs\n' +
      '• ' + p + 'bots        — Mes bots\n' +
      '• ' + p + 'market      — Marketplace\n' +
      '• ' + p + 'historique  — Transactions\n' +
      '• ' + p + 'transfert   — Envoyer des coins\n' +
      '• ' + p + 'acheter     — Acheter des coins\n' +
      '• ' + p + 'hostlink    — Site web\n' +
      '• ' + p + 'deconnexion — Quitter\n\n' +
      '👤 Connecté: ' + session.user.name);
    return true;
  }

  // ── Commandes nécessitant une authentification ──────────────────────────
  if (!session) return false;
  const key = session.apiKey;

  // ── id ──
  if (cmdName === 'id' || cmdName === 'my-id' || cmdName === 'monid' || cmdName === 'myid') {
    try {
      const res = await apiCall('/users/me', 'GET', null, key);
      const u = res.success ? res.data : session.user;
      if (res.success) {
        session.user = u;
        sessions.set(authJid, session);
        persistSessions();
      }
      await send(
        '🆔 *Votre ID XHRIS Host*\n\n' +
        '```' + u.id + '```\n\n' +
        '📋 Copiez cet ID (appui long → copier).\n' +
        '_Cet ID sert à recevoir des coins via :_\n' +
        '*' + prefix + 'transfert ' + u.id + ' <montant>*\n\n' +
        '👤 ' + u.name + '\n' +
        '📧 ' + (u.email || '—') + '\n' +
        '💰 ' + (u.coins || 0) + ' coins');
    } catch (e) {
      await send('❌ Erreur: ' + e.message);
    }
    return true;
  }

  if (cmdName === 'profil') {
    const res = await apiCall('/users/me', 'GET', null, key);
    if (res.success) {
      const u = res.data;
      await send(
        '👤 *Profil XHRIS HOST*\n\n' +
        '📛 Nom: ' + u.name + '\n' +
        '📧 Email: ' + u.email + '\n' +
        '🆔 ID: ```' + u.id + '```\n' +
        '💰 Coins: ' + u.coins + '\n' +
        '⭐ Niveau: ' + (u.level || 1) + ' (' + (u.xp || 0) + ' XP)\n' +
        '📦 Plan: ' + u.plan);
    } else {
      await send('❌ ' + (res.message || 'Erreur'));
    }
    return true;
  }

  if (cmdName === 'coins') {
    const res = await apiCall('/coins/balance', 'GET', null, key);
    if (res.success) {
      await send(
        '💰 *Solde:* ' + (res.data.coins || 0) + ' coins\n\n' +
        '📥 Pour recevoir des coins, donnez votre ID :\n' +
        '*' + prefix + 'id*\n' +
        '📤 Pour en envoyer :\n' +
        '*' + prefix + 'transfert <id> <montant>*');
    } else {
      await send('❌ ' + (res.message || 'Erreur'));
    }
    return true;
  }

  if (cmdName === 'serveurs') {
    const res = await apiCall('/servers', 'GET', null, key);
    if (res.success) {
      const servers = res.data?.servers || res.data?.data || res.data || [];
      if (!Array.isArray(servers) || !servers.length) {
        await send('📡 Aucun serveur.');
        return true;
      }
      let txt = '📡 *Mes Serveurs*\n\n';
      servers.forEach((s, i) => { txt += (i + 1) + '. *' + s.name + '*\n   ' + s.status + ' | ' + s.plan + '\n\n'; });
      txt += 'Cmds: ' + prefix + 'start-srv <id> | ' + prefix + 'stop-srv <id>';
      await send(txt);
    } else {
      await send('❌ ' + (res.message || 'Erreur'));
    }
    return true;
  }

  if (cmdName === 'bots') {
    const res = await apiCall('/bots', 'GET', null, key);
    if (res.success) {
      const bots = res.data?.bots || res.data?.data || res.data || [];
      if (!Array.isArray(bots) || !bots.length) {
        await send('🤖 Aucun bot déployé.');
        return true;
      }
      let txt = '🤖 *Mes Bots*\n\n';
      bots.forEach((b, i) => { txt += (i + 1) + '. *' + b.name + '* [' + b.status + ']\n   ' + b.platform + '\n\n'; });
      txt += 'Cmds: ' + prefix + 'start-bot <id> | ' + prefix + 'stop-bot <id> | ' + prefix + 'restart-bot <id>';
      await send(txt);
    } else {
      await send('❌ ' + (res.message || 'Erreur'));
    }
    return true;
  }

  if (cmdName === 'market') {
    const res = await apiCall('/marketplace/bots', 'GET', null, key);
    if (res.success) {
      const bots = res.data?.data || res.data?.bots || res.data || [];
      let txt = '🏪 *Marketplace XHRIS HOST*\n\n';
      bots.slice(0, 8).forEach((b, i) => {
        txt += (i + 1) + '. *' + b.name + '* ⭐' + (b.rating || 0) + '\n   ' + (b.description || '').slice(0, 60) + '...\n\n';
      });
      txt += '🔗 Plus sur ' + SITE_URL + '/marketplace';
      await send(txt);
    } else {
      await send('❌ ' + (res.message || 'Erreur'));
    }
    return true;
  }

  if (cmdName === 'historique') {
    const res = await apiCall('/coins/transactions?limit=10', 'GET', null, key);
    if (res.success) {
      const txs = res.data?.transactions || res.data?.data || res.data || [];
      if (!Array.isArray(txs) || !txs.length) {
        await send('📜 Aucune transaction.');
        return true;
      }
      let txt = '📜 *Historique (10 dernières)*\n\n';
      txs.forEach(t => {
        const sign = (t.amount > 0) ? '➕' : '➖';
        txt += sign + ' ' + Math.abs(t.amount) + ' — ' + (t.description || t.type) + '\n';
      });
      await send(txt);
    } else {
      await send('❌ ' + (res.message || 'Erreur'));
    }
    return true;
  }

  // ── transfert <id> <montant> — avec CONFIRMATION ─────────
  if (cmdName === 'transfert' || cmdName === 'transfer') {
    const recipientId = (parts[1] || '').trim();
    const amount = parseInt(parts[2], 10);

    if (!recipientId || !amount || amount <= 0 || Number.isNaN(amount)) {
      await send(
        '❌ *Usage incorrect*\n\n' +
        'Format : *' + prefix + 'transfert <id> <montant>*\n\n' +
        'Exemple : *' + prefix + 'transfert cm1abc23def 100*\n\n' +
        '💡 Pour avoir votre ID, tapez *' + prefix + 'id*');
      return true;
    }

    if (recipientId === session.user.id) {
      await send('❌ Vous ne pouvez pas vous envoyer des coins à vous-même.');
      return true;
    }

    await send('🔍 Recherche du destinataire...');
    const lookup = await apiCall('/coins/lookup/' + encodeURIComponent(recipientId), 'GET', null, key);

    if (!lookup.success) {
      await send('❌ ' + (lookup.message || 'Destinataire introuvable. Vérifiez l\'ID.'));
      return true;
    }

    const recipient = lookup.data;
    const fee = 1;
    const total = amount + fee;

    awaitingTransferConfirm.set(authJid, { recipient, amount, ts: Date.now() });
    setTimeout(() => {
      const p = awaitingTransferConfirm.get(authJid);
      if (p && p.recipient.id === recipient.id && p.amount === amount) {
        awaitingTransferConfirm.delete(authJid);
      }
    }, CONFIRM_TIMEOUT_MS);

    await send(
      '⚠️ *Confirmation de transfert*\n\n' +
      '👤 Destinataire: *' + recipient.name + '*\n' +
      '📧 Email: ' + (recipient.email || '—') + '\n' +
      '📦 Plan: ' + (recipient.plan || 'FREE') + '\n\n' +
      '💰 Montant: *' + amount + ' coins*\n' +
      '💸 Frais: *' + fee + ' coin*\n' +
      '━━━━━━━━━━━━━━━━━━\n' +
      '🧮 Total débité: *' + total + ' coins*\n\n' +
      '*Répondez :*\n' +
      '*1* — ✅ Confirmer le transfert\n' +
      '*2* — ❌ Annuler\n\n' +
      '⏱️ Vous avez 90 secondes pour répondre.');
    return true;
  }

  if (cmdName === 'acheter') {
    await send(
      '💳 *Acheter des Coins*\n\n' +
      'Rendez-vous sur :\n🔗 ' + SITE_URL + '/dashboard/coins/buy\n\n' +
      '*Packs disponibles :*\n' +
      '• 500 coins — 1.99€\n' +
      '• 1 000 coins — 3.49€ (+100 bonus) ⭐\n' +
      '• 2 500 coins — 7.99€ (+300 bonus)\n' +
      '• 5 000 coins — 14.99€ (+700 bonus)\n' +
      '• 10 000 coins — 27.99€ (+1500 bonus)\n\n' +
      '*Moyens de paiement :*\n' +
      '• 📱 Mobile Money (Fapshi)\n' +
      '• 💳 Carte bancaire (GeniusPay)\n' +
      '• 💸 Virement manuel');
    return true;
  }

  // Bot/server actions
  if (cmdName === 'start-bot') { const id = parts[1]; const res = await apiCall('/bots/' + id + '/start', 'POST', null, key); await send(res.success ? '✅ Bot démarré' : '❌ ' + (res.message || 'Erreur')); return true; }
  if (cmdName === 'stop-bot') { const id = parts[1]; const res = await apiCall('/bots/' + id + '/stop', 'POST', null, key); await send(res.success ? '✅ Bot arrêté' : '❌ ' + (res.message || 'Erreur')); return true; }
  if (cmdName === 'restart-bot') { const id = parts[1]; const res = await apiCall('/bots/' + id + '/restart', 'POST', null, key); await send(res.success ? '✅ Bot redémarré' : '❌ ' + (res.message || 'Erreur')); return true; }
  if (cmdName === 'start-srv') { const id = parts[1]; const res = await apiCall('/servers/' + id + '/start', 'POST', null, key); await send(res.success ? '✅ Serveur démarré' : '❌ ' + (res.message || 'Erreur')); return true; }
  if (cmdName === 'stop-srv') { const id = parts[1]; const res = await apiCall('/servers/' + id + '/stop', 'POST', null, key); await send(res.success ? '✅ Serveur arrêté' : '❌ ' + (res.message || 'Erreur')); return true; }
  if (cmdName === 'delete-srv') { const id = parts[1]; const res = await apiCall('/servers/' + id, 'DELETE', null, key); await send(res.success ? '✅ Serveur supprimé' : '❌ ' + (res.message || 'Erreur')); return true; }

  return false;
}

console.log('[XHRIS HOST] ✅ Connector v2.1 chargé — Auth par JID activée');
console.log('[XHRIS HOST] Tapez .xhrishost dans WhatsApp pour démarrer l\'authentification');

module.exports = { handleCommand, apiCall, onBotStart, getSession };
