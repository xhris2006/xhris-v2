/**
 * XHRIS MD V2 — Commandes personnalisées
 * xhriskill, takeover, kickall, kickall2, clone, country, device, webcam, fetch, url, setcmd, delcmd, listcmd
 *
 * IMPORTANT : dans conText, `participants` et `groupAdmins` sont des STRINGS (JIDs),
 * PAS des objets. Ne pas faire p.id ou p.admin — utiliser jid directement.
 */

const { gmd, commands, getContextInfo } = require("../mayel");
const axios = require('axios');
const fs = require('fs');
const path = require('path');


// ─── Helper : vérifier si un JID est le bot ou l'owner ───────────────────────
function isProtectedJid(jid, Prince, ownerNumber = '237694600007') {
  if (!jid || typeof jid !== 'string') return false;
  const base = jid.split(':')[0].split('@')[0].replace(/\D/g, '');
  const botBase = (Prince.user?.id || '').split(':')[0].split('@')[0].replace(/\D/g, '');
  const botLid  = (Prince.user?.lid || '').split(':')[0].split('@')[0].replace(/\D/g, '');
  return base === botBase || base === botLid || base === ownerNumber;
}


// ─── XHRISKILL : mute + rename + photo + demote all + kick all ───────────────
gmd({
  pattern: "xhriskill",
  aliases: ['xkill'],
  react: "☠️",
  category: "group",
  description: "Opération XHRIS KILL : mute + rename + photo + demote all + kick all",
}, async (from, Prince, conText) => {
  const { mek, reply, react, isGroup, isDevs, participants, groupAdmins, isBotAdmin } = conText;

  if (!isGroup)   return reply("❌ Groupe uniquement.");
  if (!isDevs)    { await react("❌"); return reply("❌ Cette commande est *réservée au propriétaire absolu* (pas les sudo)."); }
  if (!isBotAdmin) { await react("❌"); return reply("❌ Le bot doit être admin pour cette commande."); }

  await react("☠️");
  await reply(`☠️ *XHRIS KILL en cours...*\n\nÉtape 1/6 : Initialisation`);

  // 1. Mute le groupe
  try { await Prince.groupSettingUpdate(from, 'announcement'); } catch {}

  // 2. Renommer le groupe
  try { await Prince.groupUpdateSubject(from, '☠️ XHRIS DIOR KILL YOU 😂'); } catch {}

  // 3. Photo de profil du groupe
  try {
    const cfg = require('../config');
    if (cfg.BOT_PIC) {
      const res = await axios.get(cfg.BOT_PIC, { responseType: 'arraybuffer', timeout: 15000 });
      await Prince.updateProfilePicture(from, Buffer.from(res.data));
    }
  } catch {}

  // 4. Description
  try { await Prince.groupUpdateDescription(from, 'XHRIS était là'); } catch {}

  // 5. Démettre tous les admins sauf bot/owner
  // groupAdmins = tableau de STRINGS (JIDs)
  const adminsToDemote = (groupAdmins || []).filter(jid => !isProtectedJid(jid, Prince));
  let demoted = 0;
  for (const adminJid of adminsToDemote) {
    try {
      await Prince.groupParticipantsUpdate(from, [adminJid], 'demote');
      demoted++;
      await new Promise(r => setTimeout(r, 500));
    } catch {}
  }

  // 6. Kick tout sauf bot/owner
  // participants = tableau de STRINGS
  const toKick = (participants || []).filter(jid => !isProtectedJid(jid, Prince));
  let kicked = 0, failed = 0;
  for (const jid of toKick) {
    try {
      await Prince.groupParticipantsUpdate(from, [jid], 'remove');
      kicked++;
      await new Promise(r => setTimeout(r, 800));
    } catch { failed++; }
  }

  await Prince.sendMessage(from, {
    text: `✅ *XHRIS KILL terminé !*\n\n🔒 Groupe muté\n📛 Nom : XHRIS DIOR KILL YOU 😂\n📝 Desc : XHRIS était là\n⬇️ ${demoted} admin(s) démis\n👥 ${kicked}/${toKick.length} membres expulsés\n❌ ${failed} échec(s)`
  });
  await react("✅");
});


