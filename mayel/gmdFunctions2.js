const fs = require("fs-extra");
const path = require("path");
const { pipeline } = require("stream/promises");
const config = require("../config");
const { createContext } = require("./gmdHelpers");
const { getSetting, addWarning, resetWarnings } = require("./gmdSudoUtil");
const logger = require("prince-baileys/lib/Utils/logger").default.child({});
const { isJidGroup, downloadMediaMessage, getContentType } = require("prince-baileys");
const axios = require("axios");
const { callApiWithFallback } = require("./apiFallback");

const {
    CHATBOT: chatBot,
    ANTICALL: antiCall,
    ANTICALL_MSG: antiCallMsg,
    DM_PRESENCE: dmPresence,
    GC_PRESENCE: groupPresence,
    MODE: botMode, 
    FOOTER: botFooter,
    BOT_NAME: botName,
    BOT_PIC: botPic, 
    TIME_ZONE: tZ,
    ANTIDELETE: antiDelete,
} = config;

const isAnyLink = (message) => {
    const linkPattern = /https?:\/\/[^\s]+/;
    return linkPattern.test(message);
};

const emojis = ['💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍'];

const PrinceApiKey = 'prince_api_56yjJ568dte4';
const PrinceTechApi = 'https://api.princetechn.com';

async function PrinceAutoReact(emoji, ms, Prince) {
    try {
        await Prince.sendMessage(ms.key.remoteJid, { react: { text: emoji, key: ms.key } });
    } catch (error) {
        console.error('Error sending auto reaction:', error);
    }
}

const PrinceAntiLink = async (Prince, message, antiLink) => {
    try {
        if (!message?.message || message.key.fromMe) return;
        const from = message.key.remoteJid; 
        const sender = message.key.participant || message.key.remoteJid;
        if (!from.endsWith('@g.us') || antiLink === 'false') return;

        const groupMetadata = await Prince.groupMetadata(from);
        const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;
        if (isAdmin) return;

        const messageType = getContentType(message.message);
        const body = messageType === 'conversation' ? message.message.conversation : message.message[messageType]?.text || message.message[messageType]?.caption || '';
        if (!body || !isAnyLink(body)) return;

        await Prince.sendMessage(from, { delete: message.key });

        if (antiLink === 'kick') {
            await Prince.groupParticipantsUpdate(from, [sender], 'remove');
            await Prince.sendMessage(from, { text: `⚠️ Anti-link active!\nUser @${sender.split('@')[0]} has been kicked.`, mentions: [sender] });
        } else if (antiLink === 'delete') {
            await Prince.sendMessage(from, { text: `⚠️ Links are not allowed here @${sender.split('@')[0]}!`, mentions: [sender] });
        } else if (antiLink === 'warn') {
            const warnings = await addWarning(from, sender, "Anti-Link");
            if (warnings >= 3) {
                await Prince.groupParticipantsUpdate(from, [sender], 'remove');
                await Prince.sendMessage(from, { text: `🚫 @${sender.split('@')[0]} kicked (3 warnings).`, mentions: [sender] });
                await resetWarnings(from, sender);
            } else {
                await Prince.sendMessage(from, { text: `⚠️ Warning @${sender.split('@')[0]}! (${warnings}/3)`, mentions: [sender] });
            }
        }
    } catch (err) { console.error('Anti-link error:', err); }
};

