const { gmd, commands, config, getContextInfo, uploadToImgBB } = require("../mayel");
const fs = require("fs");
const fsA = require('node:fs');
const { S_WHATSAPP_NET } = require("prince-baileys");
const Jimp = require("jimp");
const path = require("path");
const { exec, spawn } = require('node:child_process');
const moment = require('moment-timezone');

gmd({
  pattern: "channelid",
  aliases: ["getchannelid", "chid"],
  category: "owner",
  react: "📡",
  description: "Get WhatsApp channel JID from invite link",
}, async (from, Prince, conText) => {
  const { q, mek, reply, react, sender, botName, botFooter, newsletterJid } = conText;

  try {
    if (!q) {
      await react("❌");
      return reply("Please provide a channel invite link.\n\nUsage: .channelid <channel-link>");
    }

    const channelId = q.split("/").pop();
    if (!channelId) {
      await react("❌");
      return reply("Invalid channel link. Please provide a valid WhatsApp channel invite link.");
    }

    const res = await Prince.newsletterMetadata("invite", channelId);
    if (!res?.id) {
      await react("❌");
      return reply("Failed to fetch channel JID. Please check the link and try again.");
    }

    await Prince.sendMessage(from, {
      text: `📡 *Channel JID:*\n\n${res.id}`,
      contextInfo: getContextInfo(sender, newsletterJid, botName),
    }, { quoted: mek });
    await react("✅");
  } catch (e) {
    console.error("❌ Error fetching channel JID:", e);
    await react("❌");
    return reply("An error occurred while fetching the channel JID. Please try again.");
  }
});

gmd({
  pattern: "restart",
  aliases: ["reboot", "restartnow"],
  category: "owner",
  react: "🔄",
  description: "Restart the bot process.",
}, async (from, Prince, conText) => {
  const { reply, isSuperUser, sender, newsletterJid, botName, mek } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  await Prince.sendMessage(from, {
    text: "🔄 *Restarting bot...*\n\n_Please wait a few seconds..._",
    contextInfo: getContextInfo(sender, newsletterJid, botName),
  }, { quoted: mek });

  setTimeout(() => {
    process.exit(0);
  }, 1500);
});

function saveConfig() {
}

/*
gmd({
  pattern: "anticall",
  alias: ["setanticall"],
  desc: "Enable or Disable Anticall",
  category: "owner",
  react: "📵",
  filename: __filename
}, async (from, Prince, conText) => {
  const { reply, q, m, mek, isSuperUser, BOT_PIC, BOT_NAME } = conText;

  if (!isSuperUser) return reply("*Owner Only Command*");

  const infoMess = {
    image: { url: BOT_PIC },
    caption: `> *${BOT_NAME} 𝐀𝐍𝐓𝐈𝐂𝐀𝐋𝐋 𝐒𝐄𝐓𝐓𝐈𝐍𝐆𝐒*  

Reply With:

*1.* To Decline Calls  
*2.* To Decline & Block Callers  
*3.* To Disable Anticall  

╭────────────────◆  
│ ${config.FOOTER}
╰─────────────────◆`,
    contextInfo: {
      mentionedJid: [m.sender],
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: config.NEWSLETTER_JID,
        newsletterName: config.BOT_NAME || "PRINCE-SYSTEM",
        serverMessageId: 100
      }
    }
  };

  const messageSent = await Prince.sendMessage(from, infoMess);
  const messageId = messageSent.key.id;

  Prince.ev.on("messages.upsert", async (event) => {
    const messageData = event.messages[0];
    if (!messageData.message) return;

    const messageContent =
      messageData.message.conversation ||
      messageData.message.extendedTextMessage?.text;

    const isReplyToPrompt =
      messageData.message.extendedTextMessage?.contextInfo?.stanzaId === messageId;

    if (isReplyToPrompt) {
      await m.react("⬇🤖");
      switch (messageContent.trim()) {
        case "1":
          config.ANTICALL = "true";
          saveConfig();
          return reply("✅ Anticall enabled! Calls will be declined.");

        case "2":
          config.ANTICALL = "block";
          saveConfig();
          return reply("✅ Anticall enabled! Calls will be declined & callers blocked.");

        case "3":
          config.ANTICALL = "false";
          saveConfig();
          return reply("🚫 Anticall has been disabled!");

        default:
          await Prince.sendMessage(from, {
            text: "⚠️ Invalid option! Reply with 1, 2, or 3."
          });
      }
    }
  });

  await m.react("✅");
});
*/

/*
gmd({
  pattern: "anticall",
  alias: ["setanticall"],
  desc: "Enable or Disable Anticall",
  category: "settings",
  react: "📵",
  filename: __filename
}, async (from, Prince, conText) => {
  const { reply, BOT_PIC, BOT_NAME, isSuperUser, sender, mek, m } = conText;

  if (!isSuperUser) return reply("❌ This command is only for *SuperUsers*.");

  const infoMess = {
    image: { url: BOT_PIC },
    caption: `> *${BOT_NAME} 𝐀𝐍𝐓𝐈𝐂𝐀𝐋𝐋 𝐒𝐄𝐓𝐓𝐈𝐍𝐆𝐒*  

Reply With:

*1.* To Decline Calls  
*2.* To Decline & Block Callers  
*3.* To Disable Anticall  

╭────────────────◆  
│ ${config.FOOTER}
╰─────────────────◆`,
    contextInfo: {
      mentionedJid: [sender],
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: config.NEWSLETTER_JID,
        newsletterName: config.BOT_NAME || "PRINCE-SYSTEM",
        serverMessageId: 100
      }
    }
  };

  const messageSent = await Prince.sendMessage(from, infoMess, { quoted: mek });
  const messageId = messageSent.key.id;

  const handleResponse = async (event) => {
    const messageData = event.messages[0];
    if (!messageData.message) return;

    const messageContent =
      messageData.message.conversation ||
      messageData.message.extendedTextMessage?.text;

    const isReplyToPrompt =
      messageData.message.extendedTextMessage?.contextInfo?.stanzaId === messageId;

    if (isReplyToPrompt) {
      await Prince.sendMessage(from, { react: { text: "⬇🤖", key: messageData.key } });

      switch (messageContent.trim()) {
        case "1":
          config.ANTICALL = "true";
          saveConfig();
          return reply("✅ Anticall enabled! Calls will be declined.");

        case "2":
          config.ANTICALL = "block";
          saveConfig();
          return reply("✅ Anticall enabled! Calls will be declined & callers blocked.");

        case "3":
          config.ANTICALL = "false";
          saveConfig();
          return reply("🚫 Anticall has been disabled!");

        default:
          await Prince.sendMessage(from, {
            text: "⚠️ Invalid option! Reply with 1, 2, or 3."
          }, { quoted: messageData });
      }
    }
  };

  Prince.ev.on("messages.upsert", handleResponse);

  await Prince.sendMessage(from, { react: { text: "✅", key: mek.key } });
});
*/


gmd({
  pattern: "anticall",
  aliases: ["setanticall"],
  category: "owner",
  react: "📵",
  description: "Enable/Disable the Anti-Call feature (on/off/block).",
}, async (from, Prince, conText) => {
  const { isSuperUser, reply, react, q, from: chatId, mek, sender, newsletterJid, botName, getSetting, setSetting } = conText;

  if (!isSuperUser) return reply("❌ *Owner Only Command*");

  const current = String(getSetting("ANTICALL", config.ANTICALL || "false")).toLowerCase();
  const input = (q || "").trim().toLowerCase();

  const applyMode = async (mode) => {
    setSetting("ANTICALL", mode);
    await react("✅");
    if (mode === "false")
      return reply("❎ *Anticall disabled.* The bot will no longer reject incoming calls.");
    if (mode === "block")
      return reply("✅ *Anticall enabled.* Incoming calls will be declined and the caller blocked.");
    return reply("✅ *Anticall enabled.* Incoming calls will be declined automatically.");
  };

  // Direct usage: .anticall on/off/decline/block
  if (["on", "true", "decline", "1"].includes(input)) return applyMode("decline");
  if (["off", "false", "disable", "no", "3"].includes(input)) return applyMode("false");
  if (["block", "2"].includes(input)) return applyMode("block");

  // Interactive menu
  const imageUrl = config.BOT_PIC && config.BOT_PIC !== ""
    ? config.BOT_PIC
    : "https://i.ibb.co/8KzX3M3/botlogo.jpg";

  const statusText =
    current === "false"
      ? "❌ Off"
      : current === "block"
        ? "✅ Decline & Block"
        : "✅ Decline";

  const infoMess = {
    image: { url: imageUrl },
    caption: `*${config.BOT_NAME} ANTICALL SETTINGS*

📊 Current status: *${statusText}*

Reply With:

*1.* Decline Calls
*2.* Decline & Block Callers
*3.* Disable Anticall

_Or use directly:_
*.anticall on/off/block*

╭────────────────◆
│ ${config.FOOTER}
╰─────────────────◆`,
    contextInfo: getContextInfo(sender, newsletterJid, botName),
  };

  const sentMsg = await Prince.sendMessage(chatId, infoMess, { quoted: mek });
  const messageId = sentMsg.key.id;

  const handler = async (event) => {
    const messageData = event.messages[0];
    if (!messageData?.message) return;
    if (messageData.key.remoteJid !== chatId) return;

    const isReply =
      messageData.message.extendedTextMessage?.contextInfo?.stanzaId === messageId;
    if (!isReply) return;

    const choice = (
      messageData.message.conversation ||
      messageData.message.extendedTextMessage?.text ||
      ""
    ).trim();

    let mode = "";
    if (choice === "1") mode = "decline";
    else if (choice === "2") mode = "block";
    else if (choice === "3") mode = "false";

    if (mode) {
      Prince.ev.off("messages.upsert", handler);
      await applyMode(mode);
    }
  };

  Prince.ev.on("messages.upsert", handler);
  setTimeout(() => Prince.ev.off("messages.upsert", handler), 60000);

  await react("✅");
});

