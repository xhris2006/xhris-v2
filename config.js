const fs = require('fs-extra');
const path = require("path");

module.exports = {
    SESSION_ID: process.env.SESSION_ID || '',
    PREFIX: process.env.PREFIX || ".",
    OWNER_NAME: process.env.OWNER_NAME || "𝐗𝐇𝐑𝐈𝐒 𝐌𝐃",
    OWNER_NUMBER: process.env.OWNER_NUMBER || "237694600007",
    SUDO_NUMBERS: process.env.SUDO_NUMBERS || "237694600007",
    BOT_NAME: process.env.BOT_NAME || '𝐗𝐇𝐑𝐈𝐒 𝐌𝐃 𝐕𝟐',
    FOOTER: process.env.FOOTER || 'ᴘᴏᴡᴇʀᴇᴅ ʙʏ xʜʀɪs ᴛᴇᴄʜ',
    CAPTION: process.env.CAPTION || '©𝟐𝟎𝟐𝟔 𝐗𝐇𝐑𝐈𝐒 𝐌𝐃 𝐕𝟐',
    VERSION: process.env.VERSION || '2.0.0',
    BOT_PIC: process.env.BOT_PIC || 'https://i.ibb.co/xqMvV7np/vw-EDOo-Tm-N0.jpg',
    MODE: process.env.MODE || "public",
    PM_PERMIT: process.env.PM_PERMIT || 'false',
    WARN_COUNT: process.env.WARN_COUNT || '3',
    TIME_ZONE: process.env.TIME_ZONE || "Africa/Douala",
    DM_PRESENCE: process.env.DM_PRESENCE || 'online',
    GC_PRESENCE: process.env.GC_PRESENCE || 'online',
    CHATBOT: process.env.CHATBOT || 'false',
    CHATBOT_MODE: process.env.CHATBOT_MODE || 'inbox',
    STARTING_MESSAGE: process.env.STARTING_MESSAGE || "true",
    ANTIDELETE: process.env.ANTIDELETE || 'indm',
    GOODBYE_MESSAGE: process.env.GOODBYE_MESSAGE || 'false',
    ANTICALL: process.env.ANTICALL || 'false',
    ANTICALL_MSG: process.env.ANTICALL_MSG || "*_📞 Auto Call Reject Mode Active. 📵 No Calls Allowed!_*",
    WELCOME_MESSAGE: process.env.WELCOME_MESSAGE || 'false',
    ANTILINK: process.env.ANTILINK || 'false',
    AUTO_LIKE_STATUS: process.env.AUTO_LIKE_STATUS || 'true',
    AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || 'true',
    STATUS_LIKE_EMOJIS: process.env.STATUS_LIKE_EMOJIS || "💛,❤️,💜,🤍,💙",
    AUTO_REPLY_STATUS: process.env.AUTO_REPLY_STATUS || "false",
    STATUS_REPLY_TEXT: process.env.STATUS_REPLY_TEXT || "*ʏᴏᴜʀ sᴛᴀᴛᴜs ᴠɪᴇᴡᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ ✅*",
    AUTO_REACT: process.env.AUTO_REACT || 'false',
    AUTO_REPLY: process.env.AUTO_REPLY || 'false',
    AUTO_READ_MESSAGES: process.env.AUTO_READ_MESSAGES || 'false',
    ANTI_BIO: process.env.AUTO_BIO || 'false',
    AUTO_BLOCK: process.env.AUTO_BLOCK || '212,233',
    MENTION_MODE: process.env.MENTION_MODE || 'warn',
    YT: process.env.YT || 'youtube.com/@xhrishost',
    NEWSLETTER_JID: process.env.NEWSLETTER_JID || '120363322606369079@newsletter',
    NEWSLETTER_NAME: process.env.NEWSLETTER_NAME || 'XHRIS MD',
    NEWSLETTER_URL: process.env.NEWSLETTER_URL || 'https://whatsapp.com/channel/0029Vark1I1AYlUR1G8YMX31',
    BOT_REPO: process.env.BOT_REPO || 'Eric-Xhris/XHRIS-MD-V2',
    PACK_NAME: process.env.PACK_NAME || '𝐗𝐇𝐑𝐈𝐒 𝐌𝐃 𝐕𝟐',
    PACK_AUTHOR: process.env.PACK_AUTHOR || '𝐗𝐇𝐑𝐈𝐒 𝐓𝐄𝐂𝐇'
};

let fileName = require.resolve(__filename);
fs.watchFile(fileName, () => {
    fs.unwatchFile(fileName);
    console.log(`Writing File: ${__filename}`);
    delete require.cache[fileName];
    require(fileName);
});
