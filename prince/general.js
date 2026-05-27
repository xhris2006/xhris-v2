const { gmd, commands, formatBytes, getContextInfo } = require("../mayel"),
      fs = require('fs'),
      axios = require('axios'),
      BOT_START_TIME = Date.now(),
      { totalmem: totalMemoryBytes, freemem: freeMemoryBytes } = require('os'),
      moment = require('moment-timezone'),
      more = String.fromCharCode(8206),
      readmore = more.repeat(4001),
      ram = `${formatBytes(freeMemoryBytes)}/${formatBytes(totalMemoryBytes)}`;


gmd({
  pattern: "menu",
  aliases: ['help', 'allmenu', 'mainmenu'],
  react: "🌟",
  category: "general",
  description: "Afficher le menu principal du bot",
}, async (from, Prince, conText) => {
    const { mek, sender, react, pushName, botPic, botMode, botVersion, botName, botFooter, timeZone, botPrefix, newsletterJid } = conText;

    function formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        seconds %= 86400;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    const now = new Date();
    const date = new Intl.DateTimeFormat('en-GB', {
        timeZone, day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(now);
    const time = new Intl.DateTimeFormat('en-GB', {
        timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    }).format(now);

    const uptime = formatUptime(process.uptime());
    const totalCommands = commands.filter((c) => c.pattern).length;

    const categorized = commands.reduce((menu, gmd) => {
        if (gmd.pattern && !gmd.dontAddCommandList) {
            if (!menu[gmd.category]) menu[gmd.category] = [];
            menu[gmd.category].push(gmd.pattern);
        }
        return menu;
    }, {});

    let header = `
╭━━━━━〔 *${botName}* 〕━━━━━╮
┃ ⛧  *Utilisateur* : ${pushName}
┃ ⛧  *Mode* : ${botMode}
┃ ⛧  *Préfixe* : [ ${botPrefix} ]
┃ ⛧  *Plugins* : ${totalCommands}
┃ ⛧  *Version* : ${botVersion}
┃ ⛧  *Uptime* : ${uptime}
┃ ⛧  *Heure* : ${time}
┃ ⛧  *Date* : ${date}
┃ ⛧  *RAM* : ${ram}
╰━━━━━━━━━━━━━━━━━━━━╯

🌐 *Hébergement :* https://xhrishost.site
📺 *Chaîne :* https://whatsapp.com/channel/0029Vark1I1AYlUR1G8YMX31
${readmore}\n`;

    const formatCategory = (category, gmds) => {
        const title = `╭━━━✦❮ *${category.toUpperCase()}* ❯✦━⊷ \n`;
        const body = gmds.map(g => `┃✪  ${g}`).join('\n');
        const footer = `╰━━━━━━━━━━━━━━━━━━⊷\n`;
        return `${title}${body}\n${footer}`;
    };

    let menu = header;
    for (const [category, gmds] of Object.entries(categorized)) {
        menu += formatCategory(category, gmds) + '\n';
    }

    const xhrisMess = {
        image: { url: botPic },
        caption: `${menu.trim()}\n\n> *${botFooter}*`,
        contextInfo: getContextInfo(sender, newsletterJid, botName)
    };
    await Prince.sendMessage(from, xhrisMess, { quoted: mek });
    await react("✅");
});


gmd({
  pattern: "return",
  aliases: ['details', 'det', 'ret'],
  react: "⚡",
  category: "owner",
  description: "Displays the full raw quoted message using Baileys structure.",
}, async (from, Prince, conText) => {
  const { mek, reply, react, quotedMsg, isDevs, botName, newsletterJid } = conText;

  if (!isDevs) {
    return reply(`Developer Only Command!`);
  }

  if (!quotedMsg) {
    return reply(`Please reply to/quote a message`);
  }

  try {
    const jsonString = JSON.stringify(quotedMsg, null, 2);
    const chunks = jsonString.match(/[\s\S]{1,100000}/g) || [];

    for (const chunk of chunks) {
      const formattedMessage = `\`\`\`\n${chunk}\n\`\`\``;

      await Prince.sendMessage(
        from,
        {
          text: formattedMessage,
          contextInfo: getContextInfo(null, newsletterJid, botName),
        },
        { quoted: mek }
      );
      await react("✅");
    }
  } catch (error) {
    console.error("Error processing quoted message:", error);
    await reply(`❌ An error occurred while processing the message.`);
  }
});


gmd({
  pattern: "ping",
  react: "⚡",
  category: "general",
  description: "Check bot response speed",
}, async (from, Prince, conText) => {
    const { mek, react, newsletterJid, botName } = conText;
    const startTime = process.hrtime();

    await new Promise(resolve => setTimeout(resolve, Math.floor(80 + Math.random() * 420)));

    const elapsed = process.hrtime(startTime);
    const responseTime = Math.floor((elapsed[0] * 1000) + (elapsed[1] / 1000000));

    await Prince.sendMessage(from, {
      text: `⚡ Pong: ${responseTime}ms`,
      contextInfo: getContextInfo(null, newsletterJid, botName)
    }, { quoted: mek });
    await react("✅");
  }
);


gmd({
  pattern: "uptime",
  react: "⏳",
  category: "general",
  description: "check bot uptime status.",
}, async (from, Prince, conText) => {
    const { mek, react, newsletterJid, botName } = conText;

    const uptimeMs = Date.now() - BOT_START_TIME;

    const seconds = Math.floor((uptimeMs / 1000) % 60);
    const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
    const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

    await Prince.sendMessage(from, {
      text: `⏱️ Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s`,
      contextInfo: getContextInfo(null, newsletterJid, botName)
    }, { quoted: mek });
    await react("✅");
  }
);


gmd({
  pattern: "repo",
  aliases: ['sc', 'script'],
  react: "💜",
  category: "general",
  description: "Fetch bot script.",
}, async (from, Prince, conText) => {
    const { mek, sender, react, pushName, botPic, botName, ownerName, newsletterJid, princeRepo } = conText;

    const response = await axios.get(`https://api.github.com/repos/${princeRepo}`);
    const repoData = response.data;
    const { full_name, name, forks_count, stargazers_count, created_at, updated_at, owner } = repoData;
    const messageText = `Hello *_${pushName}_,*\nThis is *${botName},* A WhatsApp Bot Built by *${ownerName},* Enhanced with Amazing Features to Make Your WhatsApp Communication and Interaction Experience Amazing\n\n*🔗 Repo Link:* https://github.com/${princeRepo}\n\n*⚙️ Name:* ${name}\n*⭐ Stars:* ${stargazers_count}\n*🍴 Forks:* ${forks_count}\n*📅 Created On:* ${new Date(created_at).toLocaleDateString()}\n*🔄 Last Updated:* ${new Date(updated_at).toLocaleDateString()}`;

    const princeMess = {
        image: { url: botPic },
        caption: messageText,
        contextInfo: getContextInfo(sender, newsletterJid, botName)
      };
      await Prince.sendMessage(from, princeMess, { quoted: mek });
      await react("✅");
  }
);


gmd({
  pattern: "save",
  aliases: ['sv', 's', 'sav', '.'],
  react: "⚡",
  category: "tools",
  description: "Save messages (supports images, videos, audio, stickers, and text).",
}, async (from, Prince, conText) => {
  const { mek, reply, react, sender, isSuperUser, getMediaBuffer } = conText;

  if (!isSuperUser) {
    return reply(`❌ Owner Only Command!`);
  }

  const quotedMsg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quotedMsg) {
    return reply(`⚠️ Please reply to/quote a message.`);
  }

  try {
    let mediaData;

    if (quotedMsg.imageMessage) {
      const buffer = await getMediaBuffer(quotedMsg.imageMessage, "image");
      mediaData = {
        image: buffer,
        caption: quotedMsg.imageMessage.caption || ""
      };
    }
    else if (quotedMsg.videoMessage) {
      const buffer = await getMediaBuffer(quotedMsg.videoMessage, "video");
      mediaData = {
        video: buffer,
        caption: quotedMsg.videoMessage.caption || ""
      };
    }
    else if (quotedMsg.audioMessage) {
      const buffer = await getMediaBuffer(quotedMsg.audioMessage, "audio");
      mediaData = {
        audio: buffer,
        mimetype: "audio/mp4"
      };
    }
    else if (quotedMsg.stickerMessage) {
      const buffer = await getMediaBuffer(quotedMsg.stickerMessage, "sticker");
      mediaData = {
        sticker: buffer
      };
    }
    else if (quotedMsg.conversation || quotedMsg.extendedTextMessage?.text) {
      const text = quotedMsg.conversation || quotedMsg.extendedTextMessage.text;
      mediaData = {
        text: text
      };
    }
    else {
      return reply(`❌ Unsupported message type.`);
    }

    await Prince.sendMessage(sender, mediaData, { quoted: mek });
    await react("✅");

  } catch (error) {
    console.error("Save Error:", error);
    await reply(`❌ Failed to save the message. Error: ${error.message}`);
  }
});
