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


// ─── TAKEOVER : demote all admins AND mute the group ─────────────────────────
gmd({
  pattern: "takeover",
  react: "👑",
  category: "group",
  description: "Demote all admins (except bot & owner) and mute the group",
}, async (from, Prince, conText) => {
  const { reply, react, isGroup, isDevs, groupAdmins, isBotAdmin } = conText;

  if (!isGroup)   return reply("❌ Group only command.");
  if (!isDevs)    { await react("❌"); return reply("❌ This command is *owner only*."); }
  if (!isBotAdmin) { await react("❌"); return reply("❌ The bot must be an admin."); }

  await react("⏳");

  // 1. Demote every admin except the bot/owner
  const toDemote = (groupAdmins || []).filter(jid => !isProtectedJid(jid, Prince));
  let demoted = 0;
  for (const adminJid of toDemote) {
    try {
      await Prince.groupParticipantsUpdate(from, [adminJid], 'demote');
      demoted++;
      await new Promise(r => setTimeout(r, 400));
    } catch {}
  }

  // 2. Mute the group (only admins can send messages)
  let muted = false;
  try {
    await Prince.groupSettingUpdate(from, 'announcement');
    muted = true;
  } catch {}

  await reply(`✅ *TAKEOVER complete*\n⬇️ ${demoted} admin(s) demoted\n🔒 Group muted: ${muted ? "Yes" : "No"}`);
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


// ─── CLONE : duplicate the current group WITHOUT adding members ──────────────
gmd({
  pattern: "clone",
  aliases: ['clonegc', 'clonegroup'],
  react: "🪞",
  category: "group",
  description: "Clone the current group (name, description, picture) WITHOUT adding members.",
}, async (from, Prince, conText) => {
  const { reply, react, isGroup, isDevs, groupMetadata } = conText;

  if (!isGroup) return reply("❌ Group only command.");
  if (!isDevs)  { await react("❌"); return reply("❌ This command is *owner only*."); }

  await react("⏳");

  try {
    const meta = groupMetadata || (await Prince.groupMetadata(from));
    const newName = `[CLONE] ${meta?.subject || 'Group'}`;
    const newGroup = await Prince.groupCreate(newName, []);

    // Copy description
    try {
      if (meta?.desc) await Prince.groupUpdateDescription(newGroup.id, meta.desc);
    } catch {}

    // Copy profile picture
    try {
      const ppUrl = await Prince.profilePictureUrl(from, "image");
      if (ppUrl) {
        const res = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 15000 });
        await Prince.updateProfilePicture(newGroup.id, Buffer.from(res.data));
      }
    } catch {}

    let linkLine = "";
    try {
      const code = await Prince.groupInviteCode(newGroup.id);
      linkLine = `\n🔗 Link: https://chat.whatsapp.com/${code}`;
    } catch {}

    const msg = `🪞 *CLONE complete*\n📛 Name: ${newName}\n_Empty clone — no members added._${linkLine}\n\n_Use .fullclone to also copy all members._`;
    await Prince.sendMessage(newGroup.id, { text: msg });
    await Prince.sendMessage(from, { text: `✅ ${msg}` });
    await react("✅");
  } catch (e) {
    await react("❌");
    await reply(`❌ Clone error: ${e.message}`);
  }
});