// ─── TAKEOVER : démet tous les admins ────────────────────────────────────────
gmd({
  pattern: "takeover",
  react: "👑",
  category: "group",
  description: "Démet tous les admins sauf bot et owner",
}, async (from, Prince, conText) => {
  const { reply, react, isGroup, isDevs, groupAdmins, isBotAdmin } = conText;

  if (!isGroup)   return reply("❌ Groupe uniquement.");
  if (!isDevs)    { await react("❌"); return reply("❌ Cette commande est *réservée au propriétaire absolu*."); }
  if (!isBotAdmin) { await react("❌"); return reply("❌ Le bot doit être admin."); }

  await react("⏳");

  const toDemote = (groupAdmins || []).filter(jid => !isProtectedJid(jid, Prince));
  let demoted = 0;
  for (const adminJid of toDemote) {
    try {
      await Prince.groupParticipantsUpdate(from, [adminJid], 'demote');
      demoted++;
      await new Promise(r => setTimeout(r, 400));
    } catch {}
  }

  await reply(`✅ *TAKEOVER terminé*\n⬇️ ${demoted} admin(s) démis`);
  await react("✅");
});


// ─── KICKALL : expulse tout sauf bot et owner ────────────────────────────────
gmd({
  pattern: "kickall",
  react: "💥",
  category: "group",
  description: "Expulse tous les membres sauf bot et owner",
}, async (from, Prince, conText) => {
  const { reply, react, isGroup, isDevs, participants, isBotAdmin } = conText;

  if (!isGroup)   return reply("❌ Groupe uniquement.");
  if (!isDevs)    { await react("❌"); return reply("❌ Cette commande est *réservée au propriétaire absolu*."); }
  if (!isBotAdmin) { await react("❌"); return reply("❌ Le bot doit être admin."); }

  await react("⏳");

  const toKick = (participants || []).filter(jid => !isProtectedJid(jid, Prince));
  let kicked = 0, failed = 0;
  for (const jid of toKick) {
    try {
      await Prince.groupParticipantsUpdate(from, [jid], 'remove');
      kicked++;
      await new Promise(r => setTimeout(r, 800));
    } catch { failed++; }
  }

  await reply(`✅ *KICKALL terminé*\n👥 ${kicked}/${toKick.length} expulsés\n❌ ${failed} échec(s)`);
  await react("✅");
});


// ─── KICKALL2 : kick par préfixe de numéro (ex: .kickall2 234) ───────────────
gmd({
  pattern: "kickall2",
  react: "💥",
  category: "group",
  description: "Expulse les membres dont le numéro commence par X (ex: .kickall2 234)",
}, async (from, Prince, conText) => {
  const { reply, react, isGroup, isDevs, participants, q, isBotAdmin } = conText;

  if (!isGroup)   return reply("❌ Groupe uniquement.");
  if (!isDevs)    { await react("❌"); return reply("❌ Cette commande est *réservée au propriétaire absolu*."); }
  if (!isBotAdmin) { await react("❌"); return reply("❌ Le bot doit être admin."); }
  if (!q)          return reply("❌ Donne un préfixe.\nExemple : .kickall2 234 (expulse tous les +234)");

  const prefix = q.trim().replace(/\D/g, '');
  if (!prefix) return reply("❌ Préfixe invalide.");

  await react("⏳");

  const toKick = (participants || []).filter(jid => {
    if (isProtectedJid(jid, Prince)) return false;
    const num = jid.split(':')[0].split('@')[0].replace(/\D/g, '');
    return num.startsWith(prefix);
  });

  if (toKick.length === 0) return reply(`❌ Aucun membre avec le préfixe +${prefix}.`);

  let kicked = 0, failed = 0;
  for (const jid of toKick) {
    try {
      await Prince.groupParticipantsUpdate(from, [jid], 'remove');
      kicked++;
      await new Promise(r => setTimeout(r, 800));
    } catch { failed++; }
  }

  await reply(`✅ *KICKALL2 terminé*\n👥 ${kicked}/${toKick.length} membres +${prefix} expulsés\n❌ ${failed} échec(s)`);
  await react("✅");
});