gmd({
  pattern: "antidelete",
  aliases: ["setantidelete"],
  desc: "Set antidelete mode: chat, group, all, or off",
  category: "owner",
  react: "🛡️",
  filename: __filename,
}, async (from, Prince, conText) => {
  const { q, reply, react, isSuperUser, getSetting, setSetting, sender, newsletterJid, botName, mek, botPic } = conText;
  if (!isSuperUser) return reply("❌ Owner Only Command!");
  
  const currentMode = getSetting('ANTIDELETE', config.ANTIDELETE || 'off').toLowerCase();
  const input = (q || '').trim().toLowerCase();
  const validModes = ['chat', 'group', 'all', 'off'];

  if (!input || !validModes.includes(input)) {
    const statusText = `*𝐗𝐇𝐑𝐈𝐒 𝐌𝐃 𝐕𝟐 𝐀𝐍𝐓𝐈𝐃𝐄𝐋𝐄𝐓𝐄 𝐒𝐄𝐓𝐓𝐈𝐍𝐆𝐒*

📊 Current Mode: *${currentMode.toUpperCase()}*

Reply With:

*1.* Enable for Private Chats (DM)
*2.* Enable for Group Chats
*3.* Enable for All Chats
*4.* Disable Antidelete

_Or use directly:_
*.antidelete chat/group/all/off*

╭────────────────◆  
│ ᴘᴏᴡᴇʀᴇᴅ ʙʏ xʜʀɪs ᴛᴇᴄʜ
╰─────────────────◆`;

    const sentMsg = await Prince.sendMessage(from, {
      image: { url: botPic },
      caption: statusText,
      contextInfo: getContextInfo(sender, newsletterJid, botName),
    }, { quoted: mek });

    const handler = async (event) => {
      const ms = event.messages[0];
      if (!ms?.message || ms.key.fromMe) return;

      const isReply = ms.message?.extendedTextMessage?.contextInfo?.stanzaId === sentMsg.key.id;
      if (isReply) {
        const text = (ms.message.conversation || ms.message.extendedTextMessage?.text || "").trim();
        let mode = "";
        if (text === "1") mode = "chat";
        else if (text === "2") mode = "group";
        else if (text === "3") mode = "all";
        else if (text === "4") mode = "off";

        if (mode) {
          Prince.ev.off("messages.upsert", handler);
          setSetting('ANTIDELETE', mode);
          await react("✅");
          return reply(`✅ *Antidelete set to:* ${mode.toUpperCase()}`);
        }
      }
    };

    Prince.ev.on("messages.upsert", handler);
    setTimeout(() => Prince.ev.off("messages.upsert", handler), 60000);
    return;
  }

  if (input === currentMode) {
    return reply(`⚠️ Antidelete is already set to *${input}*`);
  }

  setSetting('ANTIDELETE', input);
  await react("✅");
  await reply(`✅ *Antidelete set to:* ${input.toUpperCase()}`);
});

gmd({
  pattern: "del",
  aliases: ["delete", "dlt", "remove"],
  react: "🗑️",
  category: "group",
  description: "Delete a quoted message",
}, async (from, Prince, conText) => {
  const {
    reply,
    react,
    isSuperUser,
    isAdmin,
    isGroup,
    isBotAdmin,
    ms
  } = conText;

  // Works in groups (admins/owner) and in DM (owner can delete the bot's own messages)
  if (isGroup) {
    if (!isSuperUser && !isAdmin) return reply("❌ Admin/Owner Only Command!");
  } else {
    if (!isSuperUser) return reply("❌ Owner Only Command!");
  }

  const botId = conText.botId || (Prince.user?.id ? Prince.user.id.split(":")[0] + "@s.whatsapp.net" : "");

  // High-reliability key extraction
  const getMessageKey = () => {
    // 1. From conText.quoted (helper populated)
    if (conText.quoted && conText.quoted.id) {
      return {
        remoteJid: from,
        fromMe: conText.quoted.fromMe,
        id: conText.quoted.id,
        participant: conText.quoted.sender || (conText.quoted.key && conText.quoted.key.participant)
      };
    }

    // 2. From raw message structure (ms.message)
    const contextInfo = ms.message?.extendedTextMessage?.contextInfo ||
                        ms.message?.imageMessage?.contextInfo ||
                        ms.message?.videoMessage?.contextInfo ||
                        ms.message?.documentWithCaptionMessage?.message?.documentMessage?.contextInfo ||
                        ms.message?.viewOnceMessage?.message?.imageMessage?.contextInfo ||
                        ms.message?.viewOnceMessageV2?.message?.imageMessage?.contextInfo;

    if (contextInfo && contextInfo.stanzaId) {
      return {
        remoteJid: from,
        // In DM you can only unsend your own (bot) messages, so target fromMe.
        fromMe: isGroup
          ? (contextInfo.participant === botId || contextInfo.participant === Prince.user?.id)
          : true,
        id: contextInfo.stanzaId,
        participant: isGroup ? contextInfo.participant : undefined
      };
    }

    return null;
  };

  const key = getMessageKey();

  if (!key || !key.id) {
    return reply("❌ Please quote a message to delete!");
  }

  try {
    const isBotMessage = key.fromMe;

    if (isGroup && !isBotMessage && !isBotAdmin) {
      return reply(
        "❌ Bot needs admin rights to delete others' messages in groups!",
      );
    }

    await Prince.sendMessage(from, { delete: key });
    await react("✅");
  } catch (error) {
    console.error("Delete error details:", error);
    await react("❌");
    return reply(`❌ Failed to delete message: ${error.message}`);
  }
});

