/**
 * XHRIS MD V2 — Commandes personnalisées
 * xhriskill, takeover, kickall, kickall2, clone, country, device, webcam, fetch
 */

const { gmd, getContextInfo } = require("../mayel");
const axios = require('axios');
const fs = require('fs');
const path = require('path');


// ─── XHRISKILL : mute + rename + photo + desc + demote all + kick all ────────
gmd({
  pattern: "xhriskill",
  aliases: ['xkill'],
  react: "☠️",
  category: "group",
  description: "Opération XHRIS KILL : mute + rename + photo + demote all + kick all",
}, async (from, Prince, conText) => {
  const { mek, reply, react, isGroup, isSuperUser, groupMetadata, participants } = conText;

  if (!isGroup) return reply("❌ Groupe uniquement.");
  if (!isSuperUser) return reply("❌ Réservé au propriétaire.");

  await react("☠️");
  await reply(`☠️ *XHRIS KILL en cours...*\n\nÉtape 1/6 : Initialisation`);

  const botBase = (Prince.user?.id || '').split(':')[0].split('@')[0].replace(/\D/g, '');
  const botLid = (Prince.user?.lid || '').split(':')[0].split('@')[0].replace(/\D/g, '');
  const ownerBase = '237694600007';

  function isProtected(participantId) {
    const pBase = participantId.split(':')[0].split('@')[0].replace(/\D/g, '');
    return pBase === botBase || pBase === botLid || pBase === ownerBase;
  }

  // 1. Mute le groupe
  try { await Prince.groupSettingUpdate(from, 'announcement'); } catch {}

  // 2. Renommer le groupe
  try { await Prince.groupUpdateSubject(from, '☠️ XHRIS DIOR KILL YOU 😂'); } catch {}

  // 3. Photo de profil
  try {
    const config = require('../config');
    if (config.BOT_PIC) {
      const res = await axios.get(config.BOT_PIC, { responseType: 'arraybuffer' });
      await Prince.updateProfilePicture(from, Buffer.from(res.data));
    }
  } catch {}

  // 4. Changer description
  try { await Prince.groupUpdateDescription(from, 'XHRIS était là'); } catch {}

  // 5. Démettre tous les admins sauf bot/owner
  const admins = participants.filter(p => p.admin && !isProtected(p.id));
  let demoted = 0;
  for (const a of admins) {
    try {
      await Prince.groupParticipantsUpdate(from, [a.id], 'demote');
      demoted++;
      await new Promise(r => setTimeout(r, 400));
    } catch {}
  }

  // Re-fetch après les demotions pour avoir la liste à jour
  let freshParts = participants;
  try {
    const freshMeta = await Prince.groupMetadata(from);
    freshParts = freshMeta.participants;
  } catch {}

  // 6. Expulser tout le monde sauf bot/owner (liste fraîche)
  const toKick = freshParts.filter(p => !isProtected(p.id));
  let kicked = 0, failed = 0;
  for (const p of toKick) {
    try {
      await Prince.groupParticipantsUpdate(from, [p.id], 'remove');
      kicked++;
      await new Promise(r => setTimeout(r, 800));
    } catch { failed++; }
  }

  await Prince.sendMessage(from, {
    text: `✅ *XHRIS KILL terminé !*\n\n🔒 Groupe muté\n📛 Nom : XHRIS DIOR KILL YOU 😂\n📝 Desc : XHRIS était là\n⬇️ ${demoted} admin(s) démis\n👥 *${kicked}/${toKick.length}* membres expulsés\n❌ ${failed} échec(s)`
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
  const { reply, react, isGroup, isSuperUser, participants } = conText;

  if (!isGroup) return reply("❌ Groupe uniquement.");
  if (!isSuperUser) return reply("❌ Réservé au propriétaire.");

  await react("⏳");

  const botBase = (Prince.user?.id || '').split(':')[0].split('@')[0].replace(/\D/g, '');
  const botLid = (Prince.user?.lid || '').split(':')[0].split('@')[0].replace(/\D/g, '');
  const ownerBase = '237694600007';

  function isProtected(id) {
    const pBase = id.split(':')[0].split('@')[0].replace(/\D/g, '');
    return pBase === botBase || pBase === botLid || pBase === ownerBase;
  }

  const admins = participants.filter(p => p.admin && !isProtected(p.id));
  let demoted = 0;

  for (const a of admins) {
    try {
      await Prince.groupParticipantsUpdate(from, [a.id], 'demote');
      demoted++;
      await new Promise(r => setTimeout(r, 400));
    } catch {}
  }

  await reply(`✅ *TAKEOVER terminé*\n⬇️ ${demoted} admin(s) démis`);
  await react("✅");
});


// ─── KICKALL : expulse tout sauf bot et owner ─────────────────────────────────
gmd({
  pattern: "kickall",
  react: "💥",
  category: "group",
  description: "Expulse tous les membres sauf bot et owner",
}, async (from, Prince, conText) => {
  const { reply, react, isGroup, isSuperUser, participants } = conText;

  if (!isGroup) return reply("❌ Groupe uniquement.");
  if (!isSuperUser) return reply("❌ Réservé au propriétaire.");

  await react("⏳");

  const botBase = (Prince.user?.id || '').split(':')[0].split('@')[0].replace(/\D/g, '');
  const botLid = (Prince.user?.lid || '').split(':')[0].split('@')[0].replace(/\D/g, '');
  const ownerBase = '237694600007';

  function isProtected(id) {
    const pBase = id.split(':')[0].split('@')[0].replace(/\D/g, '');
    return pBase === botBase || pBase === botLid || pBase === ownerBase;
  }

  const toKick = participants.filter(p => !isProtected(p.id));
  let kicked = 0, failed = 0;

  for (const p of toKick) {
    try {
      await Prince.groupParticipantsUpdate(from, [p.id], 'remove');
      kicked++;
      await new Promise(r => setTimeout(r, 800));
    } catch { failed++; }
  }

  await reply(`✅ *KICKALL terminé*\n👥 ${kicked}/${toKick.length} expulsés\n❌ ${failed} échec(s)`);
  await react("✅");
});


// ─── KICKALL2 : demote admins + kick par préfixe de numéro ──────────────────
gmd({
  pattern: "kickall2",
  react: "💥",
  category: "group",
  description: "Démote puis expulse les membres dont le numéro commence par X (ex: .kickall2 234)",
}, async (from, Prince, conText) => {
  const { reply, react, isGroup, isSuperUser, q } = conText;

  if (!isGroup) return reply("❌ Groupe uniquement.");
  if (!isSuperUser) return reply("❌ Réservé au propriétaire.");
  if (!q) return reply("❌ Donne un préfixe.\nExemple : .kickall2 234 (expulse tous les +234)");

  const prefix = q.trim().replace(/\D/g, '');
  if (!prefix) return reply("❌ Préfixe invalide.");

  await react("⏳");

  const botBase = (Prince.user?.id || '').split(':')[0].split('@')[0].replace(/\D/g, '');
  const botLid  = (Prince.user?.lid  || '').split(':')[0].split('@')[0].replace(/\D/g, '');
  const ownerBase = '237694600007';

  function isProtected(participantId) {
    const pBase = participantId.split(':')[0].split('@')[0].replace(/\D/g, '');
    return pBase === botBase || pBase === botLid || pBase === ownerBase;
  }

  function matchesPrefix(participantId) {
    const num = participantId.split(':')[0].split('@')[0].replace(/\D/g, '');
    return num.startsWith(prefix);
  }

  // Récupérer la liste fraîche des participants
  let meta;
  try {
    meta = await Prince.groupMetadata(from);
  } catch {
    return reply("❌ Impossible de récupérer les infos du groupe.");
  }
  let parts = meta.participants;

  // Cibles = correspondent au préfixe ET pas protégées
  const targets = parts.filter(p => matchesPrefix(p.id) && !isProtected(p.id));
  if (targets.length === 0) return reply(`❌ Aucun membre avec le préfixe +${prefix}.`);

  await reply(`⏳ *KICKALL2 en cours...*\n\nPréfixe : +${prefix}\n👥 Cibles trouvées : ${targets.length}`);

  // Étape 1 : Démettre les admins qui correspondent au préfixe (sauf bot/owner)
  const adminsToDowngrade = targets.filter(p => p.admin);
  let demoted = 0;
  for (const a of adminsToDowngrade) {
    try {
      await Prince.groupParticipantsUpdate(from, [a.id], 'demote');
      demoted++;
      await new Promise(r => setTimeout(r, 400));
    } catch {}
  }

  // Étape 2 : Re-fetch pour liste à jour après démotions
  try {
    meta = await Prince.groupMetadata(from);
    parts = meta.participants;
  } catch {}

  // Étape 3 : Expulser toutes les cibles (liste fraîche, protection garantie)
  const toKick = parts.filter(p => matchesPrefix(p.id) && !isProtected(p.id));
  let kicked = 0, failed = 0;
  for (const p of toKick) {
    try {
      await Prince.groupParticipantsUpdate(from, [p.id], 'remove');
      kicked++;
      await new Promise(r => setTimeout(r, 800));
    } catch { failed++; }
  }

  await reply(`✅ *KICKALL2 terminé !*\n\n📞 Préfixe : +${prefix}\n⬇️ ${demoted} admin(s) démis\n👥 ${kicked}/${toKick.length} membres expulsés\n❌ ${failed} échec(s)`);
  await react("✅");
});


// ─── CLONE : duplique le groupe actuel ───────────────────────────────────────
gmd({
  pattern: "clone",
  react: "🪞",
  category: "group",
  description: "Clone le groupe actuel (créer un nouveau groupe avec les mêmes membres)",
}, async (from, Prince, conText) => {
  const { reply, react, isGroup, isSuperUser, groupMetadata, participants } = conText;

  if (!isGroup) return reply("❌ Groupe uniquement.");
  if (!isSuperUser) return reply("❌ Réservé au propriétaire.");

  await react("⏳");
  await reply("🪞 *CLONE en cours...*\n\nCréation du nouveau groupe...");

  try {
    const botId = (Prince.user?.id || '').split(':')[0];
    const memberJids = participants.map(p => p.id).filter(id => !id.includes(botId));

    const newGroup = await Prince.groupCreate(`[CLONE] ${groupMetadata.subject}`, []);

    await Prince.sendMessage(from, {
      text: `✅ Nouveau groupe créé !\n\n📛 Nom : [CLONE] ${groupMetadata.subject}\n👥 ${memberJids.length} membres à ajouter\n\n⏳ Ajout en cours...`
    });

    let added = 0, failed = 0;
    for (let i = 0; i < memberJids.length; i += 5) {
      const batch = memberJids.slice(i, i + 5);
      try {
        const res = await Prince.groupParticipantsUpdate(newGroup.id, batch, 'add');
        added += res?.filter(r => r.status === '200' || r.status === 200).length || 0;
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
  const { q, reply, react, mek } = conText;

  if (!q) return reply("❌ Donne un numéro.\nExemple : .country +237694600007");

  await react("⏳");

  try {
    const num = q.replace(/[^0-9]/g, '');
    const res = await axios.get(`https://restcountries.com/v3.1/all?fields=name,idd,flag,cca2,capital,region,population,languages`, { timeout: 15000 });
    const countries = res.data;

    let match = null;
    for (const c of countries) {
      if (c.idd?.root) {
        const codes = (c.idd.suffixes || ['']).map(s => (c.idd.root + s).replace('+', ''));
        for (const code of codes) {
          if (num.startsWith(code)) {
            if (!match || code.length > match.code.length) {
              match = { country: c, code };
            }
          }
        }
      }
    }

    if (!match) {
      await react("❌");
      return reply(`❌ Pays non trouvé pour +${num}`);
    }

    const c = match.country;
    const text = `🌍 *PAYS DU NUMÉRO*\n\n📱 Numéro : +${num}\n🏴 Code : +${match.code}\n${c.flag} Pays : ${c.name.common}\n🏙️ Capitale : ${c.capital?.[0] || 'N/A'}\n🌐 Région : ${c.region}\n👥 Population : ${c.population?.toLocaleString() || 'N/A'}\n🗣️ Langues : ${Object.values(c.languages || {}).join(', ') || 'N/A'}`;

    await reply(text);
    await react("✅");
  } catch (e) {
    await react("❌");
    await reply(`❌ Erreur : ${e.message}`);
  }
});


// ─── DEVICE : info sur l'appareil du sender ──────────────────────────────────
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
    const targetKey = quotedMsg?.key || mek.key;
    const msgId = targetKey.id || '';

    let device = 'Inconnu';
    if (msgId.startsWith('3EB0')) device = '📱 WhatsApp (iOS/Android)';
    else if (msgId.startsWith('3A')) device = '🍎 WhatsApp iOS';
    else if (msgId.startsWith('B')) device = '💻 WhatsApp Business';
    else if (msgId.length === 16 && /^[A-F0-9]+$/.test(msgId)) device = '🤖 Android';
    else if (msgId.startsWith('NS-')) device = '🌐 WhatsApp Web';
    else device = `📡 Autre (ID: ${msgId.substring(0, 4)}...)`;

    const text = `📱 *DEVICE INFO*\n\n👤 Sender : ${sender.split('@')[0]}\n📲 Appareil : ${device}\n🆔 Message ID prefix : ${msgId.substring(0, 8)}`;

    await reply(text);
    await react("✅");
  } catch (e) {
    await react("❌");
    await reply(`❌ Erreur : ${e.message}`);
  }
});


// ─── WEBCAM : screenshot d'une webcam publique random ────────────────────────
gmd({
  pattern: "webcam",
  aliases: ['cam'],
  react: "📹",
  category: "fun",
  description: "Photo random d'une webcam publique",
}, async (from, Prince, conText) => {
  const { reply, react, mek, botFooter } = conText;

  await react("⏳");

  try {
    const res = await axios.get(`https://api.giftedtech.web.id/api/fun/webcam?apikey=gifted`, {
      responseType: 'arraybuffer',
      timeout: 30000,
      validateStatus: () => true
    });

    const contentType = res.headers['content-type'] || '';
    if (!contentType.includes('image/')) {
      await react("❌");
      return reply("❌ API webcam indisponible. Réessaie plus tard.");
    }

    await Prince.sendMessage(from, {
      image: Buffer.from(res.data),
      caption: `📹 *Webcam aléatoire*\n\n> *${botFooter}*`
    }, { quoted: mek });

    await react("✅");
  } catch (e) {
    await react("❌");
    await reply(`❌ Erreur : ${e.message}`);
  }
});


// ─── FETCH : récupère un fichier depuis une URL ───────────────────────────────
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
      responseType: 'arraybuffer',
      timeout: 60000,
      validateStatus: () => true,
      maxContentLength: 50 * 1024 * 1024
    });

    const contentType = res.headers['content-type'] || 'application/octet-stream';
    const buffer = Buffer.from(res.data);
    const filename = url.split('/').pop().split('?')[0] || 'file';

    if (contentType.startsWith('image/')) {
      await Prince.sendMessage(from, { image: buffer, caption: `📥 ${url}` }, { quoted: mek });
    } else if (contentType.startsWith('video/')) {
      await Prince.sendMessage(from, { video: buffer, caption: `📥 ${url}` }, { quoted: mek });
    } else if (contentType.startsWith('audio/')) {
      await Prince.sendMessage(from, { audio: buffer, mimetype: contentType }, { quoted: mek });
    } else {
      await Prince.sendMessage(from, {
        document: buffer,
        mimetype: contentType,
        fileName: filename
      }, { quoted: mek });
    }

    await react("✅");
  } catch (e) {
    await react("❌");
    await reply(`❌ Erreur : ${e.message}`);
  }
});