// Detects other WhatsApp bots by their Baileys message-ID signature (BAE5...)
// and removes / silences them. `mode`: 'true'/'kick' = delete + remove, 'delete' = delete only.
const PrinceAntiBot = async (Prince, message, mode) => {
    try {
        if (!message?.message || message.key.fromMe) return;
        if (!mode || mode === 'false') return;
        const from = message.key.remoteJid;
        if (!from || !from.endsWith('@g.us')) return;

        const msgId = message.key.id || '';
        // Baileys-generated IDs start with "BAE5"; real phone/web clients do not.
        if (!/^BAE5[0-9A-F]{6,}$/i.test(msgId)) return;

        const sender = message.key.participant || message.key.remoteJid;
        const norm = (j) => (j || '').split('@')[0].split(':')[0].replace(/\D/g, '');
        const botNum = norm(Prince.user?.id);
        const botLidNum = norm(Prince.user?.lid);
        const senderNum = norm(sender);
        if (senderNum && (senderNum === botNum || senderNum === botLidNum)) return;

        const meta = await Prince.groupMetadata(from);
        const isPart = (p, num) => {
            const idN = norm(p.id);
            const lidN = norm(p.lid);
            const pnN = norm(p.pn);
            return idN === num || lidN === num || pnN === num;
        };
        const botIsAdmin = meta.participants.some(
            (p) => (isPart(p, botNum) || isPart(p, botLidNum)) &&
                   (p.admin === 'admin' || p.admin === 'superadmin'),
        );
        if (!botIsAdmin) return;

        const senderIsAdmin = meta.participants.some(
            (p) => isPart(p, senderNum) &&
                   (p.admin === 'admin' || p.admin === 'superadmin'),
        );
        if (senderIsAdmin) return; // never touch admins

        try { await Prince.sendMessage(from, { delete: message.key }); } catch (e) {}

        if (mode === 'delete') {
            await Prince.sendMessage(from, {
                text: `🤖 Anti-Bot: bot message from @${senderNum} deleted.`,
                mentions: [sender],
            });
        } else {
            try { await Prince.groupParticipantsUpdate(from, [sender], 'remove'); } catch (e) {}
            await Prince.sendMessage(from, {
                text: `🤖 Anti-Bot active!\n@${senderNum} was detected as a bot and removed.`,
                mentions: [sender],
            });
        }
    } catch (err) { console.error('Anti-bot error:', err); }
};

const PrinceStatusMention = async (Prince, message, mode) => {
    try {
        if (!message?.message || message.key.fromMe) return;
        const from = message.key.remoteJid;
        const sender = message.key.participant || message.key.remoteJid;
        if (!from.endsWith('@g.us') || mode === 'false') return;

        const groupMetadata = await Prince.groupMetadata(from);
        const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin;
        if (isAdmin) return;
        
        await Prince.sendMessage(from, { delete: message.key });

        if (mode === 'kick') {
            await Prince.groupParticipantsUpdate(from, [sender], 'remove');
            await Prince.sendMessage(from, { text: `🚫 @${sender.split('@')[0]} kicked for tagging everyone.`, mentions: [sender] });
        } else if (mode === 'delete') {
            await Prince.sendMessage(from, { text: `⚠️ Tagging everyone is not allowed @${sender.split('@')[0]}!`, mentions: [sender] });
        } else if (mode === 'warn') {
            const warnings = await addWarning(from, sender, "Status Mention");
            if (warnings >= 3) {
                await Prince.groupParticipantsUpdate(from, [sender], 'remove');
                await Prince.sendMessage(from, { text: `🚫 @${sender.split('@')[0]} kicked (3 warnings).`, mentions: [sender] });
                await resetWarnings(from, sender);
            } else {
                await Prince.sendMessage(from, { text: `⚠️ Warning @${sender.split('@')[0]}! (${warnings}/3)`, mentions: [sender] });
            }
        }
    } catch (err) { console.error('Status mention error:', err); }
};

const PrinceAutoBio = async (Prince) => {
    try {
        const hour = new Date().getHours();
        const bioText = `${botName} Active || ${new Date().toLocaleDateString()}`;
        await Prince.updateProfileStatus(bioText);
    } catch (e) {}
};

// ── Chatbot state & helpers ──────────────────────────────────────────────────
const chatbotMuted = new Set(); // chat JIDs that asked the bot to stop

// Words that tell the bot to stop replying (multi-language)
const STOP_WORDS = [
    "stop", "stfu", "shut up", "shutup", "stop talking", "leave me alone", "go away", "enough",
    "arrete", "arrête", "arreter", "arrêter", "arrete toi", "arrête de repondre", "arrête de répondre",
    "arrete de repondre", "tais toi", "tais-toi", "taistoi", "ta gueule", "tagueule", "la ferme",
    "ferme la", "ferme-la", "silence", "chut", "laisse moi", "laisse-moi", "ca suffit", "ça suffit",
    "basta", "callate", "cállate", "cala boca", "halt die klappe", "ruhe", "uskut", "kelele",
];
// Words that re-enable the bot after a stop
const RESUME_WORDS = [
    "start", "resume", "come back", "wake up", "talk to me",
    "reviens", "reprends", "reprend", "continue", "parle", "repond", "réponds", "reponds",
    "chatbot", "reactive", "réactive", "activetoi",
];
const buildWordRegex = (words) =>
    new RegExp(
        "(^|[^\\p{L}])(" +
            words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
            ")([^\\p{L}]|$)",
        "iu",
    );