// ─── CLONE : duplique le groupe actuel ───────────────────────────────────────
gmd({
  pattern: "clone",
  react: "🪞",
  category: "group",
  description: "Clone le groupe actuel",
}, async (from, Prince, conText) => {
  const { reply, react, isGroup, isDevs, groupMetadata, participants } = conText;

  if (!isGroup) return reply("❌ Groupe uniquement.");
  if (!isDevs)  { await react("❌"); return reply("❌ Cette commande est *réservée au propriétaire absolu*."); }

  await react("⏳");
  await reply("🪞 *CLONE en cours...*\n\nCréation du nouveau groupe...");

  try {
    const botBase = (Prince.user?.id || '').split(':')[0].split('@')[0].replace(/\D/g, '');
    const memberJids = (participants || []).filter(jid => {
      const num = jid.split(':')[0].split('@')[0].replace(/\D/g, '');
      return num !== botBase;
    });

    const newGroup = await Prince.groupCreate(`[CLONE] ${groupMetadata?.subject || 'Group'}`, []);
    await Prince.sendMessage(from, {
      text: `✅ Nouveau groupe créé !\n📛 Nom : [CLONE] ${groupMetadata?.subject}\n👥 ${memberJids.length} membres à ajouter`
    });

    let added = 0, failed = 0;
    for (let i = 0; i < memberJids.length; i += 5) {
      const batch = memberJids.slice(i, i + 5);
      try {
        const res = await Prince.groupParticipantsUpdate(newGroup.id, batch, 'add');
        added  += res?.filter(r => r.status === '200' || r.status === 200).length || 0;
        failed += res?.filter(r => r.status !== '200' && r.status !== 200).length || 0;
      } catch { failed += batch.length; }
      await new Promise(r => setTimeout(r, 1500));
    }

    await Prince.sendMessage(from, {
      text: `✅ *CLONE terminé*\n👥 Ajoutés : ${added}/${memberJids.length}\n❌ Échecs : ${failed}`
    });
    await react("✅");
  } catch (e) {
    await react("❌");
    await reply(`❌ Erreur clone : ${e.message}`);
  }
});


// ─── COUNTRY : info pays depuis numéro ───────────────────────────────────────
gmd({
  pattern: "country",
  aliases: ['pays', 'whichcountry'],
  react: "🌍",
  category: "tools",
  description: "Trouve le pays d'un numéro de téléphone",
}, async (from, Prince, conText) => {
  const { q, reply, react } = conText;

  if (!q) return reply("❌ Donne un numéro.\nExemple : .country +237694600007");
  await react("⏳");

  try {
    const num = q.replace(/[^0-9]/g, '');
    const res = await axios.get(
      'https://restcountries.com/v3.1/all?fields=name,idd,flag,cca2,capital,region,population,languages',
      { timeout: 15000 }
    );

    let match = null;
    for (const c of res.data) {
      if (c.idd?.root) {
        const codes = (c.idd.suffixes || ['']).map(s => (c.idd.root + s).replace('+', ''));
        for (const code of codes) {
          if (num.startsWith(code) && (!match || code.length > match.code.length)) {
            match = { country: c, code };
          }
        }
      }
    }

    if (!match) { await react("❌"); return reply(`❌ Pays non trouvé pour +${num}`); }

    const c = match.country;
    await reply(
      `🌍 *PAYS DU NUMÉRO*\n\n📱 Numéro : +${num}\n🏴 Code : +${match.code}\n${c.flag} Pays : ${c.name.common}\n` +
      `🏙️ Capitale : ${c.capital?.[0] || 'N/A'}\n🌐 Région : ${c.region}\n👥 Population : ${c.population?.toLocaleString() || 'N/A'}\n` +
      `🗣️ Langues : ${Object.values(c.languages || {}).join(', ') || 'N/A'}`
    );
    await react("✅");
  } catch (e) {
    await react("❌");
    await reply(`❌ Erreur : ${e.message}`);
  }
});


