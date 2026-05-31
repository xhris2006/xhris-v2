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

    // Mathematical Sans-Serif Bold Italic (𝘼𝘽𝘾 / 𝙖𝙗𝙘) + bold digits (𝟬-𝟵)
    const fb = (str) => {
        let out = "";
        for (const ch of String(str)) {
            const c = ch.codePointAt(0);
            if (c >= 0x41 && c <= 0x5A) out += String.fromCodePoint(0x1D63C + (c - 0x41));      // A-Z
            else if (c >= 0x61 && c <= 0x7A) out += String.fromCodePoint(0x1D656 + (c - 0x61)); // a-z
            else if (c >= 0x30 && c <= 0x39) out += String.fromCodePoint(0x1D7EC + (c - 0x30)); // 0-9
            else out += ch;
        }
        return out;
    };

    const uptime = formatUptime(process.uptime());
    const totalCommands = commands.filter((c) => c.pattern).length;
    const hostName = require('os').hostname();
    const prefix = botPrefix || '';

    const categorized = commands.reduce((menu, gmd) => {
        if (gmd.pattern && !gmd.dontAddCommandList) {
            const cat = gmd.category || 'misc';
            if (!menu[cat]) menu[cat] = [];
            menu[cat].push(gmd.pattern);
        }
        return menu;
    }, {});

    const catEmoji = {
        general: '✨', owner: '👑', admin: '👑', sudo: '👤',
        group: '⚖️', moderation: '⚖️',
        anti: '🛡️', security: '🛡️',
        auto: '🤖',
        downloader: '🎥', download: '🎥', media: '🎥',
        ai: '🧠',
        stalk: '🕵️',
        converter: '🎨', logo: '🎨',
        games: '🎮', game: '🎮', fun: '😂',
        tools: '🔧', tool: '🔧', utility: '🔧',
        settings: '⚙️', config: '⚙️',
        social: '👋', search: '🔎', info: 'ℹ️', store: '🛒', misc: '📁',
    };
    const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

    const header =
`╭──────────────────╮
│   ✨ *${fb(botName)}* ✨
├──────────────────┤
│ ⏱️ *${fb('Uptime')}* : ${fb(uptime)}
│ 🧠 *${fb('RAM')}* : ${fb(ram)}
│ 🖥️ *${fb('Host')}* : ${fb(hostName)}
│ ⚙️ *${fb('Mode')}* : ${fb(botMode || '')}
│ 🔧 *${fb('Prefix')}* : ${prefix || fb('none')}
│ 📦 *${fb('Commands')}* : ${fb(String(totalCommands))} ${fb('loaded')}
│ 🌐 *${fb('Version')}* : ${fb(String(botVersion))}
│ 🛡️ *${fb('License')}* : 🆓 ${fb('STANDARD')} (${fb('FREE')})
╰──────────────────╯

${fb('never try to succeed if you are not prepared to fail')}`;

    const formatCategory = (category, cmds) => {
        const emoji = catEmoji[category.toLowerCase()] || '📁';
        const head = `╭✨ *${fb('Catégorie')} :* ${emoji} ${fb(titleCase(category))}`;
        const body = cmds.map((c) => `│   ✦ ${prefix}${fb(c)}`).join('\n');
        const foot = `╰───────────────────────────💎`;
        return `${head}\n${body}\n${foot}`;
    };

    const blocks = Object.entries(categorized).map(([cat, cmds]) => formatCategory(cat, cmds));
    const menu = `${header}\n\n${blocks.join('\n\n')}`;

    const xhrisMess = {
        image: { url: botPic },
        caption: `${menu}\n\n> *${botFooter}*`,
        contextInfo: getContextInfo(sender, newsletterJid, botName)
    };
    await Prince.sendMessage(from, xhrisMess, { quoted: mek });
    await react("✅");
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
  description: "Check bot uptime status.",
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
  pattern: "alive",
  aliases: ['runtime', 'status'],
  react: "💚",
  category: "general",
  description: "Vérifie que le bot est en vie",
}, async (from, Prince, conText) => {
    const { mek, sender, react, pushName, botPic, botName, botMode, botVersion, botPrefix, botFooter, newsletterJid } = conText;

    const uptimeMs = Date.now() - BOT_START_TIME;
    const seconds = Math.floor((uptimeMs / 1000) % 60);
    const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
    const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);

    const text = `╭──「 *${botName} EST EN VIE* 」
│ ✅ Statut : Online
│ 👤 Utilisateur : ${pushName}
│ ⏱️ Uptime : ${hours}h ${minutes}m ${seconds}s
│ 🔧 Préfixe : ${botPrefix || 'aucun'}
│ ⚙️ Mode : ${botMode}
│ 🌐 Version : ${botVersion}
│ 💾 RAM : ${ram}
╰──

🚀 *Hébergement :* https://xhrishost.site
📢 *Chaîne :* https://whatsapp.com/channel/0029Vark1I1AYlUR1G8YMX31

> *${botFooter}*`;

    await Prince.sendMessage(from, {
      image: { url: botPic },
      caption: text,
      contextInfo: getContextInfo(sender, newsletterJid, botName)
    }, { quoted: mek });
    await react("✅");
});