// Resolves { lid, pnJid } for block. Uses groupMetadata for the lid<->pn mapping.
// Returns { lid, pnJid } or { error: "..." } or null.
async function resolveBlockTarget(conText, from, Prince) {
  const { mentionedJid, quotedUser, q, groupMetadata, sender } = conText;
  let raw = (mentionedJid && mentionedJid[0]) || quotedUser || null;
  if (!raw && q) {
    const num = q.replace(/[^0-9]/g, "");
    if (num.length >= 8) raw = num + "@s.whatsapp.net";
  }
  // In a private chat with no explicit target, act on the sender of the current chat
  if (!raw && !from.endsWith("@g.us")) raw = sender || from;
  if (!raw) return null;
  if (raw.endsWith("@g.us")) return null;

  let lid = null;
  let pnJid = null;

  // Helper: look up the mapping in the group participants
  const findInParticipants = (needle) => {
    if (!groupMetadata?.participants) return null;
    const needleNum = needle.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
    return groupMetadata.participants.find((p) => {
      const idNum = (p.id || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
      const lidNum = (p.lid || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
      const pnNum = (p.pn || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
      return idNum === needleNum || lidNum === needleNum || pnNum === needleNum;
    });
  };

  // Case 1: we have a @lid
  if (raw.endsWith("@lid")) {
    lid = raw.split("@")[0].replace(/[^0-9]/g, "") + "@lid";
    // a) look up the pn in the participants
    const found = findInParticipants(raw);
    if (found?.pn) pnJid = found.pn.split(":")[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    // b) otherwise try getJidFromLid
    if (!pnJid && Prince.getJidFromLid) {
      try {
        const resolved = await Prince.getJidFromLid(raw);
        if (resolved && resolved.endsWith("@s.whatsapp.net")) pnJid = resolved;
      } catch (e) {}
    }
  }
  // Case 2: we have a phone number @s.whatsapp.net (or just a number)
  else {
    if (!raw.includes("@")) raw = raw + "@s.whatsapp.net";
    const num = raw.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
    if (num.length < 8) return null;
    pnJid = num + "@s.whatsapp.net";

    // a) look up the lid in the participants
    const found = findInParticipants(raw);
    if (found?.lid) lid = found.lid.split("@")[0].replace(/[^0-9]/g, "") + "@lid";

    // b) otherwise resolve via onWhatsApp
    if (!lid && typeof Prince.onWhatsApp === "function") {
      try {
        const results = await Prince.onWhatsApp(num);
        if (Array.isArray(results) && results[0]) {
          const r = results[0];
          if (!r.exists) return { error: "__NOT_ON_WHATSAPP__" };
          if (r.lid) lid = (typeof r.lid === "string" ? r.lid : "").split("@")[0].replace(/[^0-9]/g, "") + "@lid";
          if (r.jid && r.jid.endsWith("@s.whatsapp.net")) pnJid = r.jid;
        }
      } catch (e) {
        console.log("[BLOCK] onWhatsApp failed:", e.message);
      }
    }
  }

  if (!lid && !pnJid) return null;
  return { lid, pnJid };
}


// Sends the block/unblock request, trying several attribute combinations.
async function applyBlockAction(Prince, target, action) {
  const S_WA = "s.whatsapp.net";
  const attempts = [];

  // 1. Full new protocol: jid=LID + pn_jid=number (most reliable for block)
  if (target.lid && target.pnJid) {
    attempts.push({ action, jid: target.lid, pn_jid: target.pnJid });
  }
  // 2. jid=LID only (especially for unblock)
  if (target.lid) {
    attempts.push({ action, jid: target.lid });
  }
  // 3. jid=number + pn_jid identical
  if (target.pnJid) {
    attempts.push({ action, jid: target.pnJid, pn_jid: target.pnJid });
  }
  // 4. Old protocol: jid=number only
  if (target.pnJid) {
    attempts.push({ action, jid: target.pnJid });
  }

  if (attempts.length === 0) return { ok: false, error: "no valid target" };

  let lastError = null;
  for (const itemAttrs of attempts) {
    try {
      await Prince.query({
        tag: "iq",
        attrs: { xmlns: "blocklist", to: S_WA, type: "set" },
        content: [{ tag: "item", attrs: itemAttrs }],
      });
      return { ok: true, jid: itemAttrs.pn_jid || itemAttrs.jid };
    } catch (e) {
      lastError = e;
      const msg = e?.message || "";
      if (!msg.includes("bad-request") && !msg.includes("not-authorized") && !msg.includes("item-not-found")) {
        break;
      }
    }
  }
  return { ok: false, error: lastError ? lastError.message : "unknown error" };
}

gmd({
  pattern: "block",
  react: "🚫",
  category: "owner",
  description: "Block a user (reply, mention, number, or in their DM).",
}, async (from, Prince, conText) => {
  const { reply, react, isSuperUser, mek, botName, newsletterJid } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const target = await resolveBlockTarget(conText, from, Prince);

  if (target && target.error === "__NOT_ON_WHATSAPP__") {
    await react("❌");
    return reply("❌ This number is not registered on WhatsApp.");
  }
  if (!target || (!target.lid && !target.pnJid)) {
    await react("❌");
    return reply("❌ Reply to, mention, or provide the number of the user to block.\n\n*Example:* .block 254712345678");
  }

  const outcome = await applyBlockAction(Prince, target, "block");
  if (!outcome.ok) {
    await react("❌");
    return reply(`❌ Failed to block user: ${outcome.error}`);
  }

  await react("✅");
  const shown = (outcome.jid || "").split("@")[0];
  const mentionJid = target.pnJid || target.lid;
  await Prince.sendMessage(
    from,
    {
      text: `🚫 Successfully blocked @${shown}.`,
      mentions: [mentionJid],
      contextInfo: { mentionedJid: [mentionJid], ...getContextInfo(mentionJid, newsletterJid, botName) },
    },
    { quoted: mek },
  );
});

gmd({
  pattern: "unblock",
  react: "✅",
  category: "owner",
  description: "Unblock a user (reply, mention, number, or in their DM).",
}, async (from, Prince, conText) => {
  const { reply, react, isSuperUser, mek, botName, newsletterJid } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  const target = await resolveBlockTarget(conText, from, Prince);

  if (target && target.error === "__NOT_ON_WHATSAPP__") {
    await react("❌");
    return reply("❌ This number is not registered on WhatsApp.");
  }
  if (!target || (!target.lid && !target.pnJid)) {
    await react("❌");
    return reply("❌ Reply to, mention, or provide the number of the user to unblock.\n\n*Example:* .unblock 254712345678");
  }

  const outcome = await applyBlockAction(Prince, target, "unblock");
  if (!outcome.ok) {
    await react("❌");
    return reply(`❌ Failed to unblock user: ${outcome.error}`);
  }

  await react("✅");
  const shown = (outcome.jid || "").split("@")[0];
  const mentionJid = target.pnJid || target.lid;
  await Prince.sendMessage(
    from,
    {
      text: `✅ Successfully unblocked @${shown}.`,
      mentions: [mentionJid],
      contextInfo: { mentionedJid: [mentionJid], ...getContextInfo(mentionJid, newsletterJid, botName) },
    },
    { quoted: mek },
  );
});

// ─── CATALOG : fetch a WhatsApp Business account's product catalog ────────────
gmd({
  pattern: "catalog",
  aliases: ["catalogue", "products", "shop"],
  react: "🛍️",
  category: "tools",
  description: "Show the product catalog of a WhatsApp Business account.",
}, async (from, Prince, conText) => {
  const { q, reply, react, mek, quotedUser, mentionedJid, sender, isGroup, botName, newsletterJid } = conText;

  // Determine the target JID
  let targetJid = null;
  if (mentionedJid && mentionedJid[0]) targetJid = mentionedJid[0];
  else if (quotedUser) targetJid = quotedUser;
  else if (q) {
    const num = q.replace(/[^0-9]/g, "");
    if (num.length >= 8) targetJid = num + "@s.whatsapp.net";
  }
  else if (!isGroup) targetJid = from; // in DM, the person's catalog

  if (!targetJid) {
    await react("❌");
    return reply(
      "🛍️ *Business Catalog*\n\n" +
      "Usage:\n" +
      "• `.catalog 237xxxxxxxx`\n" +
      "• In reply to a message\n" +
      "• By mention: `.catalog @user`"
    );
  }

  // Normalize to @s.whatsapp.net
  const num = targetJid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
  if (num.length < 8) {
    await react("❌");
    return reply("❌ Invalid number.");
  }
  targetJid = num + "@s.whatsapp.net";

  await react("⏳");

  try {
    if (typeof Prince.getCatalog !== "function") {
      await react("❌");
      return reply("❌ Catalog feature is not available on this build.");
    }

    const result = await Prince.getCatalog({ jid: targetJid, limit: 30 });
    const products = result?.products || [];

    if (!products.length) {
      await react("❌");
      return reply(`❌ No products found for +${num}.\n_This account may not have a Business catalog, or it is private._`);
    }

    const maxShow = Math.min(products.length, 10);
    await reply(
      `🛍️ *CATALOG — +${num}*\n━━━━━━━━━━━━━━━━━━━━━━\n📦 ${products.length} product(s)\n\n_Showing the first ${maxShow}..._`
    );

    for (let i = 0; i < maxShow; i++) {
      const p = products[i];
      const price = p.price ? `${(p.price / 1000).toFixed(2)} ${p.currency || ""}`.trim() : "Price not listed";
      const caption =
        `🏷️ *${p.name || "Unnamed"}*\n\n` +
        (p.description ? `${p.description}\n\n` : "") +
        `💰 ${price}\n` +
        (p.retailerId ? `🔖 Ref: ${p.retailerId}\n` : "") +
        `\n> *${botName}*`;

      const imgUrl = p.imageUrls && (p.imageUrls.original || p.imageUrls.requested || Object.values(p.imageUrls)[0]);

      try {
        if (imgUrl) {
          await Prince.sendMessage(from, {
            image: { url: imgUrl },
            caption,
            contextInfo: getContextInfo(sender, newsletterJid, botName),
          }, { quoted: mek });
        } else {
          await Prince.sendMessage(from, {
            text: caption,
            contextInfo: getContextInfo(sender, newsletterJid, botName),
          }, { quoted: mek });
        }
      } catch (sendErr) {
        await reply(caption);
      }
      await new Promise((r) => setTimeout(r, 800));
    }

    if (products.length > maxShow) {
      await reply(`_… and ${products.length - maxShow} more product(s) not shown._`);
    }

    await react("✅");
  } catch (e) {
    console.error("[CATALOG] error:", e);
    await react("❌");
    let msg = `❌ Error: ${e.message}`;
    if ((e.message || "").includes("not-authorized") || (e.message || "").includes("forbidden")) {
      msg = "❌ Catalog unavailable (private or non-business account).";
    }
    return reply(msg);
  }
});

// ─── SETCATALOG : copy a business catalog onto the bot's own profile ─────────
gmd({
  pattern: "setcatalog",
  aliases: ["copycatalog", "clonecatalog"],
  react: "📋",
  category: "owner",
  description: "Copy a business account's catalog onto your profile (bot must be Business).",
}, async (from, Prince, conText) => {
  const { q, reply, react, isSuperUser, quotedUser, mentionedJid } = conText;

  if (!isSuperUser) {
    await react("❌");
    return reply("❌ Owner Only Command!");
  }

  // Target
  let targetJid = null;
  if (mentionedJid && mentionedJid[0]) targetJid = mentionedJid[0];
  else if (quotedUser) targetJid = quotedUser;
  else if (q) {
    const num = q.replace(/[^0-9]/g, "");
    if (num.length >= 8) targetJid = num + "@s.whatsapp.net";
  }

  if (!targetJid) {
    await react("❌");
    return reply("📋 *Copy a catalog*\n\nUsage: `.setcatalog 237xxxxxxxx`\nOr reply to / mention the person.");
  }

  const num = targetJid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
  if (num.length < 8) {
    await react("❌");
    return reply("❌ Invalid number.");
  }
  targetJid = num + "@s.whatsapp.net";

  if (typeof Prince.getCatalog !== "function" || typeof Prince.productCreate !== "function") {
    await react("❌");
    return reply("❌ Catalog features are not available on this build.");
  }

  await react("⏳");

  // 1) Fetch the source catalog
  let products = [];
  try {
    const result = await Prince.getCatalog({ jid: targetJid, limit: 50 });
    products = result?.products || [];
  } catch (e) {
    await react("❌");
    const m = (e.message || "").toLowerCase();
    if (m.includes("not-authorized") || m.includes("forbidden") || m.includes("not-acceptable")) {
      return reply(`❌ *Catalog unavailable*\n\nThe number +${num} is not a *WhatsApp Business* account, or its catalog is private.`);
    }
    return reply(`❌ Could not fetch the catalog: ${e.message}`);
  }

  if (!products.length) {
    await react("❌");
    return reply(`❌ *No products*\n\nThe number +${num} has no catalog, or it is not a WhatsApp Business account.`);
  }

  await reply(`📥 Found ${products.length} product(s) on +${num}.\n_Copying onto your profile..._`);

  // 2) Recreate each product on the bot's profile
  let created = 0, failed = 0;
  const errors = [];

  for (const p of products) {
    try {
      const imgUrl = p.imageUrls && (p.imageUrls.original || p.imageUrls.requested || Object.values(p.imageUrls)[0]);
      const images = imgUrl ? [{ url: imgUrl }] : [];

      await Prince.productCreate({
        name: p.name || "Product",
        description: p.description || "",
        price: p.price || 0,
        currency: p.currency || "XAF",
        isHidden: false,
        originCountryCode: undefined,
        images,
      });
      created++;
      await new Promise((r) => setTimeout(r, 1500)); // avoid rate-limit
    } catch (e) {
      failed++;
      const m = (e.message || "").toLowerCase();
      if (m.includes("not-authorized") || m.includes("forbidden")) {
        await react("❌");
        return reply(
          `❌ *Your account (the bot) is not WhatsApp Business*\n\n` +
          `To copy a catalog, the bot's number must be a *WhatsApp Business* account with catalog enabled.\n\n` +
          `Convert the bot account to Business in WhatsApp settings, then try again.`
        );
      }
      if (errors.length < 3) errors.push(`• ${p.name}: ${e.message}`);
    }
  }

  await react(created > 0 ? "✅" : "❌");
  let summary = `📋 *Catalog copy finished*\n\n` +
    `✅ Created: ${created}/${products.length}\n` +
    (failed ? `❌ Failed: ${failed}\n` : "");
  if (errors.length) summary += `\n_Error details:_\n${errors.join("\n")}`;
  if (created > 0) summary += `\n\n_Check your catalog in WhatsApp Business._`;
  return reply(summary);
});

gmd({
  pattern: "mention",
  aliases: ["setmention", "mentionreply"],
  category: "owner",
  react: "💬",
  description: "Configure an auto-reply triggered when the bot is mentioned/tagged.",
}, async (from, Prince, conText) => {
  const { reply, react, isSuperUser, q, quotedMsg, getSetting, setSetting } = conText;

  if (!isSuperUser) return reply("❌ Owner Only Command!");

  let input = (q || "").trim();
  if (input.toLowerCase().startsWith("set ")) input = input.slice(4).trim();
  const lower = input.toLowerCase();

  const cur = getSetting("MENTION_REPLY", "off");
  const curType = getSetting("MENTION_REPLY_TYPE", "text");
  const curVal = getSetting("MENTION_REPLY_VALUE", getSetting("MENTION_REPLY_TEXT", "👋 Hello! Thanks for tagging me. The owner will get back to you soon."));

  // Toggle on/off
  if (lower === "on" || lower === "true" || lower === "enable") {
    setSetting("MENTION_REPLY", "on");
    await react("✅");
    return reply("✅ Mention auto-reply is now *ON*.");
  }
  if (lower === "off" || lower === "false" || lower === "disable") {
    setSetting("MENTION_REPLY", "off");
    await react("✅");
    return reply("❎ Mention auto-reply is now *OFF*.");
  }

  // Reply to a sticker -> store it as the auto-reply
  if (quotedMsg?.stickerMessage) {
    try {
      const { downloadMediaMessage } = require("prince-baileys");
      const buffer = await downloadMediaMessage({ message: quotedMsg }, "buffer", {});
      const dataDir = path.join(__dirname, "..", "data");
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const stickerPath = path.join(dataDir, "mention-sticker.webp");
      fs.writeFileSync(stickerPath, buffer);
      setSetting("MENTION_REPLY_TYPE", "sticker");
      setSetting("MENTION_REPLY_VALUE", stickerPath);
      setSetting("MENTION_REPLY", "on");
      await react("✅");
      return reply("✅ Mention auto-reply set to the *sticker* and *enabled*.");
    } catch (e) {
      await react("❌");
      return reply(`❌ Failed to save sticker: ${e.message}`);
    }
  }

  // No input and no sticker -> show status/help
  if (!input) {
    const typeLabel = curType === "url" ? "Media (URL)" : curType === "sticker" ? "Sticker" : "Text";
    return reply(
      `💬 *MENTION AUTO-REPLY*\n\n` +
      `📊 Status: ${cur === "on" ? "✅ ON" : "❌ OFF"}\n` +
      `🧩 Type: ${typeLabel}\n` +
      `📝 Value: ${curType === "sticker" ? "(saved sticker)" : curVal}\n\n` +
      `*Usage:*\n` +
      `.mention on / off — enable/disable\n` +
      `.mention set <text> — reply with text\n` +
      `.mention set <url> — reply with media downloaded from the URL\n` +
      `.mention (replying to a sticker) — reply with that sticker`
    );
  }

  // URL -> media reply ; otherwise text reply
  const isUrl = /^https?:\/\/\S+$/i.test(input);
  setSetting("MENTION_REPLY_TYPE", isUrl ? "url" : "text");
  setSetting("MENTION_REPLY_VALUE", input);
  setSetting("MENTION_REPLY_TEXT", input); // backward-compat
  setSetting("MENTION_REPLY", "on");
  await react("✅");
  return reply(
    isUrl
      ? `✅ Mention auto-reply set to *media from URL* and *enabled*:\n\n${input}`
      : `✅ Mention auto-reply *text* set and *enabled*:\n\n${input}`
  );
});

gmd({
  pattern: "antilink",
  aliases: ["setantilink"],
  category: "owner",
  react: "🔗",
  description: "Enable/Disable Anti-Link Feature (per-group)",
}, async (from, Prince, conText) => {
  const { isSuperUser, reply, react, from: chatId, mek, isGroup, q, getGroupSetting, setGroupSetting, groupName } = conText;

  if (!isSuperUser) return reply("❌ *Super User Only Command*");

  if (!isGroup) return reply("❌ This command can only be used in groups!");

  const currentSetting = getGroupSetting(chatId, 'ANTILINK', 'false');

  if (q) {
    const option = q.trim().toLowerCase();
    if (option === 'warn') {
      setGroupSetting(chatId, 'ANTILINK', 'warn');
      return reply("✅ Anti-link enabled for this group.\nMode: *Warn* — Links will be deleted and users warned.");
    } else if (option === 'delete') {
      setGroupSetting(chatId, 'ANTILINK', 'delete');
      return reply("✅ Anti-link enabled for this group.\nMode: *Delete* — Links will be deleted without removing users.");
    } else if (option === 'kick' || option === 'remove') {
      setGroupSetting(chatId, 'ANTILINK', 'kick');
      return reply("✅ Anti-link enabled for this group.\nMode: *Kick* — Users who send links will be removed.");
    } else if (option === 'off' || option === 'false' || option === 'disable') {
      setGroupSetting(chatId, 'ANTILINK', 'false');
      return reply("❎ Anti-link disabled for this group. Links will not be moderated.");
    }
  }

  const statusIcon = currentSetting === 'false' ? '❌ Off' : `✅ ${currentSetting}`;

  const infoMess = {
    image: { url: config.BOT_PIC },
    caption: `> *${config.BOT_NAME} 𝐀𝐍𝐓𝐈𝐋𝐈𝐍𝐊 𝐒𝐄𝐓𝐓𝐈𝐍𝐆𝐒*

📍 Group: *${groupName}*
📊 Current status: *${statusIcon}*

Reply With:

*1.* To Enable Antilink => Warn  
*2.* To Enable Antilink => Delete  
*3.* To Enable Antilink => Remove/Kick  
*4.* To Disable Antilink Feature  

_Or use directly:_
*.antilink warn/delete/kick/off*

╭────────────────◆  
│ ${config.FOOTER}  
╰─────────────────◆`,
    contextInfo: getContextInfo(conText.sender, conText.newsletterJid, conText.botName),
  };

  const sentMsg = await Prince.sendMessage(chatId, infoMess, { quoted: mek });
  const messageId = sentMsg.key.id;

  const handler = async (event) => {
    const messageData = event.messages[0];
    if (!messageData?.message) return;

    const messageContent =
      messageData.message.conversation ||
      messageData.message.extendedTextMessage?.text;

    const isReplyToMenu =
      messageData.message.extendedTextMessage?.contextInfo?.stanzaId ===
      messageId;

    if (isReplyToMenu) {
      Prince.ev.off("messages.upsert", handler);
      await react("🔗");
      switch (messageContent) {
        case "1":
          setGroupSetting(chatId, 'ANTILINK', 'warn');
          return reply(
            "✅ Anti-link enabled for this group.\nMode: *Warn* — Links will be deleted and users warned."
          );

        case "2":
          setGroupSetting(chatId, 'ANTILINK', 'delete');
          return reply(
            "✅ Anti-link enabled for this group.\nMode: *Delete* — Links will be deleted without removing users."
          );

        case "3":
          setGroupSetting(chatId, 'ANTILINK', 'kick');
          return reply(
            "✅ Anti-link enabled for this group.\nMode: *Kick* — Users who send links will be removed."
          );

        case "4":
          setGroupSetting(chatId, 'ANTILINK', 'false');
          return reply(
            "❎ Anti-link disabled for this group. Links will not be moderated."
          );

        default:
          await Prince.sendMessage(chatId, {
            text: "⚠️ Invalid option. Please reply with 1, 2, 3 or 4.",
          });
      }
    }
  };

  Prince.ev.on("messages.upsert", handler);

  setTimeout(() => {
    Prince.ev.off("messages.upsert", handler);
  }, 60000);

  await react("✅");
});


gmd({
  pattern: "shell",
  react: "👑",
  aliases: ['exec', 'terminal', 'sh', 'ex'],
  category: "owner",
  description: "Run shell commands",
}, async (from, Prince, conText) => {
  const { q, mek, react, reply, isDevs } = conText;

  if (!isDevs) {
    await react("❌");
    return reply("❌ Developer Only Command!");
  }

  if (!q) {
    await react("❌");
    return reply("❌ Please provide a shell command!");
  }

  try {
    const options = {
      maxBuffer: 10 * 1024 * 1024, 
      encoding: 'utf-8'
    };

    exec(q, options, async (err, stdout, stderr) => {
      try {
        if (err) {
          await react("❌");
          return reply(`Error: ${err.message}`);
        }
        if (stderr) {
          await react("⚠️");
          return reply(`stderr: ${stderr}`);
        }

        const zipPath = extractFilePath(stdout) || (q.includes('zip') ? extractFilePath(q) : null);
        if (zipPath && fsA.existsSync(zipPath)) {
          await handleZipFile(from, Prince, mek, react, zipPath);
          return;
        }

        if (stdout) {
          if (stdout.length > 10000) {
            await handleLargeOutput(from, Prince, mek, react, stdout);
          } else {
            await react("✅");
            await reply(stdout);
          }
        } else {
          await react("✅");
          await reply("Command executed successfully (no output)");
        }
      } catch (error) {
        console.error("Output handling error:", error);
        await react("❌");
        await reply(`❌ Output handling error: ${error.message}`);
      }
    });
  } catch (error) {
    console.error("Exec Error:", error);
    await react("❌");
    await reply(`❌ Error: ${error.message}`);
  }
});

function extractFilePath(text) {
  const match = text.match(/(\/[^\s]+\.zip)/);
  return match ? match[0].trim() : null;
}

async function handleZipFile(from, Prince, mek, react, zipPath) {
  try {
    await react("📦");
    const zipContent = fsA.readFileSync(zipPath);
    const filename = path.basename(zipPath);
    await Prince.sendMessage(from, {
      document: zipContent,
      fileName: filename,
      mimetype: 'application/zip'
    }, { quoted: mek });
    fsA.unlinkSync(zipPath);
  } catch (e) {
    console.error("Zip send error:", e);
    throw e;
  }
}

async function handleLargeOutput(from, Prince, mek, react, stdout) {
  await react("📤");
  let extension = '.txt';
  let mimetype = 'text/plain';
  let fileContent = stdout;
  
  const isPotentialJson = /^[\s]*[\{\[]/.test(stdout) && /[\}\]]$/.test(stdout.trim());
  if (isPotentialJson) {
    try {
      const jsonObj = JSON.parse(stdout);
      fileContent = JSON.stringify(jsonObj, null, 2);
      extension = '.json';
      mimetype = 'application/json';
    } catch (e) {}
  }
 
  if (mimetype === 'text/plain') {
    if (/<\s*html[\s>]|<!DOCTYPE html>/i.test(stdout)) {
      extension = '.html';
      mimetype = 'text/html';
    } else if (/<\s*\/?\s*(div|span|p|a|img|body|head|title)[\s>]/i.test(stdout)) {
      extension = '.html';
      mimetype = 'text/html';
    } else if (/function\s*\w*\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|class\s+\w+/i.test(stdout)) {
      extension = '.js';
      mimetype = 'application/javascript';
    } else if (/^\s*#\s.*|^\s*-\s.*|^\s*\*\s.*|^\s*\d+\.\s.*/.test(stdout)) {
      extension = '.md';
      mimetype = 'text/markdown';
    } else if (/^\s*(def|class)\s+\w+|^\s*import\s+\w+|^\s*from\s+\w+|^\s*print\(/.test(stdout)) {
      extension = '.py';
      mimetype = 'text/x-python';
    } else if (/^\s*package\s+\w+|^\s*import\s+\w+\.\w+|^\s*public\s+class\s+\w+/.test(stdout)) {
      extension = '.java';
      mimetype = 'text/x-java-source';
    } else if (/<\?php|\$[a-zA-Z_]+\s*=|function\s+\w+\s*\(/.test(stdout)) {
      extension = '.php';
      mimetype = 'application/x-httpd-php';
    } else if (/^\s*#include\s+<|^\s*int\s+main\s*\(|^\s*printf\s*\(/.test(stdout)) {
      extension = '.c';
      mimetype = 'text/x-csrc';
    } else if (/^\s*#include\s+<|^\s*using\s+namespace|^\s*cout\s*<</.test(stdout)) {
      extension = '.cpp';
      mimetype = 'text/x-c++src';
    } else if (/^\s*<[?]xml\s+version|<\w+\s+xmlns(:?\w+)?=/.test(stdout)) {
      extension = '.xml';
      mimetype = 'application/xml';
    } else if (/^\s*#!\s*\/bin\/bash|^\s*echo\s+\"\$/.test(stdout)) {
      extension = '.sh';
      mimetype = 'application/x-sh';
    } else if (/^\s*---\s*$|^\s*title\s*:/m.test(stdout)) {
      extension = '.yml';
      mimetype = 'application/x-yaml';
    }
  }
  
  const filename = `output_${Date.now()}${extension}`;
  await Prince.sendMessage(from, {
    document: Buffer.from(fileContent),
    fileName: filename,
    mimetype: mimetype
  }, { quoted: mek });
}


gmd({
  pattern: "eval",
  react: "👑",
  category: "owner",
  description: "Eval any JavaScript code (sync/async)",
}, async (from, Prince, conText) => {
  const { 
    m, mek, edit, react, del, args, quoted, isCmd, command, 
    isAdmin, isBotAdmin, isSuperAdmin, sender, pushName, setSudo, delSudo, 
    q, reply, config, superUser, tagged, mentionedJid, 
    isGroup, groupInfo, groupName, getSudoNumbers, authorMessage, 
    user, groupMember, repliedMessage, quotedMsg, quotedUser, 
    isSuperUser, botMode, botPic, botFooter, botCaption, 
    botVersion, groupAdmins, participants, ownerNumber, ownerName, botName, princeRepo, 
    getMediaBuffer, getFileContentType, bufferToStream, 
    uploadToPixhost, uploadToImgBB, uploadToGithubCdn, 
    uploadToPrinceCdn, uploadToPasteboard, uploadToCatbox, 
    newsletterUrl, newsletterJid, PrinceTechApi, PrinceApiKey, 
    botPrefix, gmdBuffer, gmdJson, formatAudio, formatVideo, timeZone,
    isDevs
  } = conText;

  if (!isDevs) {
    await react("❌");
    return reply("❌ Developer Only Command!");
  }

  if (!q) {
    await react("❌");
    return reply("❌ Please provide code to evaluate!");
  }

  try {
    const isAsync = q.includes('await') || q.includes('async');

    let evaled;
    if (isAsync) {
      evaled = await eval(`(async () => { 
        try { 
          return ${q.includes('return') ? q : `(${q})`} 
        } catch (e) { 
          return "❌ Async Eval Error: " + e.message; 
        } 
      })()`);
    } else {
      evaled = eval(q);
    }
    if (typeof evaled !== 'string') {
      evaled = require('util').inspect(evaled, { depth: 1 });
    }
    await Prince.sendMessage(from, {
      text: evaled,
      mentions: [quotedUser]
    }, { quoted: mek });
    await react("✅");
  } catch (error) {
    console.error("Eval Error:", error);
    await react("❌");
    await reply(`❌ Error: ${error.message}`);
  }
});


gmd({
  pattern: "setsudo",
  aliases: ['addsudo'],
  react: "👑",
  category: "owner",
  description: "Sets User as Sudo",
}, async (from, Prince, conText) => {
  const { q, mek, reply, react, isGroup, isSuperUser, quotedUser, setSudo, mentionedJid } = conText;

  if (!isSuperUser) {
    await react("❌");
    return reply("❌ Owner Only Command!");
  }

  if (!quotedUser && !q && (!mentionedJid || mentionedJid.length === 0)) {
    await react("❌");
    return reply("❌ Please reply to a user, mention them, or provide a phone number!\n\nUsage:\n• Reply to a message: .setsudo\n• Mention: .setsudo @user\n• Number: .setsudo 237XXXXXXXXX");
  }

  try {
    let userNumber;

    if (quotedUser) {
      userNumber = quotedUser.split("@")[0];
    } else if (mentionedJid && mentionedJid.length > 0) {
      userNumber = mentionedJid[0].split("@")[0];
    } else if (q) {
      userNumber = q.replace(/[^0-9]/g, '');
    }

    if (!userNumber || userNumber.length < 5) {
      await react("❌");
      return reply("❌ Invalid number provided!");
    }

    const added = setSudo(userNumber);
    const msg = added
      ? `✅ Added @${userNumber} to sudo list.`
      : `⚠️ @${userNumber} is already in sudo list.`;

    await Prince.sendMessage(from, {
      text: msg,
      mentions: [`${userNumber}@s.whatsapp.net`]
    }, { quoted: mek });
    await react("✅");

  } catch (error) {
    console.error("setsudo error:", error);
    await react("❌");
    await reply(`❌ Error: ${error.message}`);
  }
});


gmd({
  pattern: "delsudo",
  aliases: ['removesudo'],
  react: "👑",
  category: "owner",
  description: "Deletes User as Sudo",
}, async (from, Prince, conText) => {
  const { q, mek, reply, react, isGroup, isSuperUser, quotedUser, delSudo, mentionedJid } = conText;

  if (!isSuperUser) {
    await react("❌");
    return reply("❌ Owner Only Command!");
  }

  if (!quotedUser && !q && (!mentionedJid || mentionedJid.length === 0)) {
    await react("❌");
    return reply("❌ Please reply to a user, mention them, or provide a phone number!\n\nUsage:\n• Reply to a message: .delsudo\n• Mention: .delsudo @user\n• Number: .delsudo 237XXXXXXXXX");
  }

  try {
    let userNumber;

    if (quotedUser) {
      userNumber = quotedUser.split("@")[0];
    } else if (mentionedJid && mentionedJid.length > 0) {
      userNumber = mentionedJid[0].split("@")[0];
    } else if (q) {
      userNumber = q.replace(/[^0-9]/g, '');
    }

    if (!userNumber || userNumber.length < 5) {
      await react("❌");
      return reply("❌ Invalid number provided!");
    }

    const removed = delSudo(userNumber);
    const msg = removed
      ? `❌ Removed @${userNumber} from sudo list.`
      : `⚠️ @${userNumber} is not in the sudo list.`;

    await Prince.sendMessage(from, {
      text: msg,
      mentions: [`${userNumber}@s.whatsapp.net`]
    }, { quoted: mek });
    await react("✅");

  } catch (error) {
    console.error("delsudo error:", error);
    await react("❌");
    await reply(`❌ Error: ${error.message}`);
  }
});


gmd({
  pattern: "getsudo",
  aliases: ['getsudos', 'listsudo', 'listsudos'],
  react: "👑",
  category: "owner",
  description: "Get All Sudo Users",
}, async (from, Prince, conText) => {
  const { q, mek, config, reply, react, isGroup, isSuperUser, quotedUser, getSudoNumbers } = conText;

  try {
    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }
    // Get sudo numbers from both sources
    const sudoFromFile = getSudoNumbers() || [];
    const sudoFromConfig = (config.SUDO_NUMBERS ? config.SUDO_NUMBERS.split(',') : [])
      .map(num => num.trim().replace(/\D/g, ''))
      .filter(num => num.length > 5);

    // Combine and deduplicate
    const allSudos = [...new Set([...sudoFromFile, ...sudoFromConfig])];

    if (!allSudos.length) {
      return reply("⚠️ No sudo users added yet (neither in config nor in sudo file).");
    }

    let msg = "*👑 ALL SUDO USERS*\n\n";
    msg += `*Config SUDO_NUMBERS (${sudoFromConfig.length}):*\n`;
    sudoFromConfig.forEach((num, i) => {
      msg += `${i + 1}. wa.me/${num}\n`;
    });

    msg += `\n*File SUDO_NUMBERS (${sudoFromFile.length}):*\n`;
    sudoFromFile.forEach((num, i) => {
      msg += `${i + 1}. wa.me/${num}\n`;
    });

    msg += `\n*Total Sudo Users: ${allSudos.length}*`;
    
    await reply(msg);
    await react("✅");

  } catch (error) {
    console.error("getsudo error:", error);
    await react("❌");
    await reply(`❌ Error: ${error.message}`);
  }
});


gmd({
  pattern: "mode",
  react: "⚙️",
  aliases: ['setmode', 'botmode'],
  category: "owner",
  description: "Switch bot mode between private and public",
}, async (from, Prince, conText) => {
  const { q, mek, reply, react, isSuperUser, getSetting, setSetting, config } = conText;

  if (!isSuperUser) {
    await react("❌");
    return reply("❌ Owner Only Command!");
  }

  const currentMode = getSetting('BOT_MODE', config.MODE || 'private').toLowerCase();

  if (!q) {
    const modeIcon = currentMode === 'public' ? '🌍' : '🔒';
    return reply(`${modeIcon} Current bot mode: *${currentMode}*\n\nUsage:\n• .mode private - Only owner/sudo can use commands\n• .mode public - Everyone can use commands`);
  }

  const newMode = q.trim().toLowerCase();

  if (newMode !== 'private' && newMode !== 'public') {
    await react("❌");
    return reply("❌ Invalid mode! Use *private* or *public*\n\n• .mode private - Only owner/sudo can use commands\n• .mode public - Everyone can use commands");
  }

  if (newMode === currentMode) {
    return reply(`⚠️ Bot is already in *${currentMode}* mode.`);
  }

  setSetting('BOT_MODE', newMode);

  const modeIcon = newMode === 'public' ? '🌍' : '🔒';
  await reply(`${modeIcon} Bot mode changed to *${newMode}*\n\n${newMode === 'private' ? '🔒 Only owner and sudo users can use commands now.' : '🌍 Everyone can now use bot commands.'}`);
  await react("✅");
});


gmd({
  pattern: "botname",
  react: "✏️",
  aliases: ['setbotname', 'renamebot'],
  category: "owner",
  description: "Change the bot name",
}, async (from, Prince, conText) => {
  const { q, reply, react, isSuperUser, getSetting, setSetting, botName } = conText;

  if (!isSuperUser) {
    await react("❌");
    return reply("❌ Owner Only Command!");
  }

  if (!q) {
    const currentName = getSetting('BOT_NAME', botName);
    return reply(`✏️ Current bot name: *${currentName}*\n\nUsage: .botname XHRIS MD V2`);
  }

  const newName = q.trim();
  setSetting('BOT_NAME', newName);

  await reply(`✅ Bot name changed to: *${newName}*`);
  await react("✅");
});


// setprefix défini dans prince/settings.js (version améliorée avec support null)

gmd({
  pattern: "botimg",
  react: "🖼️",
  aliases: ['setbotimg', 'botpic', 'setbotpic', 'botimage'],
  category: "owner",
  description: "Change the bot image",
}, async (from, Prince, conText) => {
  const { q, reply, react, isSuperUser, getSetting, setSetting, botPic, quoted, mek } = conText;

  if (!isSuperUser) {
    await react("❌");
    return reply("❌ Owner Only Command!");
  }

  const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;

  if (quotedImg) {
    await react("⏳");
    let tempFilePath;
    try {
      tempFilePath = await Prince.downloadAndSaveMediaMessage(quotedImg, 'temp_botimg');
      const imageBuffer = fs.readFileSync(tempFilePath);
      const result = await uploadToImgBB(imageBuffer, 'botimg.jpg');

      if (!result?.url) {
        await react("❌");
        return reply("❌ Failed to upload image. Try again.");
      }

      const newUrl = result.url;
      setSetting('BOT_PIC', newUrl);
      try { const cfg = require('../config'); cfg.BOT_PIC = newUrl; } catch (e) {}
      try { if (conText) conText.botPic = newUrl; } catch (e) {}

      await Prince.sendMessage(from, {
        image: { url: newUrl },
        caption: `✅ Bot image mise à jour !\n\n🖼️ Nouvelle image en cours d'utilisation.\n\n*URL :* ${newUrl}`,
      }, { quoted: mek });
      await react("✅");
    } catch (e) {
      console.error("BotImg upload error:", e);
      await react("❌");
      return reply("❌ Failed to upload image: " + e.message);
    } finally {
      if (tempFilePath) {
        try { fs.unlinkSync(tempFilePath); } catch (e) {}
      }
    }
    return;
  }

  if (!q) {
    const currentPic = getSetting('BOT_PIC', botPic);
    return reply(`🖼️ Current bot image:\n${currentPic}\n\nUsage:\n*.botimg <url>* - Set image from URL\n*Reply to an image* with *.botimg* to upload and set it`);
  }

  const newUrl = q.trim();

  if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
    await react("❌");
    return reply("❌ Please provide a valid URL starting with http:// or https://");
  }

  setSetting('BOT_PIC', newUrl);
  try { const cfg = require('../config'); cfg.BOT_PIC = newUrl; } catch (e) {}
  try { if (conText) conText.botPic = newUrl; } catch (e) {}

  await Prince.sendMessage(from, {
    image: { url: newUrl },
    caption: `✅ Bot image mise à jour !\n\n🖼️ Nouvelle image en cours d'utilisation.\n\n*URL :* ${newUrl}`,
  }, { quoted: mek });
  await react("✅");
});


gmd({
  pattern: "cmd",
  react: "👑",
  aliases: ['getcmd'],
  category: "owner",
  description: "Get and send a command",
}, async (from, Prince, conText) => {
  const { mek, reply, react, isSuperUser, q, botPrefix } = conText;

  if (!isSuperUser) {
    await react("❌");
    return reply("❌ Owner Only Command!");
  }

  if (!q) {
    await react("❌");
    return reply(`❌ Please provide a command name!\nExample: ${botPrefix}cmd owner`);
  }

  try {
    const commandName = q.toLowerCase();
    const commandData = commands.find(cmd => 
      cmd.pattern.toLowerCase() === commandName || 
      (cmd.aliases && cmd.aliases.some(alias => alias.toLowerCase() === commandName))
    );
    if (!commandData) {
      await react("❌");
      return reply("❌ Command not found!");
    }

    const commandPath = commandData.filename;
    const fullCode = await fs.promises.readFile(commandPath, 'utf-8');
    const extractCommand = (code, pattern) => {
      const possibleStarts = [
        `gmd({\n  pattern: "${pattern}"`,
        `gmd({\n  pattern: '${pattern}'`,
        `gmd({\n  pattern: \`${pattern}\``,
        `gmd({ pattern: "${pattern}"`,
        `gmd({ pattern: '${pattern}'`,
        `gmd({ pattern: \`${pattern}\``,
        `gmd({\n    pattern: "${pattern}"`,
        `gmd({\n    pattern: '${pattern}'`,
        `gmd({\n    pattern: \`${pattern}\``
      ];

      let startIndex = -1;
      for (const start of possibleStarts) {
        startIndex = code.indexOf(start);
        if (startIndex !== -1) break;
      }
      if (startIndex === -1) return null;
      let braceCount = 0;
      let inString = false;
      let stringChar = '';
      let escapeNext = false;
      let commandEnd = startIndex;

      for (let i = startIndex; i < code.length; i++) {
        const char = code[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (!inString && (char === '"' || char === "'" || char === '`')) {
          inString = true;
          stringChar = char;
          continue;
        }

        if (inString && char === stringChar) {
          inString = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (!inString) {
          if (char === '{' || char === '(') braceCount++;
          if (char === '}' || char === ')') braceCount--;

          if (braceCount === 0 && char === ')') {
            commandEnd = i + 1;
            break;
          }
        }
      }

      return code.substring(startIndex, commandEnd).trim();
    };

    let commandCode = extractCommand(fullCode, commandData.pattern) || 
                     "Could not extract command code";
    const response = `📁 *Command File:* ${path.basename(commandPath)}\n` +
                     `⚙️ *Command Name:* ${commandData.pattern}\n` +
                     `📝 *Description:* ${commandData.description || "Not provided"}\n\n` +
                     `📜 *Command Code:*\n\`\`\`\n${commandCode}\n\`\`\``;
    const fileName = commandName;
        const tempPath = path.join(__dirname, fileName);
        fsA.writeFileSync(tempPath, commandCode);
        await reply(response);
        await Prince.sendMessage(from, { 
            document: fsA.readFileSync(tempPath),
            mimetype: 'text/javascript',
            fileName: `${fileName}.js`
        }, { quoted: mek });
        fsA.unlinkSync(tempPath);
    await react("✅");
  } catch (error) {
    console.error("getcmd error:", error);
    await react("❌");
    await reply(`❌ Error: ${error.message}`);
  }
});


gmd({
  pattern: "jid",
  react: "👑",
  category: "owner",
  description: "Get User/Group JID",
}, async (from, Prince, conText) => {
  const { q, mek, reply, react, isGroup, isSuperUser, quotedUser } = conText;

  if (!isSuperUser) {
    await react("❌");
    return reply("❌ Owner Only Command!");
  }

  try {
    let result;
    
    if (quotedUser) {
      console.log(quotedUser);
      if (quotedUser.startsWith('@') && quotedUser.includes('@lid')) {
        result = quotedUser.replace('@', '') + '@lid';
      } else {
        result = quotedUser;
      }
    }
    else if (isGroup) {
      result = from;
    }
    else {
      result = from || mek.key.remoteJid; 
    }
    console.log(result);

    let finalResult = result;
    if (result && result.includes('@lid')) {
      finalResult = await Prince.getJidFromLid(result);
    }

    await reply(`${finalResult}`);
    await react("✅");

  } catch (error) {
    console.error("getjid error:", error);
    await react("❌");
    await reply(`❌ Error: ${error.message}`);
  }
});


gmd({
  pattern: "getlid",
  react: "👑",
  aliases: ['lid', 'userlid'],
  category: "Group",
  description: "Get User JID from LID",
}, async (from, Prince, conText) => {
  const { q, reply, react, isSuperUser, isGroup, quotedUser } = conText;

  if (!isGroup) {
    await react("❌");
    return reply("❌ Group Only Command!");
  }

  if (!q && !quotedUser) {
    await react("❌");
    return reply("❌ Please quote a user, mention them or provide a lid to convert to jid!");
  }

  if (!isSuperUser) {
    await react("❌");
    return reply("❌ Owner Only Command!");
  }

  try {
    let target = quotedUser || q;
    let conversionNote = "";

    if (target.startsWith('@') && !target.includes('@lid')) {
      target = target.replace('@', '') + '@lid';
      conversionNote = `\n\nℹ️ Converted from mention format`;
    }

    else if (!target.endsWith('@lid')) {
      try {
        const lid = await Prince.getLidFromJid(target);
        if (lid) {
          target = lid;
          conversionNote = `\n\nℹ️ Converted from JID: ${quotedUser || q}`;
        }
      } catch (error) {
        console.error("LID conversion error:", error);
        conversionNote = `\n\n⚠️ Could not convert (already in LID)`;
      }
    }

    await reply(`${target}${conversionNote}`);
    await react("✅");

  } catch (error) {
    console.error("getlid error:", error);
    await react("❌");
    await reply(`❌ Error: ${error.message}`);
  }
});


gmd({
  pattern: "owner",
  react: "👑",
  category: "owner",
  description: "Get Bot Owner.",
}, async (from, Prince, conText) => {
  const { mek, reply, react, isSuperUser, ownerNumber, ownerName, botName } = conText;
  
  if (!isSuperUser) {
    await react("❌");
    return reply(`Owner Only Command!`);
  }
 
  try {
    const vcard = 'BEGIN:VCARD\n'
          + 'VERSION:3.0\n' 
          + `FN:${ownerName}\n` 
          + `ORG:${botName};\n` 
          + `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:${ownerNumber}\n`
          + 'END:VCARD';
    
    await Prince.sendMessage(
      from,
      { 
        contacts: { 
          displayName: ownerName, 
          contacts: [{ vcard }] 
        }
      }, 
      { quoted: mek } 
    );
    
    await react("✅");
  } catch (error) {
    await react("❌");
    await reply(`❌ Failed: ${error.message}`);
  }
});


gmd({
  pattern: "gcpp",
  aliases: ['setgcpp', 'gcfullpp', 'fullgcpp'],
  react: "🔮",
  category: "owner",
  description: "Set group full profile picture without cropping.",
}, async (from, Prince, conText) => {
  const { mek, reply, react, sender, quoted, isGroup, isSuperUser, isAdmin } = conText;
  
  if (!isAdmin) {
    await react("❌");
    return reply(`Admin Only Command!`);
  }
  
  if (!isGroup) {
    await react("❌");
    return reply(`Command can only be used in groups!`);
  }
  
  let tempFilePath;
  try {
    const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
    if (!quotedImg) {
      await react("❌");
      return reply("Please quote an image");
    }
    tempFilePath = await Prince.downloadAndSaveMediaMessage(quotedImg, 'temp_media');
    
    const image = await Jimp.read(tempFilePath);
    const croppedImage = image.crop(0, 0, image.getWidth(), image.getHeight());
    const resizedImage = await croppedImage.scaleToFit(720, 720);
    const imageBuffer = await resizedImage.getBufferAsync(Jimp.MIME_JPEG);

    const pictureNode = {
      tag: "picture",
      attrs: { type: "image" },
      content: imageBuffer
    };

    const iqNode = {
      tag: "iq",
      attrs: {
        to: S_WHATSAPP_NET,
        type: "set",
        xmlns: "w:profile:picture",
        target: from
      },
      content: [pictureNode]
    };

    await Prince.query(iqNode);
    await react("✅");
    await fs.unlink(tempFilePath);
    await reply('✅ Group Profile picture updated successfully (full image)!');
    
  } catch (error) {
    console.error("Error updating group profile picture:", error);
    
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(console.error);
    }
    
    if (error.message.includes('not-authorized') || error.message.includes('forbidden')) {
      await reply("❌ I need to be an admin to update group profile picture!");
    } else {
      await reply(`❌ Failed to update group profile picture: ${error.message}`);
    }
    await react("❌");
  }
});




gmd({
  pattern: "fullpp",
  aliases: ['setfullpp'],
  react: "🔮",
  category: "owner",
  description: "Set full profile picture without cropping.",
}, async (from, Prince, conText) => {
  const { mek, reply, react, sender, quoted, isSuperUser } = conText;
  
  if (!isSuperUser) {
    await react("❌");
    return reply(`Owner Only Command!`);
  }
  let tempFilePath;
  try {
    const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
    if (!quotedImg) {
      await react("❌");
      return reply("Please quote an image");
    }
    tempFilePath = await Prince.downloadAndSaveMediaMessage(quotedImg, 'temp_media');
    
    const image = await Jimp.read(tempFilePath);
    const croppedImage = image.crop(0, 0, image.getWidth(), image.getHeight());
    const resizedImage = await croppedImage.scaleToFit(720, 720);
    const imageBuffer = await resizedImage.getBufferAsync(Jimp.MIME_JPEG);

    const pictureNode = {
      tag: "picture",
      attrs: { type: "image" },
      content: imageBuffer
    };

    const iqNode = {
      tag: "iq",
      attrs: {
        to: S_WHATSAPP_NET,
        type: "set",
        xmlns: "w:profile:picture"
      },
      content: [pictureNode]
    };

    await Prince.query(iqNode);
    await react("✅");
    await fs.unlink(tempFilePath);
    await reply('✅ Profile picture updated successfully (full image)!');
    
  } catch (error) {
    console.error("Error updating profile picture:", error);
    
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(console.error);
    }
    
    await reply(`❌ Failed to update profile picture: ${error.message}`);
    await react("❌");
  }
});


// Sends a user's profile card (pic, about, last updated)
async function sendUserProfile(Prince, from, conText, targetUser) {
  const { mek, reply, react, timeZone, botFooter } = conText;
  let profilePictureUrl;
  let statusText = "Not Found";
  let setAt = "Not Available";

  // Resolve the @lid to a real number (NOT only in groups)
  if (targetUser && targetUser.endsWith('@lid')) {
    try {
      const jid = await Prince.getJidFromLid(targetUser);
      if (jid && jid.endsWith('@s.whatsapp.net')) targetUser = jid;
    } catch (e) {}
  }

  // Helper: race a promise against a timeout to avoid hangs
  const withTimeout = (promise, ms) =>
    Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
    ]);

  try {
    profilePictureUrl = await withTimeout(Prince.profilePictureUrl(targetUser, "image"), 8000);
  } catch (e) {
    profilePictureUrl = "https://telegra.ph/file/9521e9ee2fdbd0d6f4f1c.jpg";
  }

  try {
    const statusData = await withTimeout(Prince.fetchStatus(targetUser), 8000);
    if (Array.isArray(statusData) && statusData.length > 0 && statusData[0].status) {
      statusText = statusData[0].status.status || "Not Found";
      setAt = statusData[0].status.setAt || "Not Available";
    } else if (statusData?.status) {
      statusText = statusData.status?.status || statusData.status || "Not Found";
      setAt = statusData.status?.setAt || statusData.setAt || "Not Available";
    }
  } catch (e) {}

  let formattedDate = "Not Available";
  if (setAt && setAt !== "Not Available") {
    try {
      formattedDate = moment(setAt).tz(timeZone).format('dddd, MMMM Do YYYY, h:mm A z');
    } catch (e) {}
  }

  const number = targetUser.replace(/@s\.whatsapp\.net$/, "").replace(/@lid$/, "");

  await Prince.sendMessage(
    from,
    {
      image: { url: profilePictureUrl },
      caption: `*👤 User Profile Information*\n\n` +
               `*• Name:* @${number}\n` +
               `*• Number:* ${number}\n` +
               `*• About:* ${statusText}\n` +
               `*• Last Updated:* ${formattedDate}\n\n` +
               `_${botFooter}_`,
      mentions: [targetUser],
      contextInfo: {
        mentionedJid: [targetUser],
        ...getContextInfo(targetUser, conText.newsletterJid, conText.botName),
      },
    },
    { quoted: mek }
  );
  await react("✅");
}

// Sends the current group's information card
async function sendGroupInfo(Prince, from, conText) {
  const { mek, react, botFooter } = conText;
  const meta = await Prince.groupMetadata(from);
  const fmt = (jid) => (jid ? `@${jid.split("@")[0]}` : "N/A");
  const admins = meta.participants.filter((p) => p.admin === "admin" || p.admin === "superadmin");

  let pic;
  try { pic = await Prince.profilePictureUrl(from, "image"); }
  catch { pic = "https://telegra.ph/file/9521e9ee2fdbd0d6f4f1c.jpg"; }

  const caption =
    `*👥 Group Information*\n\n` +
    `*• Name:* ${meta.subject || "N/A"}\n` +
    `*• ID:* ${meta.id}\n` +
    `*• Owner:* ${fmt(meta.ownerPn || meta.ownerJid || meta.owner)}\n` +
    `*• Members:* ${meta.participants.length}\n` +
    `*• Admins:* ${admins.length}\n` +
    `*• Created:* ${meta.creation ? new Date(meta.creation * 1000).toLocaleString() : "N/A"}\n` +
    `*• Description:* ${meta.desc || "None"}\n\n` +
    `_${botFooter}_`;

  await Prince.sendMessage(
    from,
    { image: { url: pic }, caption, contextInfo: getContextInfo(conText.sender, conText.newsletterJid, conText.botName) },
    { quoted: mek }
  );
  await react("✅");
}

gmd({
  pattern: "whois",
  aliases: ['profile', 'profil', 'userinfo'],
  react: "👤",
  category: "owner",
  description: "User info (reply/mention). In a group with no target, shows group info.",
}, async (from, Prince, conText) => {
  const { reply, react, sender, isGroup, quotedUser, mentionedJid, isSuperUser } = conText;

  if (!isSuperUser) {
    await react("❌");
    return reply(`Owner Only Command!`);
  }

  // Explicit target = a mentioned or replied user
  const explicit = (mentionedJid && mentionedJid[0]) || quotedUser || null;

  try {
    if (explicit) {
      return await sendUserProfile(Prince, from, conText, explicit);
    }
    if (isGroup) {
      return await sendGroupInfo(Prince, from, conText);
    }
    // DM with no target -> your own profile
    return await sendUserProfile(Prince, from, conText, sender);
  } catch (error) {
    console.error("Error in whois command:", error);
    await react("❌");
    return reply(`❌ An error occurred while fetching information.\nError: ${error.message}`);
  }
});

gmd({
  pattern: "whoisp",
  aliases: ['myinfo', 'me', 'mywhois'],
  react: "👤",
  category: "owner",
  description: "Show your own profile info (works anywhere).",
}, async (from, Prince, conText) => {
  const { reply, react, sender, quotedUser, mentionedJid, isSuperUser } = conText;

  if (!isSuperUser) {
    await react("❌");
    return reply(`Owner Only Command!`);
  }

  // Reply/mention -> that person; otherwise -> yourself
  const target = (mentionedJid && mentionedJid[0]) || quotedUser || sender;

  try {
    return await sendUserProfile(Prince, from, conText, target);
  } catch (error) {
    console.error("Error in whoisp command:", error);
    await react("❌");
    return reply(`❌ An error occurred while fetching profile information.\nError: ${error.message}`);
  }
});


gmd({
  pattern: "pp",
  aliases: ['setpp'],
  react: "🔮",
  category: "owner",
  description: "Set new profile picture.",
}, async (from, Prince, conText) => {
  const { mek, reply, react, sender, quoted, isSuperUser } = conText;
  
  if (!isSuperUser) {
    await react("❌");
    return reply(`Owner Only Command!`);
  }
  
  try {
    const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
    if (!quotedImg) {
      await react("❌");
      return reply("Please quote an image");
    }
    
    const tempFilePath = await Prince.downloadAndSaveMediaMessage(quotedImg, 'temp_media');
    const imageBuffer = await fs.readFile(tempFilePath);
    try {
      await Prince.updateProfilePicture(Prince.user.id, { url: tempFilePath });
      await reply('Profile picture updated successfully!');
      await react("✅");
    } catch (modernError) {
      console.log('Modern method failed, trying legacy method...');

      const iq = {
        tag: "iq",
        attrs: {
          to: S_WHATSAPP_NET,
          type: "set",
          xmlns: "w:profile:picture"
        },
        content: [{
          tag: "picture",
          attrs: {
            type: "image",
          },
          content: imageBuffer
        }]
      };
      
      await Prince.query(iq);
      await reply('Profile picture update requested (legacy method)');
      await react("✅");
    }
    await fs.unlink(tempFilePath).catch(console.error);
    
  } catch (error) {
    console.error("Error updating profile picture:", error);
    await reply(`❌ An error occurred: ${error.message}`);
    await react("❌");
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(console.error);
    }
  }
});


gmd({
  pattern: "getpp",
  aliases: ['stealpp', 'snatchpp'],
  react: "👀",
  category: "owner",
  description: "Download someone's profile picture.",
}, async (from, Prince, conText) => {
  const { mek, reply, react, sender, quoted, quotedMsg, newsletterJid, quotedUser, botName, botFooter, isSuperUser } = conText;
  
  if (!isSuperUser) {
    await react("❌");
    return reply(`Owner Only Command!`);
  }

  if (!quotedMsg) {
    await react("❌");
    return reply(`Please reply to/quote a user to get their profile picture!`);
  }
  
  let profilePictureUrl;
  
  try {
    if (quoted) {
      try {
        profilePictureUrl = await Prince.profilePictureUrl(quotedUser, "image");
        
      } catch (error) {
        await react("❌");
        return reply(`User does not have profile picture or they have set it to private!`);
      }

      await Prince.sendMessage(
        from,
        {
          image: { url: profilePictureUrl },
          caption: `Here is the Profile Picture\n\n> *${botFooter}*`,
          contextInfo: getContextInfo(quotedUser, conText.newsletterJid, conText.botName),
        },
        { quoted: mek }
      );
      await react("✅");
    }
  } catch (error) {
    console.error("Error processing profile picture:", error);
    await reply(`❌ An error occurred while fetching the profile picture.`);
    await react("❌");
  }
});


gmd({
  pattern: "getgcpp",
  aliases: ['stealgcpp', 'snatchgcpp'],
  react: "👀",
  category: "group",
  description: "Download group profile picture",
}, async (from, Prince, conText) => {
  const { mek, reply, react, isGroup, newsletterJid, botName, botFooter } = conText;
  
  if (!isGroup) {
    await react("❌");
    return reply("❌ This command only works in groups!");
  }

  try {
    let profilePictureUrl;
    try {
      profilePictureUrl = await Prince.profilePictureUrl(from, "image");
    } catch (error) {
      await react("❌");
      return reply("❌ This group has no profile picture set!");
    }

    await Prince.sendMessage(
      from,
      {
        image: { url: profilePictureUrl },
        caption: `🖼️ *Group Profile Picture*\n\n${botFooter ? `_${botFooter}_` : ''}`,
        contextInfo: getContextInfo(null, conText.newsletterJid, conText.botName),
      },
      { quoted: mek }
    );
    
    await react("✅");

  } catch (error) {
    console.error("getgcpp error:", error);
    await react("❌");
    await reply(`❌ Failed to get group picture: ${error.message}`);
  }
});


gmd({
  pattern: "vv",
  aliases: ['‎', 'reveal'],
  react: "🙄",
  category: "owner",
  description: "Reveal View Once Media (in chat)"
}, async (from, Prince, conText) => {
    const { mek, reply, quoted, react, botName, isSuperUser } = conText;

    if (!quoted) return reply(`Please reply to/quote a ViewOnce message`);
    if (!isSuperUser) return reply(`Owner Only Command!`);
    
    let viewOnceContent, mediaType;
    
    if (quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce || quoted.audioMessage?.viewOnce) {
        mediaType = Object.keys(quoted).find(key => 
            key.endsWith('Message') && 
            ['image', 'video', 'audio'].some(t => key.includes(t))
        );
        viewOnceContent = { [mediaType]: quoted[mediaType] };
    } 
    else if (quoted.viewOnceMessage) {
        viewOnceContent = quoted.viewOnceMessage.message;
        mediaType = Object.keys(viewOnceContent).find(key => 
            key.endsWith('Message') && 
            ['image', 'video', 'audio'].some(t => key.includes(t))
        );
    } else {
        return reply('Please reply to a view once media message.');
    }

    if (!mediaType) return reply('Unsupported ViewOnce message type.');

    let msg;
    let tempFilePath = null;

    try {
        const mediaMessage = {
            ...viewOnceContent[mediaType],
            viewOnce: false
        };

        tempFilePath = await Prince.downloadAndSaveMediaMessage(mediaMessage, 'temp_media');
        
        const caption = `${mediaMessage.caption}\n\n> *REVEALED BY ${botName}*`;
        const mime = mediaMessage.mimetype || '';

        if (mediaType.includes('image')) {
            msg = { 
                image: { url: tempFilePath }, 
                caption,
                mimetype: mime
            };
        } 
        else if (mediaType.includes('video')) {
            msg = { 
                video: { url: tempFilePath }, 
                caption,
                mimetype: mime
            };
        } 
        else if (mediaType.includes('audio')) {
            msg = { 
                audio: { url: tempFilePath }, 
                ptt: true, 
                mimetype: mime || 'audio/mp4' 
            };
        }

        await Prince.sendMessage(from, msg);
      await react("✅");
    } catch (e) {
        console.error("Error in vv command:", e);
        reply(`Error: ${e.message}`);
    } finally {
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
            } catch (cleanupError) {
                console.error("Failed to clean up temp file:", cleanupError);
            }
        }
    }
});