// ─── DEVICE : info appareil du sender ────────────────────────────────────────
gmd({
  pattern: "device",
  aliases: ['appareil'],
  react: "📱",
  category: "tools",
  description: "Identifie l'appareil/version WhatsApp du sender",
}, async (from, Prince, conText) => {
  const { reply, react, mek, sender, quotedMsg } = conText;

  await react("⏳");
  try {
    const msgId = (quotedMsg?.key || mek.key).id || '';
    let device = 'Inconnu';
    if      (msgId.startsWith('3EB0'))                          device = '📱 WhatsApp (iOS/Android)';
    else if (msgId.startsWith('3A'))                             device = '🍎 WhatsApp iOS';
    else if (msgId.startsWith('B'))                              device = '💻 WhatsApp Business';
    else if (msgId.length === 16 && /^[A-F0-9]+$/.test(msgId)) device = '🤖 Android';
    else if (msgId.startsWith('NS-'))                            device = '🌐 WhatsApp Web';
    else                                                         device = `📡 Autre (ID: ${msgId.substring(0, 4)}...)`;

    await reply(`📱 *DEVICE INFO*\n\n👤 Sender : ${sender.split('@')[0]}\n📲 Appareil : ${device}\n🆔 Message ID prefix : ${msgId.substring(0, 8)}`);
    await react("✅");
  } catch (e) {
    await react("❌");
    await reply(`❌ Erreur : ${e.message}`);
  }
});


// ─── WEBCAM : screenshot webcam publique ─────────────────────────────────────
gmd({
  pattern: "webcam",
  aliases: ['cam', 'randomcam'],
  react: "📹",
  category: "fun",
  description: "Photo random d'une webcam publique",
}, async (from, Prince, conText) => {
  const { reply, react, mek, botFooter } = conText;

  await react("⏳");

  const endpoints = [
    'https://api.giftedtech.web.id/api/fun/webcam?apikey=gifted',
    'https://api.princetechn.com/api/fun/webcam?apikey=prince_api_56yjJ568dte4',
    'https://insecam.org/random/screenshot',
  ];

  for (const url of endpoints) {
    try {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, validateStatus: () => true });
      const ct = res.headers['content-type'] || '';
      if (!ct.includes('image/')) continue;

      await Prince.sendMessage(from, {
        image: Buffer.from(res.data),
        caption: `📹 *Webcam aléatoire*\n\n> *${botFooter}*`
      }, { quoted: mek });
      await react("✅");
      return;
    } catch { continue; }
  }

  await react("❌");
  await reply("❌ Toutes les APIs webcam sont indisponibles. Réessaie plus tard.");
});


// ─── FETCH : télécharge un fichier depuis une URL ─────────────────────────────
gmd({
  pattern: "fetch",
  aliases: ['get'],
  react: "🌐",
  category: "tools",
  description: "Télécharge le contenu d'une URL",
}, async (from, Prince, conText) => {
  const { q, reply, react, mek, isSuperUser } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");
  if (!q) return reply("❌ Donne une URL.\nExemple : .fetch https://example.com/file.pdf");

  await react("⏳");
  try {
    const url = q.trim();
    const res = await axios.get(url, {
      responseType: 'arraybuffer', timeout: 60000, validateStatus: () => true,
      maxContentLength: 50 * 1024 * 1024
    });
    const ct = res.headers['content-type'] || 'application/octet-stream';
    const buffer = Buffer.from(res.data);
    const filename = url.split('/').pop().split('?')[0] || 'file';

    if      (ct.startsWith('image/'))  await Prince.sendMessage(from, { image: buffer, caption: `📥 ${url}` }, { quoted: mek });
    else if (ct.startsWith('video/'))  await Prince.sendMessage(from, { video: buffer, caption: `📥 ${url}` }, { quoted: mek });
    else if (ct.startsWith('audio/'))  await Prince.sendMessage(from, { audio: buffer, mimetype: ct }, { quoted: mek });
    else                                await Prince.sendMessage(from, { document: buffer, mimetype: ct, fileName: filename }, { quoted: mek });

    await react("✅");
  } catch (e) {
    await react("❌");
    await reply(`❌ Erreur : ${e.message}`);
  }
});