// ─── FULLCLONE : duplicate the group AND add all its members ─────────────────
gmd({
  pattern: "fullclone",
  aliases: ['clonefull', 'fullclonegc'],
  react: "🪞",
  category: "group",
  description: "Clone the current group (name, description, picture) AND add all members.",
}, async (from, Prince, conText) => {
  const { reply, react, isGroup, isDevs, groupMetadata, participants } = conText;

  if (!isGroup) return reply("❌ Group only command.");
  if (!isDevs)  { await react("❌"); return reply("❌ This command is *owner only*."); }

  await react("⏳");
  await reply("🪞 *FULL CLONE in progress...*\n\nCreating the new group and adding members...");

  try {
    const meta = groupMetadata || (await Prince.groupMetadata(from));
    const botBase = (Prince.user?.id || '').split(':')[0].split('@')[0].replace(/\D/g, '');
    const memberJids = (participants || []).filter(jid => {
      const num = jid.split(':')[0].split('@')[0].replace(/\D/g, '');
      return num !== botBase;
    });

    const newName = `[CLONE] ${meta?.subject || 'Group'}`;
    const newGroup = await Prince.groupCreate(newName, []);

    try { if (meta?.desc) await Prince.groupUpdateDescription(newGroup.id, meta.desc); } catch {}
    try {
      const ppUrl = await Prince.profilePictureUrl(from, "image");
      if (ppUrl) {
        const res = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 15000 });
        await Prince.updateProfilePicture(newGroup.id, Buffer.from(res.data));
      }
    } catch {}

    await Prince.sendMessage(from, {
      text: `✅ New group created!\n📛 Name: ${newName}\n👥 ${memberJids.length} member(s) to add`
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

    let linkLine = "";
    try {
      const code = await Prince.groupInviteCode(newGroup.id);
      linkLine = `\n🔗 Link: https://chat.whatsapp.com/${code}`;
    } catch {}

    await Prince.sendMessage(newGroup.id, {
      text: `🪞 *FULL CLONE complete*\n👥 Added: ${added}/${memberJids.length}\n❌ Failed: ${failed}${linkLine}`
    });
    await Prince.sendMessage(from, {
      text: `✅ *FULL CLONE complete*\n👥 Added: ${added}/${memberJids.length}\n❌ Failed: ${failed}${linkLine}`
    });
    await react("✅");
  } catch (e) {
    await react("❌");
    await reply(`❌ Full clone error: ${e.message}`);
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


// ─── DEVICE : detect the WhatsApp device of the replied user ─────────────────
function detectDevice(id) {
  if (!id) return { label: "❓ Unknown", type: "unknown" };
  // Canonical WhatsApp message-id heuristic (same logic Baileys uses)
  if (id.length > 21) return { label: "🤖 Android", type: "android" };
  if (id.substring(0, 2) === "3A") return { label: "🍎 iOS (iPhone)", type: "ios" };
  if (id.startsWith("3EB0")) return { label: "🌐 WhatsApp Web / Desktop", type: "web" };
  return { label: "🌐 WhatsApp Web / Desktop", type: "web" };
}

gmd({
  pattern: "device",
  aliases: ['appareil', 'whatdevice'],
  react: "📱",
  category: "tools",
  description: "Detect the WhatsApp device of the person you reply to.",
}, async (from, Prince, conText) => {
  const { reply, react, mek, sender, quotedUser } = conText;

  await react("⏳");
  try {
    // The id of the replied message reveals the sender's device.
    const ctx = mek.message?.extendedTextMessage?.contextInfo;
    const repliedId = ctx?.stanzaId || "";

    // Target the replied user when available, otherwise the command sender.
    const targetJid = (quotedUser || sender || "");
    const targetNum = targetJid.split("@")[0];

    if (!repliedId) {
      await react("❌");
      return reply("❌ Reply to someone's message to detect their device.\n\n*Example:* reply to a message with .device");
    }

    const device = detectDevice(repliedId);

    await Prince.sendMessage(
      from,
      {
        text:
          `📱 *DEVICE INFO*\n\n` +
          `👤 *User:* @${targetNum}\n` +
          `📲 *Device:* ${device.label}\n` +
          `🆔 *Message ID:* ${repliedId.substring(0, 10)}...`,
        mentions: [`${targetNum}@s.whatsapp.net`],
        contextInfo: getContextInfo(targetJid, conText.newsletterJid, conText.botName),
      },
      { quoted: mek },
    );
    await react("✅");
  } catch (e) {
    await react("❌");
    await reply(`❌ Error: ${e.message}`);
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


// ─── FANCY : 30+ stylish text fonts (self-contained, interactive + direct) ────
// Build a mapping from contiguous Unicode blocks (no holes). Pass null to keep ASCII.
function genFont(uBase, lBase, dBase) {
  const build = (base, n) =>
    base == null ? null : Array.from({ length: n }, (_, i) => String.fromCodePoint(base + i)).join("");
  return {
    u: build(uBase, 26) || "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    l: build(lBase, 26) || "abcdefghijklmnopqrstuvwxyz",
    d: build(dBase, 10) || "0123456789",
  };
}

const FANCY_FONTS = {
  // Generated (contiguous blocks)
  "Bold":             genFont(0x1D400, 0x1D41A, 0x1D7CE),
  "Bold Italic":      genFont(0x1D468, 0x1D482, null),
  "Sans":             genFont(0x1D5A0, 0x1D5BA, 0x1D7E2),
  "Sans Bold":        genFont(0x1D5D4, 0x1D5EE, 0x1D7EC),
  "Sans Italic":      genFont(0x1D608, 0x1D622, null),
  "Sans Bold Italic": genFont(0x1D63C, 0x1D656, null),
  "Monospace":        genFont(0x1D670, 0x1D68A, 0x1D7F6),
  "Fullwidth":        genFont(0xFF21, 0xFF41, 0xFF10),
  "Bold Fraktur":     genFont(0x1D56C, 0x1D586, null),
  "Circled":          genFont(0x24B6, 0x24D0, null),
  "Negative Circle":  genFont(0x1F150, 0x1F150, null),
  "Squared":          genFont(0x1F130, 0x1F130, null),
  "Negative Square":  genFont(0x1F170, 0x1F170, null),
  "Regional":         genFont(0x1F1E6, 0x1F1E6, null),
  "Parenthesized":    genFont(0x249C, 0x249C, null),
  // Hardcoded (blocks with holes / letterlike substitutes)
  "Italic Serif":     { u: "𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍", l: "𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧", d: "0123456789" },
  "Script":           { u: "𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵", l: "𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏", d: "0123456789" },
  "Bold Script":      { u: "𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩", l: "𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃", d: "0123456789" },
  "Double Struck":    { u: "𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ", l: "𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫", d: "𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡" },
  "Fraktur":          { u: "𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ", l: "𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷", d: "0123456789" },
  "Small Caps":       { u: "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢ", l: "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢ", d: "0123456789" },
  "Upside Down":      { u: "∀ꓭƆᗡƎℲ⅁HIſꓘ⅂WNOԀΌᴚS⊥∩ΛMX⅄Z", l: "ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz", d: "0ƖᄅƐㄣϛ9ㄥ86" },
  // Combining-mark overlays (work on any character)
  "Strikethrough":    { combine: "̶" },
  "Underline":        { combine: "̲" },
  "Double Underline": { combine: "̳" },
  "Overline":         { combine: "̅" },
  "Slashed":          { combine: "̸" },
  "Tilde Through":    { combine: "̴" },
  "Dot Above":        { combine: "̇" },
  "Dot Below":        { combine: "̣" },
  // Function-based
  "Spaced":           { fn: (t) => [...t].join(" ") },
};

function applyFancyFont(text, font) {
  if (font.fn) return font.fn(text);
  if (font.combine) {
    let out = "";
    for (const ch of text) out += ch + font.combine;
    return out;
  }
  const U = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const L = "abcdefghijklmnopqrstuvwxyz";
  const D = "0123456789";
  const upper = [...font.u];
  const lower = [...font.l];
  const digits = [...font.d];
  let out = "";
  for (const ch of text) {
    let idx = U.indexOf(ch);
    if (idx > -1) { out += upper[idx] || ch; continue; }
    idx = L.indexOf(ch);
    if (idx > -1) { out += lower[idx] || ch; continue; }
    idx = D.indexOf(ch);
    if (idx > -1) { out += digits[idx] || ch; continue; }
    out += ch;
  }
  return out;
}

gmd({
  pattern: "fancy",
  aliases: ["stylish", "fancytext", "font"],
  react: "🎨",
  category: "tools",
  description: "Convert text into 30+ stylish fonts. Use .fancy <text> then reply with a number, or .fancy <number> <text> directly.",
}, async (from, Prince, conText) => {
  const { q, reply, react, mek, sender, botName, newsletterJid } = conText;

  if (!q || !q.trim()) {
    await react("❌");
    return reply("❌ Please provide some text.\n\n*Example:* .fancy Hello World\n*Or directly:* .fancy 5 Hello World");
  }

  const fontNames = Object.keys(FANCY_FONTS);
  const sendCtx = (text, quotedM) =>
    Prince.sendMessage(from, { text, contextInfo: getContextInfo(sender, newsletterJid, botName) }, { quoted: quotedM || mek });

  // Direct mode: .fancy <number> <text>
  const parts = q.trim().split(/\s+/);
  const maybeNum = parseInt(parts[0], 10);
  if (!isNaN(maybeNum) && String(maybeNum) === parts[0] && parts.length > 1 && maybeNum >= 1 && maybeNum <= fontNames.length) {
    const input = parts.slice(1).join(" ");
    await sendCtx(applyFancyFont(input, FANCY_FONTS[fontNames[maybeNum - 1]]));
    await react("✅");
    return;
  }

  const input = q.trim();
  let menu = `🎨 *FANCY TEXT STYLES*\n\n📝 *Text:* ${input}\n\nReply with a number, or use *.fancy <number> ${input}* directly:\n\n`;
  fontNames.forEach((name, i) => {
    menu += `*${i + 1}.* ${applyFancyFont(input, FANCY_FONTS[name])}\n`;
  });
  menu += `\n_Reply with a number (1-${fontNames.length}) to get that single style._`;

  const sentMsg = await Prince.sendMessage(
    from,
    { text: menu, contextInfo: getContextInfo(sender, newsletterJid, botName) },
    { quoted: mek },
  );
  await react("✅");

  const handler = async (event) => {
    try {
      const message = event.messages[0];
      if (!message?.message) return;
      if (message.key.remoteJid !== from) return;

      const isReply =
        message.message?.extendedTextMessage?.contextInfo?.stanzaId === sentMsg.key.id;
      if (!isReply) return;

      const choice = (
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        ""
      ).trim();

      const num = parseInt(choice, 10);
      if (isNaN(num) || num < 1 || num > fontNames.length) return;

      Prince.ev.off("messages.upsert", handler);
      const font = FANCY_FONTS[fontNames[num - 1]];
      await sendCtx(applyFancyFont(input, font), message);
    } catch (e) {
      console.error("fancy handler error:", e);
    }
  };

  Prince.ev.on("messages.upsert", handler);
  setTimeout(() => Prince.ev.off("messages.upsert", handler), 120000);
});


// ─── WEBSCAN : basic website recon (status, headers, server, IP, title) ──────
gmd({
  pattern: "webscan",
  aliases: ['sitescan', 'urlinfo', 'scanurl'],
  react: "🔎",
  category: "tools",
  description: "Scan a website: HTTP status, server, headers, IP and page title.",
}, async (from, Prince, conText) => {
  const { q, reply, react, mek, sender, botName, newsletterJid } = conText;
  const dns = require('dns').promises;

  if (!q || !q.trim()) {
    await react("❌");
    return reply("❌ Please provide a URL.\n\n*Example:* .webscan https://example.com");
  }

  let target = q.trim();
  if (!/^https?:\/\//i.test(target)) target = "https://" + target;

  let host;
  try {
    host = new URL(target).hostname;
  } catch {
    await react("❌");
    return reply("❌ Invalid URL.");
  }

  await react("⏳");
  try {
    // Resolve IP address(es)
    let ips = [];
    try {
      const records = await dns.lookup(host, { all: true });
      ips = records.map((r) => r.address);
    } catch (e) {}

    // Fetch the page (follow redirects, accept any status)
    const res = await axios.get(target, {
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      },
      maxContentLength: 8 * 1024 * 1024,
      responseType: "text",
    });

    const h = res.headers || {};
    const body = typeof res.data === "string" ? res.data : "";
    const titleMatch = body.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "N/A";

    const interesting = [
      ["Server", h["server"]],
      ["Powered-By", h["x-powered-by"]],
      ["Content-Type", h["content-type"]],
      ["CDN", h["cf-ray"] ? "Cloudflare" : h["x-cache"] ? "Cache/CDN" : undefined],
      ["Strict-Transport-Security", h["strict-transport-security"] ? "Yes" : "No"],
      ["X-Frame-Options", h["x-frame-options"]],
      ["Content-Security-Policy", h["content-security-policy"] ? "Yes" : "No"],
    ].filter(([, v]) => v !== undefined && v !== null);

    let text = `🔎 *WEBSCAN REPORT*\n\n`;
    text += `🌐 *URL:* ${target}\n`;
    text += `🏷️ *Host:* ${host}\n`;
    text += `📡 *IP:* ${ips.length ? ips.join(", ") : "N/A"}\n`;
    text += `📊 *Status:* ${res.status} ${res.statusText || ""}\n`;
    text += `📄 *Title:* ${title}\n\n`;
    text += `*Headers / Security:*\n`;
    for (const [k, v] of interesting) text += `• *${k}:* ${v}\n`;

    await Prince.sendMessage(
      from,
      { text: text.trim(), contextInfo: getContextInfo(sender, newsletterJid, botName) },
      { quoted: mek },
    );
    await react("✅");
  } catch (e) {
    await react("❌");
    await reply(`❌ Scan failed: ${e.message}`);
  }
});


// ─── SUPPORT : channel + website links ───────────────────────────────────────
gmd({
  pattern: "support",
  aliases: ['contact', 'links', 'official'],
  react: "💖",
  category: "general",
  description: "Get the official channel and website links.",
}, async (from, Prince, conText) => {
  const { reply, react, mek, sender, botName, botFooter, newsletterJid } = conText;
  const cfg = require('../config');

  await react("💖");

  const channel = cfg.NEWSLETTER_URL || "https://whatsapp.com/channel/0029Vark1I1AYlUR1G8YMX31";
  const site = cfg.YT || "youtube.com/@xhrishost";

  const text =
    `💖 *${cfg.BOT_NAME || botName} — OFFICIAL SUPPORT*\n\n` +
    `📢 *Channel:* ${channel}\n` +
    `🌐 *Website / Channel:* ${site}\n` +
    `👤 *Owner:* wa.me/${(cfg.OWNER_NUMBER || "").replace(/\D/g, "")}\n\n` +
    `_Follow the channel for updates and support!_\n\n` +
    `> ${botFooter || cfg.FOOTER || ""}`;

  await Prince.sendMessage(
    from,
    { text, contextInfo: getContextInfo(sender, newsletterJid, botName) },
    { quoted: mek },
  );
  await react("✅");
});


// ─── STALK : GitHub user lookup ──────────────────────────────────────────────
gmd({
  pattern: "githubstalk",
  aliases: ['gitstalk', 'ghstalk'],
  react: "🔍",
  category: "stalk",
  description: "Stalk a GitHub user profile.",
}, async (from, Prince, conText) => {
  const { q, reply, react, mek, sender, botName, newsletterJid } = conText;

  if (!q || !q.trim()) {
    await react("❌");
    return reply("❌ Please provide a GitHub username.\n\n*Example:* .githubstalk torvalds");
  }

  await react("⏳");
  try {
    const user = q.trim().replace(/.*github\.com\//, "").split("/")[0];
    const { data } = await axios.get(`https://api.github.com/users/${encodeURIComponent(user)}`, {
      headers: { "User-Agent": "XHRIS-MD-V2" },
      timeout: 20000,
    });

    const caption =
      `🐙 *GITHUB STALK*\n\n` +
      `👤 *Name:* ${data.name || "N/A"}\n` +
      `🔖 *Username:* ${data.login}\n` +
      `📝 *Bio:* ${data.bio || "N/A"}\n` +
      `📦 *Repos:* ${data.public_repos}\n` +
      `👥 *Followers:* ${data.followers} | *Following:* ${data.following}\n` +
      `🏢 *Company:* ${data.company || "N/A"}\n` +
      `📍 *Location:* ${data.location || "N/A"}\n` +
      `🔗 *Profile:* ${data.html_url}\n` +
      `📅 *Joined:* ${new Date(data.created_at).toLocaleDateString()}`;

    await Prince.sendMessage(
      from,
      {
        image: { url: data.avatar_url },
        caption,
        contextInfo: getContextInfo(sender, newsletterJid, botName),
      },
      { quoted: mek },
    );
    await react("✅");
  } catch (e) {
    await react("❌");
    if (e.response?.status === 404) return reply("❌ GitHub user not found.");
    await reply(`❌ Error: ${e.message}`);
  }
});


// ─── STALK : npm package lookup ──────────────────────────────────────────────
gmd({
  pattern: "npmstalk",
  aliases: ['npmsearch', 'pkgstalk'],
  react: "📦",
  category: "stalk",
  description: "Stalk / look up an npm package.",
}, async (from, Prince, conText) => {
  const { q, reply, react, mek, sender, botName, newsletterJid } = conText;

  if (!q || !q.trim()) {
    await react("❌");
    return reply("❌ Please provide an npm package name.\n\n*Example:* .npmstalk express");
  }

  await react("⏳");
  try {
    const pkg = q.trim().toLowerCase();
    const { data } = await axios.get(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`, {
      timeout: 20000,
    });

    const latest = data["dist-tags"]?.latest;
    const v = data.versions?.[latest] || {};
    const caption =
      `📦 *NPM STALK*\n\n` +
      `🔖 *Name:* ${data.name}\n` +
      `🏷️ *Latest:* ${latest || "N/A"}\n` +
      `📝 *Description:* ${data.description || "N/A"}\n` +
      `👤 *Author:* ${(data.author && (data.author.name || data.author)) || "N/A"}\n` +
      `📜 *License:* ${v.license || data.license || "N/A"}\n` +
      `🏠 *Homepage:* ${data.homepage || "N/A"}\n` +
      `🔗 *npm:* https://www.npmjs.com/package/${data.name}\n` +
      `🏷️ *Keywords:* ${(data.keywords || []).slice(0, 8).join(", ") || "N/A"}`;

    await Prince.sendMessage(
      from,
      { text: caption, contextInfo: getContextInfo(sender, newsletterJid, botName) },
      { quoted: mek },
    );
    await react("✅");
  } catch (e) {
    await react("❌");
    if (e.response?.status === 404) return reply("❌ npm package not found.");
    await reply(`❌ Error: ${e.message}`);
  }
});


// ─── STALK : social-media profile lookups ────────────────────────────────────
const STALK_HOSTS = {
  prince: { base: "https://api.princetechn.com", key: "prince_api_56yjJ568dte4" },
  gifted: { base: "https://api.giftedtech.web.id", key: "gifted" },
};

// Try candidate API endpoints in order; return the first usable result object.
async function stalkFetch(candidates) {
  for (const c of candidates) {
    try {
      const h = STALK_HOSTS[c.host];
      if (!h) continue;
      const url = new URL(h.base + c.path);
      if (h.key) url.searchParams.set("apikey", h.key);
      for (const [k, v] of Object.entries(c.params || {})) {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
      }
      const res = await axios.get(url.toString(), {
        timeout: 25000,
        headers: { "User-Agent": "XHRIS-MD-V2", Accept: "application/json" },
      });
      const d = res.data;
      if (!d || d.success === false || d.status === false || d.error) continue;
      const r = d.result || d.data || d;
      // Skip upstream scraper errors wrapped inside result
      if (!r || typeof r !== "object" || r.status === "error" || r.error) continue;
      if (Object.keys(r).length) return r;
    } catch (e) { /* try next candidate */ }
  }
  return null;
}

// First defined/non-empty value among the given keys
const sg = (o, ...keys) => {
  for (const k of keys) {
    const v = o?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};

// Pretty-print a count
const sNum = (v) =>
  v === null || v === undefined || v === ""
    ? "N/A"
    : typeof v === "number"
      ? v.toLocaleString("en-US")
      : v;

// Find a profile picture URL in an arbitrary result object
function sPic(o) {
  const keys = [
    "profilePic", "profile_pic", "profile_pic_url", "profilePicUrl",
    "profile_image_url", "profile_image", "avatar", "avatarUrl", "avatar_url",
    "image", "picture", "photo", "hd_profile_pic", "thumbnail",
  ];
  for (const k of keys) {
    const v = o?.[k];
    if (typeof v === "string" && /^https?:\/\//.test(v)) return v;
    if (v && typeof v === "object" && typeof v.url === "string") return v.url;
  }
  return null;
}

// Normalise a handle: accepts "@user", "user", or a profile URL
function cleanHandle(q) {
  let s = (q || "").trim();
  s = s.replace(/^https?:\/\//i, "");
  if (s.includes("/")) s = s.split("/").filter(Boolean).pop() || s;
  return s.replace(/^@/, "").split("?")[0].trim();
}

async function sendStalkCard(Prince, from, conText, caption, pic) {
  const { mek, sender, botName, newsletterJid } = conText;
  if (pic) {
    try {
      await Prince.sendMessage(
        from,
        { image: { url: pic }, caption, contextInfo: getContextInfo(sender, newsletterJid, botName) },
        { quoted: mek },
      );
      return;
    } catch (e) { /* fall back to text-only */ }
  }
  await Prince.sendMessage(
    from,
    { text: caption, contextInfo: getContextInfo(sender, newsletterJid, botName) },
    { quoted: mek },
  );
}


// ─── STALK : Instagram ───────────────────────────────────────────────────────
gmd({
  pattern: "igstalk",
  aliases: ["instastalk", "instagramstalk", "stalkig"],
  react: "📸",
  category: "stalk",
  description: "Stalk an Instagram profile.",
}, async (from, Prince, conText) => {
  const { q, reply, react } = conText;
  if (!q || !q.trim()) {
    await react("❌");
    return reply("❌ Provide an Instagram username.\n\n*Example:* .igstalk instagram");
  }
  await react("⏳");
  const user = cleanHandle(q);
  const r = await stalkFetch([
    { host: "prince", path: "/api/stalk/igstalk", params: { username: user } },
    { host: "gifted", path: "/api/stalk/igstalk", params: { username: user } },
    { host: "gifted", path: "/api/stalk/instagram", params: { username: user } },
  ]);
  if (!r) {
    await react("❌");
    return reply(`❌ Couldn't fetch the Instagram profile for *${user}*. The service may be temporarily down or the user doesn't exist.`);
  }
  const uname = sg(r, "username", "user") || user;
  const caption =
    `📸 *INSTAGRAM STALK*\n\n` +
    `👤 *Name:* ${sg(r, "fullname", "full_name", "name", "nickname") || "N/A"}\n` +
    `🔖 *Username:* @${uname}\n` +
    `📝 *Bio:* ${sg(r, "bio", "biography", "description") || "N/A"}\n` +
    `👥 *Followers:* ${sNum(sg(r, "followers", "follower", "followersCount", "edge_followed_by"))}\n` +
    `🔂 *Following:* ${sNum(sg(r, "following", "followingCount", "edge_follow"))}\n` +
    `🖼️ *Posts:* ${sNum(sg(r, "posts", "total_posts", "postsCount", "media_count"))}\n` +
    `✅ *Verified:* ${sg(r, "is_verified", "verified") ? "Yes" : "No"}\n` +
    `🔒 *Private:* ${sg(r, "is_private", "private") ? "Yes" : "No"}\n` +
    `🔗 https://instagram.com/${uname}`;
  await sendStalkCard(Prince, from, conText, caption, sPic(r));
  await react("✅");
});


// ─── STALK : TikTok ──────────────────────────────────────────────────────────
gmd({
  pattern: "tiktokstalk",
  aliases: ["ttstalk", "stalktiktok"],
  react: "🎵",
  category: "stalk",
  description: "Stalk a TikTok profile.",
}, async (from, Prince, conText) => {
  const { q, reply, react } = conText;
  if (!q || !q.trim()) {
    await react("❌");
    return reply("❌ Provide a TikTok username.\n\n*Example:* .tiktokstalk tiktok");
  }
  await react("⏳");
  const user = cleanHandle(q);
  const r = await stalkFetch([
    { host: "prince", path: "/api/stalk/tiktokstalk", params: { username: user } },
    { host: "gifted", path: "/api/stalk/tiktokstalk", params: { username: user } },
  ]);
  if (!r) {
    await react("❌");
    return reply(`❌ Couldn't fetch the TikTok profile for *${user}*.`);
  }
  const uname = sg(r, "username", "user") || user;
  const website = sg(r, "website");
  const websiteStr = website && typeof website === "object" ? sg(website, "link", "url") : website;
  const caption =
    `🎵 *TIKTOK STALK*\n\n` +
    `👤 *Name:* ${sg(r, "name", "nickname", "fullname") || "N/A"}\n` +
    `🔖 *Username:* @${uname}\n` +
    `📝 *Bio:* ${sg(r, "bio", "signature", "description") || "N/A"}\n` +
    `👥 *Followers:* ${sNum(sg(r, "followers", "follower"))}\n` +
    `🔂 *Following:* ${sNum(sg(r, "following"))}\n` +
    `❤️ *Likes:* ${sNum(sg(r, "likes", "hearts", "heart", "like"))}\n` +
    `🎬 *Videos:* ${sNum(sg(r, "videos", "video", "videoCount"))}\n` +
    (websiteStr ? `🌐 *Website:* ${websiteStr}\n` : "") +
    `🔗 https://tiktok.com/@${uname}`;
  await sendStalkCard(Prince, from, conText, caption, sPic(r));
  await react("✅");
});


// ─── STALK : Twitter / X ─────────────────────────────────────────────────────
gmd({
  pattern: "twitterstalk",
  aliases: ["xstalk", "stalktwitter", "stalkx"],
  react: "🐦",
  category: "stalk",
  description: "Stalk a Twitter/X profile.",
}, async (from, Prince, conText) => {
  const { q, reply, react } = conText;
  if (!q || !q.trim()) {
    await react("❌");
    return reply("❌ Provide a Twitter/X username.\n\n*Example:* .twitterstalk elonmusk");
  }
  await react("⏳");
  const user = cleanHandle(q);
  let r = null;
  try {
    const { data } = await axios.get(`https://api.vxtwitter.com/${encodeURIComponent(user)}`, {
      timeout: 20000,
      headers: { "User-Agent": "XHRIS-MD-V2" },
    });
    if (data && !data.error && (data.screen_name || data.name)) r = data;
  } catch (e) { /* handled below */ }
  if (!r) {
    await react("❌");
    return reply(`❌ Couldn't fetch the Twitter/X profile for *${user}*. Check the username and try again.`);
  }
  const uname = r.screen_name || user;
  const pic = (r.profile_image_url || "").replace("_normal", "_400x400") || null;
  const caption =
    `🐦 *TWITTER / X STALK*\n\n` +
    `👤 *Name:* ${r.name || "N/A"}\n` +
    `🔖 *Username:* @${uname}\n` +
    `📝 *Bio:* ${r.description || "N/A"}\n` +
    `👥 *Followers:* ${sNum(r.followers_count)}\n` +
    `🔂 *Following:* ${sNum(r.following_count)}\n` +
    `🐤 *Tweets:* ${sNum(r.tweet_count)}\n` +
    `📍 *Location:* ${r.location || "N/A"}\n` +
    `🔒 *Protected:* ${r.protected ? "Yes" : "No"}\n` +
    `🔗 https://x.com/${uname}`;
  await sendStalkCard(Prince, from, conText, caption, pic);
  await react("✅");
});


// ─── STALK : Facebook ────────────────────────────────────────────────────────
gmd({
  pattern: "fbstalk",
  aliases: ["facebookstalk", "stalkfb"],
  react: "📘",
  category: "stalk",
  description: "Stalk a Facebook profile (public profiles only).",
}, async (from, Prince, conText) => {
  const { q, reply, react } = conText;
  if (!q || !q.trim()) {
    await react("❌");
    return reply("❌ Provide a Facebook profile URL or username.\n\n*Example:* .fbstalk https://facebook.com/zuck");
  }
  await react("⏳");
  const user = cleanHandle(q);
  const isUrl = /facebook\.com|fb\.com/i.test(q);
  const p = isUrl ? { url: q.trim() } : { username: user };
  const r = await stalkFetch([
    { host: "prince", path: "/api/stalk/facebook", params: p },
    { host: "prince", path: "/api/stalk/fbstalk", params: p },
    { host: "gifted", path: "/api/stalk/fbstalk", params: p },
    { host: "gifted", path: "/api/stalk/facebook", params: p },
  ]);
  if (!r) {
    await react("❌");
    return reply("❌ Facebook lookup is currently unavailable (Facebook heavily restricts profile scraping). Try a public profile URL, e.g. .fbstalk https://facebook.com/zuck");
  }
  const uname = sg(r, "username", "user", "id") || user;
  const caption =
    `📘 *FACEBOOK STALK*\n\n` +
    `👤 *Name:* ${sg(r, "name", "fullname", "full_name") || "N/A"}\n` +
    `🔖 *Username/ID:* ${uname}\n` +
    `📝 *Bio:* ${sg(r, "bio", "about", "description") || "N/A"}\n` +
    `👥 *Followers:* ${sNum(sg(r, "followers", "follower"))}\n` +
    `👫 *Friends:* ${sNum(sg(r, "friends", "friendsCount"))}\n` +
    (sg(r, "work") ? `💼 *Work:* ${sg(r, "work")}\n` : "") +
    (sg(r, "location", "city") ? `📍 *Location:* ${sg(r, "location", "city")}\n` : "") +
    (sg(r, "url", "link", "profile") ? `🔗 ${sg(r, "url", "link", "profile")}` : "");
  await sendStalkCard(Prince, from, conText, caption, sPic(r));
  await react("✅");
});


// ─── STALK : LinkedIn ────────────────────────────────────────────────────────
gmd({
  pattern: "linkedinstalk",
  aliases: ["linkedin", "stalklinkedin"],
  react: "💼",
  category: "stalk",
  description: "Stalk a LinkedIn profile (public profiles only).",
}, async (from, Prince, conText) => {
  const { q, reply, react } = conText;
  if (!q || !q.trim()) {
    await react("❌");
    return reply("❌ Provide a LinkedIn profile URL or username.\n\n*Example:* .linkedinstalk https://linkedin.com/in/williamhgates");
  }
  await react("⏳");
  const user = cleanHandle(q);
  const isUrl = /linkedin\.com/i.test(q);
  const p = isUrl ? { url: q.trim() } : { username: user };
  const r = await stalkFetch([
    { host: "prince", path: "/api/stalk/linkedin", params: p },
    { host: "prince", path: "/api/stalk/linkedinstalk", params: p },
    { host: "gifted", path: "/api/stalk/linkedin", params: p },
    { host: "gifted", path: "/api/stalk/linkedinstalk", params: p },
  ]);
  if (!r) {
    await react("❌");
    return reply("❌ LinkedIn lookup is currently unavailable (LinkedIn blocks profile scraping). Try a full profile URL, e.g. .linkedinstalk https://linkedin.com/in/williamhgates");
  }
  const caption =
    `💼 *LINKEDIN STALK*\n\n` +
    `👤 *Name:* ${sg(r, "name", "fullname", "full_name") || "N/A"}\n` +
    `🏷️ *Headline:* ${sg(r, "headline", "title", "occupation") || "N/A"}\n` +
    `📝 *About:* ${sg(r, "about", "summary", "bio", "description") || "N/A"}\n` +
    `🏢 *Company:* ${sg(r, "company", "companyName") || "N/A"}\n` +
    `📍 *Location:* ${sg(r, "location", "geo", "country") || "N/A"}\n` +
    `👥 *Connections:* ${sNum(sg(r, "connections", "followers"))}\n` +
    (sg(r, "url", "link", "profile") ? `🔗 ${sg(r, "url", "link", "profile")}` : "");
  await sendStalkCard(Prince, from, conText, caption, sPic(r));
  await react("✅");
});