gmd({
  pattern: "vv2",
  aliases: ['‎2', 'reveal2'],
  react: "🙄",
  category: "owner",
  description: "Reveal View Once Media (to bot DM)"
}, async (from, Prince, conText) => {
    const { mek, reply, quoted, react, botName, isSuperUser } = conText;

    if (!quoted) return reply(`Please reply to/quote a ViewOnce message`);
    if (!isSuperUser) return reply(`Owner Only Command!`);

    let viewOnceContent, mediaType;
  
    if (quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce || quoted.audioMessage?.viewOnce) {
        mediaType = Object.keys(quoted).find(key => 
            key.endsWith('Message') && 
            ['image', 'video', 'audio'].some(t => key.includes(t))
        );
        viewOnceContent = { [mediaType]: quoted[mediaType] };
    } 
    else if (quoted.viewOnceMessage) {
        viewOnceContent = quoted.viewOnceMessage.message;
        mediaType = Object.keys(viewOnceContent).find(key => 
            key.endsWith('Message') && 
            ['image', 'video', 'audio'].some(t => key.includes(t))
        );
    } else {
        return reply('Please reply to a view once media message.');
    }

    if (!mediaType) return reply('Unsupported ViewOnce message type.');

    let msg;
    let tempFilePath = null;

    try {
        const mediaMessage = {
            ...viewOnceContent[mediaType],
            viewOnce: false
        };

        tempFilePath = await Prince.downloadAndSaveMediaMessage(mediaMessage, 'temp_media');
        
        const caption = `${mediaMessage.caption}\n\n> *REVEALED BY ${botName}*`;
        const mime = mediaMessage.mimetype || '';

        if (mediaType.includes('image')) {
            msg = { 
                image: { url: tempFilePath }, 
                caption,
                mimetype: mime
            };
        } 
        else if (mediaType.includes('video')) {
            msg = { 
                video: { url: tempFilePath }, 
                caption,
                mimetype: mime
            };
        } 
        else if (mediaType.includes('audio')) {
            msg = { 
                audio: { url: tempFilePath }, 
                ptt: true, 
                mimetype: mime || 'audio/mp4' 
            };
        }

        await Prince.sendMessage(Prince.user.id, msg);
      await react("✅");
    } catch (e) {
        console.error("Error in vv command:", e);
        reply(`Error: ${e.message}`);
    } finally {
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
            } catch (cleanupError) {
                console.error("Failed to clean up temp file:", cleanupError);
            }
        }
    }
});