// ─── URL : upload un media (3 providers en cascade) ─────────────────────────
gmd({
  pattern: "url",
  aliases: ['tourl', 'upload', 'cdn', 'getlink'],
  react: "🔗",
  category: "tools",
  description: "Convertit un media en URL hébergée (Catbox → Uguu → 0x0)",
}, async (from, Prince, conText) => {
  const { reply, react, mek, quoted, quotedMsg, getMediaBuffer } = conText;

  if (!quotedMsg) {
    await react("❌");
    return reply("❌ Réponds à un fichier (image/vidéo/audio/sticker/document)");
  }

  await react("⏳");
  try {
    let mediaType, mediaMessage, ext;
    if      (quoted.imageMessage)    { mediaType='image';    mediaMessage=quoted.imageMessage;    ext='jpg'; }
    else if (quoted.videoMessage)    { mediaType='video';    mediaMessage=quoted.videoMessage;    ext='mp4'; }
    else if (quoted.audioMessage)    { mediaType='audio';    mediaMessage=quoted.audioMessage;    ext='mp3'; }
    else if (quoted.stickerMessage)  { mediaType='sticker';  mediaMessage=quoted.stickerMessage;  ext='webp'; }
    else if (quoted.documentMessage) { mediaType='document'; mediaMessage=quoted.documentMessage; ext=(quoted.documentMessage.fileName||'').split('.').pop()||'bin'; }
    else { await react("❌"); return reply("❌ Format non supporté."); }

    const buffer = await getMediaBuffer(mediaMessage, mediaType);
    if (!buffer || buffer.length === 0) {
      await react("❌");
      return reply("❌ Échec téléchargement du fichier (buffer vide).");
    }

    const sizeKB   = (buffer.length / 1024).toFixed(2);
    const fileName = `xhris_${Date.now()}.${ext}`;
    const FormData = require('form-data');
    let fileUrl = null, provider = null;

    // Provider 1 : Catbox
    try {
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', buffer, fileName);
      const r = await axios.post('https://catbox.moe/user/api.php', form, { headers: form.getHeaders(), timeout: 60000, maxContentLength: 200*1024*1024, maxBodyLength: 200*1024*1024 });
      const url = String(r.data).trim();
      if (url.startsWith('http')) { fileUrl = url; provider = 'Catbox'; }
    } catch (e) { console.log('[URL] Catbox failed:', e.message); }

    // Provider 2 : Uguu.se
    if (!fileUrl) {
      try {
        const form = new FormData();
        form.append('files[]', buffer, fileName);
        const r = await axios.post('https://uguu.se/upload.php', form, { headers: form.getHeaders(), timeout: 60000, maxContentLength: 100*1024*1024, maxBodyLength: 100*1024*1024 });
        const url = r.data?.files?.[0]?.url;
        if (url && url.startsWith('http')) { fileUrl = url; provider = 'Uguu'; }
      } catch (e) { console.log('[URL] Uguu failed:', e.message); }
    }

    // Provider 3 : 0x0.st
    if (!fileUrl) {
      try {
        const form = new FormData();
        form.append('file', buffer, fileName);
        const r = await axios.post('https://0x0.st', form, { headers: { ...form.getHeaders(), 'User-Agent': 'XHRIS-MD-V2' }, timeout: 60000, maxContentLength: 100*1024*1024, maxBodyLength: 100*1024*1024 });
        const url = String(r.data).trim();
        if (url.startsWith('http')) { fileUrl = url; provider = '0x0'; }
      } catch (e) { console.log('[URL] 0x0 failed:', e.message); }
    }

    if (!fileUrl) {
      await react("❌");
      return reply("❌ Tous les providers sont indisponibles. Réessaie dans quelques minutes.");
    }

    await reply(`✅ *Fichier uploadé*\n\n🔗 ${fileUrl}\n📦 Type : ${mediaType}\n💾 Taille : ${sizeKB} KB\n☁️ Provider : ${provider}`);
    await react("");
  } catch (e) {
    console.error("[URL] error:", e);
    await react("❌");
    await reply(`❌ Erreur : ${e.message}`);
  }
});