const STOP_RE = buildWordRegex(STOP_WORDS);
const RESUME_RE = buildWordRegex(RESUME_WORDS);

// Detect a downloadable media link and its platform
function chatbotMediaUrl(text) {
    const m = text.match(/https?:\/\/[^\s]+/i);
    if (!m) return null;
    const url = m[0];
    const u = url.toLowerCase();
    if (u.includes("tiktok.com")) return { platform: "tiktok", url };
    if (u.includes("instagram.com")) return { platform: "instagram", url };
    if (u.includes("facebook.com") || u.includes("fb.watch")) return { platform: "facebook", url };
    if (u.includes("twitter.com") || u.includes("x.com")) return { platform: "twitter", url };
    if (u.includes("youtube.com") || u.includes("youtu.be")) return { platform: "youtube", url };
    return null;
}

// Resolve a media link to a direct video URL via the site APIs
async function chatbotResolveMedia(platform, url) {
    const pick = (r, ...keys) => {
        for (const k of keys) {
            const v = r?.[k];
            if (typeof v === "string" && v) return v;
        }
        return null;
    };
    try {
        if (platform === "tiktok") {
            const r = await callApiWithFallback("download/tiktok", { url });
            const res = r.success ? (r.data?.result || r.data) : null;
            return res && pick(res, "video", "video_url", "play", "hdplay", "nowm", "url");
        }
        if (platform === "instagram") {
            const r = await callApiWithFallback("download/instadl", { url });
            const res = r.success ? (r.data?.result || r.data) : null;
            let v = res && pick(res, "download_url", "url", "video");
            if (!v && Array.isArray(res?.media) && res.media[0]) v = res.media[0].url || res.media[0];
            return v;
        }
        if (platform === "facebook") {
            const r = await callApiWithFallback("download/facebook", { url });
            const res = r.success ? (r.data?.result || r.data) : null;
            return res && pick(res, "hd_video", "sd_video", "hd", "sd", "url");
        }
        if (platform === "twitter") {
            const r = await callApiWithFallback("download/twitter", { url });
            const res = r.success ? (r.data?.result || r.data) : null;
            if (Array.isArray(res?.videoUrls) && res.videoUrls[0]) return res.videoUrls[0].url || res.videoUrls[0];
            return res && pick(res, "url", "video");
        }
        if (platform === "youtube") {
            const r = await callApiWithFallback("download/ytmp4", { url });
            const res = r.success ? (r.data?.result || r.data) : null;
            return res && pick(res, "download_url", "downloadUrl", "url", "video");
        }
    } catch (e) {}
    return null;
}

// Web search via DuckDuckGo Instant Answer → text with real links
async function chatbotWebSearch(query) {
    try {
        const res = await axios.get("https://api.duckduckgo.com/", {
            params: { q: query, format: "json", no_html: 1, t: "xhris" },
            timeout: 15000,
        });
        const d = res.data || {};
        const lines = [];
        if (d.Heading) lines.push(`*${d.Heading}*`);
        if (d.AbstractText) lines.push(d.AbstractText);
        if (d.AbstractURL) lines.push(`🔗 ${d.AbstractURL}`);
        const links = [];
        const collect = (arr) => {
            for (const t of arr || []) {
                if (links.length >= 5) break;
                if (t.FirstURL && t.Text) links.push(`• ${t.Text}\n  ${t.FirstURL}`);
                else if (Array.isArray(t.Topics)) collect(t.Topics);
            }
        };
        collect(d.RelatedTopics);
        if (links.length) {
            lines.push("", "*🔎 Links:*");
            lines.push(...links.slice(0, 5));
        }
        return lines.length ? lines.join("\n") : null;
    } catch (e) {
        return null;
    }
}

// Detect an explicit web-search request and extract the query
function chatbotSearchQuery(body) {
    const m = body.match(/^\s*(cherche|recherche|recherches|search|google|look ?up|browse)\b[:,]?\s+(.+)/i);
    return m ? m[2].trim() : null;
}

// Rough language guess (used only to pick the TTS voice)
function detectTtsLang(text) {
    const t = " " + text.toLowerCase() + " ";
    if ([" le ", " la ", " les ", " je ", " tu ", " est ", " et ", " bonjour ", " merci", " salut", " pourquoi", " comment", " ça ", " oui ", " non ", " quoi "].some((w) => t.includes(w))) return "fr";
    if ([" hola ", " gracias", " porque", " qué ", " cómo ", " el ", " los ", " que ", " para "].some((w) => t.includes(w))) return "es";
    return "en";
}

