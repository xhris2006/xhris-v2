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
  const { mek, reply, react, isGroup, isSuperUser, participants, groupAdmins, isBotAdmin } = conText;

  if (!isGroup)    return reply("❌ Groupe uniquement.");
  if (!isSuperUser) return reply("❌ Réservé au propriétaire.");
  if (!isBotAdmin)  return reply("❌ Le bot doit être admin pour cette commande.");

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
  const { reply, react, isGroup, isSuperUser, groupAdmins, isBotAdmin } = conText;

  if (!isGroup)    return reply("❌ Groupe uniquement.");
  if (!isSuperUser) return reply("❌ Réservé au propriétaire.");
  if (!isBotAdmin)  return reply("❌ Le bot doit être admin.");

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
  const { reply, react, isGroup, isSuperUser, participants, isBotAdmin } = conText;

  if (!isGroup)    return reply("❌ Groupe uniquement.");
  if (!isSuperUser) return reply("❌ Réservé au propriétaire.");
  if (!isBotAdmin)  return reply("❌ Le bot doit être admin.");

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
  const { reply, react, isGroup, isSuperUser, participants, q, isBotAdmin } = conText;

  if (!isGroup)    return reply("❌ Groupe uniquement.");
  if (!isSuperUser) return reply("❌ Réservé au propriétaire.");
  if (!isBotAdmin)  return reply("❌ Le bot doit être admin.");
  if (!q)           return reply("❌ Donne un préfixe.\nExemple : .kickall2 234 (expulse tous les +234)");

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
  const { reply, react, isGroup, isSuperUser, groupMetadata, participants } = conText;

  if (!isGroup)    return reply("❌ Groupe uniquement.");
  if (!isSuperUser) return reply("❌ Réservé au propriétaire.");

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


// ─── URL : upload un media et retourne l'URL CDN ─────────────────────────────
gmd({
  pattern: "url",
  aliases: ['tourl', 'upload', 'cdn'],
  react: "🔗",
  category: "tools",
  description: "Convertit un media (image/video/audio) en URL hébergée via Catbox",
}, async (from, Prince, conText) => {
  const { reply, react, mek, quoted, quotedMsg, getMediaBuffer } = conText;

  if (!quotedMsg) {
    await react("❌");
    return reply("❌ Réponds à un fichier (image/video/audio/document)");
  }

  await react("⏳");
  try {
    let mediaType, mediaMessage;
    if      (quoted.imageMessage)    { mediaType = 'image';    mediaMessage = quoted.imageMessage; }
    else if (quoted.videoMessage)    { mediaType = 'video';    mediaMessage = quoted.videoMessage; }
    else if (quoted.audioMessage)    { mediaType = 'audio';    mediaMessage = quoted.audioMessage; }
    else if (quoted.documentMessage) { mediaType = 'document'; mediaMessage = quoted.documentMessage; }
    else if (quoted.stickerMessage)  { mediaType = 'sticker';  mediaMessage = quoted.stickerMessage; }
    else { await react("❌"); return reply("❌ Format non supporté."); }

    const buffer = await getMediaBuffer(mediaMessage, mediaType);
    if (!buffer) { await react("❌"); return reply("❌ Échec téléchargement du fichier."); }

    const extMap = { image: 'jpg', video: 'mp4', audio: 'mp3', document: 'bin', sticker: 'webp' };
    const FormData = require('form-data');
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, `file_${Date.now()}.${extMap[mediaType] || 'bin'}`);

    const uploadRes = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(),
      timeout: 60000,
      maxContentLength: 200 * 1024 * 1024,
      maxBodyLength:    200 * 1024 * 1024
    });

    const fileUrl = String(uploadRes.data).trim();
    if (!fileUrl.startsWith('http')) {
      await react("❌");
      return reply(`❌ Upload échoué : ${fileUrl.substring(0, 200)}`);
    }

    await reply(`✅ *Fichier uploadé !*\n\n🔗 ${fileUrl}\n📦 Type : ${mediaType}\n💾 Taille : ${(buffer.length / 1024).toFixed(2)} KB`);
    await react("✅");
  } catch (e) {
    await react("❌");
    await reply(`❌ Erreur : ${e.message}`);
  }
});


// ─── SETCMD : créer une commande custom ──────────────────────────────────────
gmd({
  pattern: "setcmd",
  aliases: ['addcmd', 'newcmd'],
  react: "➕",
  category: "owner",
  description: "Créer une commande custom (.setcmd nom = réponse)",
}, async (from, Prince, conText) => {
  const { q, reply, react, isSuperUser } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");
  if (!q || !q.includes('=')) return reply("❌ Usage: .setcmd <nom> = <réponse>\nExemple: .setcmd salut = Bonjour à tous !");

  const [namePart, ...responseParts] = q.split('=');
  const name     = namePart.trim().toLowerCase();
  const response = responseParts.join('=').trim();

  if (!name || !response)   return reply("❌ Format invalide.");
  if (name.length > 20)     return reply("❌ Nom trop long (max 20 caractères).");

  try {
    const customCmdsPath = path.join(__dirname, '..', 'data', 'custom-cmds.json');
    const dataDir = path.dirname(customCmdsPath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    let cmds = {};
    if (fs.existsSync(customCmdsPath)) cmds = JSON.parse(fs.readFileSync(customCmdsPath, 'utf8'));
    cmds[name] = response;
    fs.writeFileSync(customCmdsPath, JSON.stringify(cmds, null, 2));

    await react("✅");
    await reply(`✅ Commande *.${name}* créée !\n\n📝 Réponse: ${response}\n\nTape *.${name}* pour la tester.`);
  } catch (e) {
    await react("❌");
    await reply(`❌ Erreur : ${e.message}`);
  }
});


// ─── DELCMD : supprimer une commande custom ──────────────────────────────────
gmd({
  pattern: "delcmd",
  aliases: ['removecmd', 'rmcmd'],
  react: "🗑️",
  category: "owner",
  description: "Supprimer une commande custom",
}, async (from, Prince, conText) => {
  const { q, reply, react, isSuperUser } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");
  if (!q)           return reply("❌ Usage: .delcmd <nom>\nExemple: .delcmd salut");

  const name = q.trim().toLowerCase();
  try {
    const customCmdsPath = path.join(__dirname, '..', 'data', 'custom-cmds.json');
    if (!fs.existsSync(customCmdsPath)) return reply("❌ Aucune commande custom enregistrée.");

    const cmds = JSON.parse(fs.readFileSync(customCmdsPath, 'utf8'));
    if (!cmds[name]) return reply(`❌ Commande *.${name}* introuvable.`);
    delete cmds[name];
    fs.writeFileSync(customCmdsPath, JSON.stringify(cmds, null, 2));

    await react("✅");
    await reply(`✅ Commande *.${name}* supprimée.`);
  } catch (e) {
    await react("❌");
    await reply(`❌ Erreur : ${e.message}`);
  }
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