// ─── SETCMD : créer une commande custom (texte OU sticker→trigger) ──────────
gmd({
  pattern: "setcmd",
  aliases: ['addcmd', 'newcmd'],
  react: "➕",
  category: "owner",
  description: "Créer une commande custom (.setcmd nom = réponse) ou lier un sticker à une commande",
}, async (from, Prince, conText) => {
  const { q, reply, react, isSuperUser, quoted, quotedMsg, getMediaBuffer } = conText;

  if (!isSuperUser) { await react("❌"); return reply("❌ Réservé au propriétaire."); }

  const crypto  = require('crypto');
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // ── MODE STICKER ────────────────────────────────────────────────────────────
  if (quotedMsg && quoted.stickerMessage) {
    if (!q || !q.trim()) {
      await react("❌");
      return reply("❌ Indique le nom de la commande à associer.\n\nExemple : Réponds au sticker avec `.setcmd menu`\nEnsuite quand quelqu'un envoie ce sticker, ça déclenche `.menu`.");
    }
    const cmdName = q.trim().toLowerCase().replace(/^\./, '').split(/\s+/)[0];
    if (!cmdName) { await react("❌"); return reply("❌ Nom de commande invalide."); }
    try {
      const buffer = await getMediaBuffer(quoted.stickerMessage, 'sticker');
      if (!buffer || buffer.length === 0) { await react("❌"); return reply("❌ Échec téléchargement du sticker."); }
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      const stickerCmdsPath = path.join(dataDir, 'sticker-cmds.json');
      let stickers = {};
      if (fs.existsSync(stickerCmdsPath)) { try { stickers = JSON.parse(fs.readFileSync(stickerCmdsPath, 'utf8')); } catch {} }
      stickers[hash] = cmdName;
      fs.writeFileSync(stickerCmdsPath, JSON.stringify(stickers, null, 2));
      await react("");
      return reply(`✅ *Sticker lié à \`.${cmdName}\`*\n\nEnvoyer ce sticker déclenchera la commande automatiquement.\nHash : \`${hash.substring(0, 12)}...\``);
    } catch (e) { await react("❌"); return reply(`❌ Erreur : ${e.message}`); }
  }

  // ── MODE TEXTE ───────────────────────────────────────────────────────────────
  if (!q || !q.includes('=')) {
    await react("❌");
    return reply("❌ Usage :\n• Texte : `.setcmd nom = réponse`\n• Sticker : Réponds à un sticker avec `.setcmd nom-cmd`");
  }

  const [namePart, ...responseParts] = q.split('=');
  const name     = namePart.trim().toLowerCase();
  const response = responseParts.join('=').trim();

  if (!name || !response) { await react("❌"); return reply("❌ Format invalide."); }
  if (name.length > 20)   { await react("❌"); return reply("❌ Nom trop long (max 20 caractères)."); }

  try {
    const customCmdsPath = path.join(dataDir, 'custom-cmds.json');
    let cmds = {};
    if (fs.existsSync(customCmdsPath)) { try { cmds = JSON.parse(fs.readFileSync(customCmdsPath, 'utf8')); } catch {} }
    cmds[name] = response;
    fs.writeFileSync(customCmdsPath, JSON.stringify(cmds, null, 2));
    await react("");
    return reply(`✅ Commande \`.${name}\` créée.\n\n📝 Réponse : ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`);
  } catch (e) { await react("❌"); return reply(`❌ Erreur : ${e.message}`); }
});