gmd({
  pattern: "dev",
  aliases: ['xhris', 'about', 'aboutdev'],
  react: "👨‍💻",
  category: "general",
  description: "À propos du développeur XHRIS",
}, async (from, Prince, conText) => {
    const { mek, sender, react, botName, botFooter, newsletterJid } = conText;

    const text = `╭──「 *À PROPOS DE XHRIS* 」
│ 👨‍💻 Nom : XHRIS TECH
│ 🇨🇲 Pays : Cameroun
│ 📱 WhatsApp : +237 694 600 007
│ 🌐 Site : https://xhrishost.site
│ 📺 Chaîne : XHRIS MD
│ 🎓 Spécialité : Bots WhatsApp & Hébergement
╰──

Bonjour ! Je suis *XHRIS*, développeur camerounais passionné par la création de bots WhatsApp et de services d'hébergement.

XHRIS MD V2 est mon bot maison, optimisé pour la stabilité et la fluidité. Si tu utilises XHRIS HOST, tu profites du déploiement 1-click avec auto-scaling.

Rejoins-nous sur la chaîne pour les nouveautés !

📢 https://whatsapp.com/channel/0029Vark1I1AYlUR1G8YMX31

> *${botFooter}*`;

    await Prince.sendMessage(from, {
      text,
      contextInfo: getContextInfo(sender, newsletterJid, botName)
    }, { quoted: mek });
    await react("✅");
});


gmd({
  pattern: "save",
  aliases: ['sv', 's', 'sav'],
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
      mediaData = { image: buffer, caption: quotedMsg.imageMessage.caption || "" };
    } else if (quotedMsg.videoMessage) {
      const buffer = await getMediaBuffer(quotedMsg.videoMessage, "video");
      mediaData = { video: buffer, caption: quotedMsg.videoMessage.caption || "" };
    } else if (quotedMsg.audioMessage) {
      const buffer = await getMediaBuffer(quotedMsg.audioMessage, "audio");
      mediaData = { audio: buffer, mimetype: "audio/mp4" };
    } else if (quotedMsg.stickerMessage) {
      const buffer = await getMediaBuffer(quotedMsg.stickerMessage, "sticker");
      mediaData = { sticker: buffer };
    } else if (quotedMsg.conversation || quotedMsg.extendedTextMessage?.text) {
      mediaData = { text: quotedMsg.conversation || quotedMsg.extendedTextMessage.text };
    } else {
      return reply(`❌ Unsupported message type.`);
    }

    await Prince.sendMessage(sender, mediaData, { quoted: mek });
    await react("✅");
  } catch (error) {
    console.error("Save Error:", error);
    await reply(`❌ Failed to save the message. Error: ${error.message}`);
  }
});


// ─── CHARGER LES COMMANDES CUSTOM au démarrage ───────────────────────────────
(function loadCustomCommands() {
  try {
    const fs   = require('fs');
    const path = require('path');
    const customCmdsPath = path.join(__dirname, '..', 'data', 'custom-cmds.json');

    if (!fs.existsSync(customCmdsPath)) return;

    const cmds = JSON.parse(fs.readFileSync(customCmdsPath, 'utf8'));
    let count = 0;

    for (const [name, response] of Object.entries(cmds)) {
      gmd({
        pattern: name,
        category: "custom",
        description: `Commande custom: ${name}`,
        dontAddCommandList: false,
      }, async (from, Prince, conText) => {
        const { reply, react } = conText;
        await reply(response);
        await react("✅");
      });
      count++;
    }

    if (count > 0) console.log(`✅ ${count} commande(s) custom chargée(s)`);
  } catch (e) {
    console.error('❌ Failed to load custom cmds:', e.message);
  }
})();