function PrinceChatBot(Prince, chatBot, chatBotMode, createContext, createContext2, googleTTS) {
    Prince.ev.on("messages.upsert", async ({ messages, type }) => {
        try {
            if (type && type !== "notify") return;
            const msg = messages[0];
            if (!msg?.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            if (!from || from === "status@broadcast" || from.endsWith("@newsletter")) return;

            // Live settings (overridable via .setchatbot / .setchatbotmode)
            const mode = String(getSetting("CHATBOT", chatBot || "false")).toLowerCase();
            if (["false", "off", "", "no", "0"].includes(mode)) return;

            const scope = String(getSetting("CHATBOT_MODE", chatBotMode || "inbox")).toLowerCase();
            const isGroup = from.endsWith("@g.us");
            if (scope === "inbox" && isGroup) return;
            if (scope === "groups" && !isGroup) return;
            // "allchats" → respond everywhere

            // Extract the text body
            const mtype = getContentType(msg.message);
            let body =
                mtype === "conversation" ? msg.message.conversation :
                mtype === "extendedTextMessage" ? msg.message.extendedTextMessage?.text :
                mtype === "imageMessage" ? msg.message.imageMessage?.caption :
                mtype === "videoMessage" ? msg.message.videoMessage?.caption : "";
            body = (body || "").trim();
            if (!body) return;

            // Ignore bot commands
            const prefix = String(getSetting("PREFIX", config.PREFIX || "."));
            if (prefix && body.startsWith(prefix)) return;

            const botNum = (Prince.user?.id || "").split(":")[0].split("@")[0];

            // In groups, only reply when the bot is mentioned or its message is replied to
            if (isGroup) {
                const ci = msg.message?.extendedTextMessage?.contextInfo;
                const mentioned = (ci?.mentionedJid || []).some((j) => j.includes(botNum));
                const repliedToBot = ci?.participant ? ci.participant.includes(botNum) : false;
                if (!mentioned && !repliedToBot) return;
                body = body.replace(/@\d+/g, "").trim();
                if (!body) return;
            }

            // ── Stop / resume control ──
            if (chatbotMuted.has(from)) {
                if (RESUME_RE.test(body)) {
                    chatbotMuted.delete(from);
                    await Prince.sendMessage(from, { text: "👋 I'm back! / Je suis de retour !" }, { quoted: msg });
                }
                return; // stay silent while muted
            }
            if (body.length <= 60 && STOP_RE.test(body)) {
                chatbotMuted.add(from);
                await Prince.sendMessage(from, { text: "🤐 Okay, I'll stop replying. Say *start* / *reviens* when you want me back." }, { quoted: msg });
                return;
            }

            try { await Prince.sendPresenceUpdate("composing", from); } catch (e) {}

            // ── 1) Download media from a link ──
            const media = chatbotMediaUrl(body);
            if (media) {
                const videoUrl = await chatbotResolveMedia(media.platform, media.url);
                if (videoUrl) {
                    try {
                        await Prince.sendMessage(from, {
                            video: { url: videoUrl },
                            mimetype: "video/mp4",
                            caption: `✅ Downloaded from ${media.platform}.`,
                        }, { quoted: msg });
                    } catch (e) {
                        await Prince.sendMessage(from, { text: `❌ Found the ${media.platform} media but couldn't send it (too large or unavailable).` }, { quoted: msg });
                    }
                } else {
                    await Prince.sendMessage(from, { text: `❌ I couldn't download that ${media.platform} link. It may be private or unavailable.` }, { quoted: msg });
                }
                return;
            }

            // ── 2) Explicit web search ──
            const sq = chatbotSearchQuery(body);
            if (sq) {
                const results = await chatbotWebSearch(sq);
                await Prince.sendMessage(from, { text: results || `🔎 No results found for *${sq}*.` }, { quoted: msg });
                return;
            }

            // ── 3) AI chat (mirrors the user's language) ──
            const prompt =
                `You are ${botName}, a friendly WhatsApp assistant. ` +
                `Always reply in the SAME language the user writes in (French, English, Spanish, or any other). ` +
                `Keep answers natural, helpful and concise.\n\nUser: ${body}`;
            let answer = "";
            try {
                const res = await axios.get(`${PrinceTechApi}/api/ai/gpt`, {
                    params: { apikey: PrinceApiKey, q: prompt },
                    timeout: 30000,
                });
                const d = res.data;
                answer = d?.result || d?.response || d?.answer || d?.text || d?.data || "";
            } catch (e) {
                answer = "";
            }
            if (!answer || typeof answer !== "string") return;

            // Voice reply when CHATBOT is set to audio/voice
            if ((mode === "audio" || mode === "voice") && googleTTS) {
                try {
                    const ttsLang = detectTtsLang(body);
                    const urls = googleTTS.getAllAudioUrls(answer.slice(0, 1000), {
                        lang: ttsLang,
                        slow: false,
                        host: "https://translate.google.com",
                    });
                    const buffers = [];
                    for (const u of urls) {
                        const r = await axios.get(u.url, { responseType: "arraybuffer", timeout: 20000 });
                        buffers.push(Buffer.from(r.data));
                    }
                    if (buffers.length) {
                        await Prince.sendMessage(from, {
                            audio: Buffer.concat(buffers),
                            mimetype: "audio/mpeg",
                            ptt: true,
                        }, { quoted: msg });
                        return;
                    }
                } catch (e) {
                    // fall through to text reply
                }
            }

            await Prince.sendMessage(from, { text: answer }, { quoted: msg });
        } catch (e) {
            console.error("ChatBot error:", e);
        }
    });
}

const PrincePresence = async (Prince, jid) => {
    try { await Prince.sendPresenceUpdate('available', jid); } catch (e) {}
};

const PrinceAnticall = async (json, Prince) => {
    // Read the persisted ANTICALL setting (falls back to config). When it is
    // disabled, the bot must NOT auto-reject incoming calls.
    const mode = String(getSetting('ANTICALL', config.ANTICALL || 'false')).toLowerCase();
    if (mode === 'false' || mode === 'off' || mode === '' || mode === 'no') return;

    for (const id of json) {
        if (id.status !== 'offer') continue;
        try {
            await Prince.rejectCall(id.id, id.from);

            try {
                await Prince.sendMessage(id.from, {
                    text: antiCallMsg || '*_📞 Auto Call Reject Mode Active. 📵 No Calls Allowed!_*',
                });
            } catch (e) {}

            if (mode === 'block') {
                try { await Prince.updateBlockStatus(id.from, 'block'); } catch (e) {}
            }
        } catch (e) {
            console.error('Anticall error:', e);
        }
    }
};

const PrinceAntiDelete = async (Prince, deletedMsg, key, deleter, sender, botOwnerJid, deleterPushName, senderPushName) => {
    try {
        const from = key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const msgType = getContentType(deletedMsg.message);
        
        let text = `*🛡️ XHRIS MD V2 ANTIDELETE*\n\n`;
        text += `*From:* @${sender.split('@')[0]}\n`;
        text += `*Chat:* ${isGroup ? 'Group' : 'Private'}\n`;
        if (isGroup) text += `*Group Name:* ${deletedMsg.groupName || 'Unknown'}\n`;
        text += `*Time:* ${new Date(deletedMsg.timestamp).toLocaleString()}\n\n`;
        text += `*Message Content:* \n`;

        const contextInfo = {
            mentionedJid: [sender],
            forwardingScore: 999,
            isForwarded: true
        };

        if (msgType === 'conversation' || msgType === 'extendedTextMessage') {
            const body = deletedMsg.message.conversation || deletedMsg.message.extendedTextMessage?.text;
            text += `_${body}_`;
            await Prince.sendMessage(botOwnerJid, { text, mentions: [sender], contextInfo });
        } else {
            text += `_Sent a ${msgType.replace('Message', '')}_`;
            await Prince.sendMessage(botOwnerJid, { text, mentions: [sender], contextInfo });
            
            // Fixed: Use sendMessage with forward instead of non-existent copyNForward
            await Prince.sendMessage(botOwnerJid, { forward: deletedMsg }, { contextInfo });
        }
    } catch (e) {
        console.error('Anti-delete forwarding error:', e);
    }
};

module.exports = {
    logger, emojis, PrinceAutoReact, PrinceTechApi, PrinceApiKey, PrinceAntiLink, PrinceAntiBot,
    PrinceStatusMention, PrinceAutoBio, PrinceChatBot, PrincePresence, PrinceAntiDelete, PrinceAnticall,
};