// ─── DELCMD : supprimer une commande custom ou un sticker-trigger ────────────
gmd({
  pattern: "delcmd",
  aliases: ['removecmd', 'rmcmd'],
  react: "🗑️",
  category: "owner",
  description: "Supprimer une commande custom ou un sticker-trigger (en réponse au sticker)",
}, async (from, Prince, conText) => {
  const { q, reply, react, isSuperUser, quoted, quotedMsg, getMediaBuffer } = conText;

  if (!isSuperUser) { await react("❌"); return reply("❌ Réservé au propriétaire."); }

  const crypto  = require('crypto');
  const dataDir = path.join(__dirname, '..', 'data');

  // Mode sticker
  if (quotedMsg && quoted.stickerMessage) {
    try {
      const buffer = await getMediaBuffer(quoted.stickerMessage, 'sticker');
      if (!buffer) { await react("❌"); return reply("❌ Échec téléchargement du sticker."); }
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      const stickerCmdsPath = path.join(dataDir, 'sticker-cmds.json');
      if (!fs.existsSync(stickerCmdsPath)) { await react("❌"); return reply("❌ Aucun sticker-trigger enregistré."); }
      const stickers = JSON.parse(fs.readFileSync(stickerCmdsPath, 'utf8'));
      if (!stickers[hash]) { await react("❌"); return reply("❌ Ce sticker n'est associé à aucune commande."); }
      const wasCmd = stickers[hash];
      delete stickers[hash];
      fs.writeFileSync(stickerCmdsPath, JSON.stringify(stickers, null, 2));
      await react("");
      return reply(`✅ Sticker-trigger pour \`.${wasCmd}\` supprimé.`);
    } catch (e) { await react("❌"); return reply(`❌ Erreur : ${e.message}`); }
  }

  // Mode texte
  if (!q) { await react("❌"); return reply("❌ Usage : `.delcmd <nom>` ou réponds à un sticker."); }
  const name = q.trim().toLowerCase();
  try {
    const customCmdsPath = path.join(dataDir, 'custom-cmds.json');
    if (!fs.existsSync(customCmdsPath)) { await react("❌"); return reply("❌ Aucune commande custom enregistrée."); }
    const cmds = JSON.parse(fs.readFileSync(customCmdsPath, 'utf8'));
    if (!cmds[name]) { await react("❌"); return reply(`❌ Commande \`.${name}\` introuvable.`); }
    delete cmds[name];
    fs.writeFileSync(customCmdsPath, JSON.stringify(cmds, null, 2));
    await react("");
    return reply(`✅ Commande \`.${name}\` supprimée.`);
  } catch (e) { await react("❌"); return reply(`❌ Erreur : ${e.message}`); }
});


// ─── LISTCMD : lister les commandes custom ───────────────────────────────────
gmd({
  pattern: "listcmd",
  aliases: ['customcmds', 'mycmds'],
  react: "📋",
  category: "owner",
  description: "Liste toutes les commandes custom",
}, async (from, Prince, conText) => {
  const { reply, react, isSuperUser } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  try {
    const customCmdsPath = path.join(__dirname, '..', 'data', 'custom-cmds.json');
    if (!fs.existsSync(customCmdsPath)) return reply("📋 Aucune commande custom.");

    const cmds = JSON.parse(fs.readFileSync(customCmdsPath, 'utf8'));
    const entries = Object.entries(cmds);
    if (entries.length === 0) return reply("📋 Aucune commande custom.");

    let text = `📋 *Commandes custom (${entries.length})*\n\n`;
    for (const [name, response] of entries) {
      text += `• .${name} → ${response.substring(0, 50)}${response.length > 50 ? '...' : ''}\n`;
    }

    await reply(text);
    await react("✅");
  } catch (e) {
    await react("❌");
    await reply(`❌ Erreur : ${e.message}`);
  }
});


// ─── ADDOWNER : ajouter un owner additionnel ─────────────────────────────────
gmd({
  pattern: "addowner",
  aliases: ['ownadd'],
  react: "👑",
  category: "owner",
  description: "Ajouter un owner additionnel (isDevs)",
}, async (from, Prince, conText) => {
  const { q, reply, react, isDevs, mek, quotedMsg } = conText;

  if (!isDevs) { await react("❌"); return reply("❌ Seul le propriétaire absolu peut ajouter des owners."); }

  let target = null;
  if (q) target = q.replace(/[^0-9]/g, '');
  else if (mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
    target = mek.message.extendedTextMessage.contextInfo.mentionedJid[0].split('@')[0].replace(/\D/g, '');
  } else if (quotedMsg) {
    const p = mek.message?.extendedTextMessage?.contextInfo?.participant;
    if (p) target = p.split(':')[0].split('@')[0].replace(/\D/g, '');
  }

  if (!target || target.length < 8) { await react("❌"); return reply("❌ Donne un numéro valide.\nUsage : `.addowner 237xxxxxx`"); }

  try {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const ownersPath = path.join(dataDir, 'owners.json');
    let owners = [];
    if (fs.existsSync(ownersPath)) { try { owners = JSON.parse(fs.readFileSync(ownersPath, 'utf8')); } catch {} }
    if (!Array.isArray(owners)) owners = [];
    if (owners.includes(target)) { await react("❌"); return reply(`❌ \`${target}\` est déjà owner.`); }
    owners.push(target);
    fs.writeFileSync(ownersPath, JSON.stringify(owners, null, 2));
    await react("");
    return reply(`✅ \`${target}\` ajouté comme owner.\n\n⚠️ Redémarre le bot pour que les vérifications isDevs soient actives.`);
  } catch (e) { await react("❌"); return reply(`❌ Erreur : ${e.message}`); }
});


// ─── DELOWNER : retirer un owner additionnel ─────────────────────────────────
gmd({
  pattern: "delowner",
  aliases: ['ownremove', 'rmowner'],
  react: "❌",
  category: "owner",
  description: "Retirer un owner additionnel",
}, async (from, Prince, conText) => {
  const { q, reply, react, isDevs } = conText;

  if (!isDevs)  { await react("❌"); return reply("❌ Seul le propriétaire absolu peut retirer des owners."); }
  if (!q)       { await react("❌"); return reply("❌ Usage : `.delowner 237xxxxxx`"); }

  const target = q.replace(/[^0-9]/g, '');
  try {
    const ownersPath = path.join(__dirname, '..', 'data', 'owners.json');
    if (!fs.existsSync(ownersPath)) { await react("❌"); return reply("❌ Aucun owner additionnel."); }
    let owners = JSON.parse(fs.readFileSync(ownersPath, 'utf8'));
    if (!Array.isArray(owners) || !owners.includes(target)) { await react("❌"); return reply(`❌ \`${target}\` n'est pas dans la liste.`); }
    owners = owners.filter(n => n !== target);
    fs.writeFileSync(ownersPath, JSON.stringify(owners, null, 2));
    await react("");
    return reply(`✅ \`${target}\` retiré des owners.\n\n⚠️ Redémarre le bot pour appliquer.`);
  } catch (e) { await react("❌"); return reply(`❌ Erreur : ${e.message}`); }
});


// ─── LISTOWNER : afficher les owners ─────────────────────────────────────────
gmd({
  pattern: "listowner",
  aliases: ['owners', 'ownlist'],
  react: "📋",
  category: "owner",
  description: "Lister tous les owners",
}, async (from, Prince, conText) => {
  const { reply, react, isDevs } = conText;

  if (!isDevs) { await react("❌"); return reply("❌ Réservé aux owners."); }

  try {
    const ownersPath = path.join(__dirname, '..', 'data', 'owners.json');
    const builtIn = ['237694600007 *(absolu, hardcodé)*'];
    let additional = [];
    if (fs.existsSync(ownersPath)) { try { additional = JSON.parse(fs.readFileSync(ownersPath, 'utf8')); } catch {} }
    if (!Array.isArray(additional)) additional = [];

    let text = `👑 *LISTE DES OWNERS*\n\n*Built-in :*\n`;
    builtIn.forEach((n, i) => text += `${i + 1}. ${n}\n`);
    if (additional.length > 0) {
      text += `\n*Additionnels :*\n`;
      additional.forEach((n, i) => text += `${i + 1}. ${n}\n`);
    } else {
      text += `\n_Aucun owner additionnel._`;
    }

    await reply(text);
    await react("");
  } catch (e) { await react("❌"); await reply(`❌ Erreur : ${e.message}`); }
});
