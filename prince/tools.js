const { gmd, config, getContextInfo } = require("../mayel");
const axios = require("axios");
const QRCode = require("qrcode");
const tinyurl = require("tinyurl");
const crypto = require("crypto");
const Obf = require("javascript-obfuscator");
const sharp = require("sharp");
const fs = require("fs");

function generateValidCardNumber(prefix, length) {
    let cardNumber = prefix;
    for (let i = prefix.length; i < length - 1; i++) {
        cardNumber += Math.floor(Math.random() * 10);
    }
    let sum = 0;
    let isEven = true;
    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber[i]);
        if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
    }
    const checksum = (10 - (sum % 10)) % 10;
    return cardNumber + checksum;
}

function generateCardDetails(type) {
    let prefix, length;
    if (type === "visa") {
        prefix = "4";
        length = 16;
    } else if (type === "mastercard") {
        const prefixes = ["51", "52", "53", "54", "55"];
        prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        length = 16;
    }
    const cardNumber = generateValidCardNumber(prefix, length);
    const expiryMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
    const expiryYear = String(Math.floor(Math.random() * 7) + 24);
    const cvv = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)).join("");
    return {
        number: cardNumber.replace(/(.{4})/g, "$1 ").trim(),
        expiry: `${expiryMonth}/${expiryYear}`,
        cvv: cvv,
    };
}

async function fetchRandomUser() {
    try {
        const response = await axios.get("https://randomuser.me/api/", { timeout: 10000 });
        if (response.data && response.data.results && response.data.results.length > 0) {
            const user = response.data.results[0];
            return {
                name: { first: user.name.first, last: user.name.last, full: `${user.name.first} ${user.name.last}` },
                email: user.email,
                phone: user.phone,
                dob: new Date(user.dob.date).toLocaleDateString(),
                address: {
                    street: `${user.location.street.number} ${user.location.street.name}`,
                    city: user.location.city,
                    state: user.location.state,
                    country: user.location.country,
                    postcode: user.location.postcode,
                    full: `${user.location.street.number} ${user.location.street.name}, ${user.location.city}, ${user.location.state} ${user.location.postcode}, ${user.location.country}`,
                },
                picture: user.picture.large,
            };
        }
        return null;
    } catch (error) {
        console.log("RandomUser API error:", error.message);
        return null;
    }
}

async function fetchRandomAddress() {
    try {
        const response = await axios.get("https://fakerapi.it/api/v1/addresses?_quantity=1", { timeout: 10000 });
        if (response.data && response.data.data && response.data.data.length > 0) {
            const addr = response.data.data[0];
            return {
                street: addr.street,
                city: addr.city,
                state: addr.county_code,
                country: addr.country,
                zipcode: addr.zipcode,
                full: `${addr.street}, ${addr.city}, ${addr.county_code} ${addr.zipcode}, ${addr.country}`,
            };
        }
        return null;
    } catch (error) {
        console.log("FakerAPI address error:", error.message);
        return null;
    }
}

async function fetchRandomCompany() {
    try {
        const response = await axios.get("https://fakerapi.it/api/v1/companies?_quantity=1", { timeout: 10000 });
        if (response.data && response.data.data && response.data.data.length > 0) {
            return response.data.data[0].name + " Bank";
        }
        return null;
    } catch (error) {
        console.log("FakerAPI company error:", error.message);
        return null;
    }
}

gmd({
    pattern: "currency",
    aliases: ["cur", "exchange", "currencyconv"],
    category: "tools",
    react: "💱",
    description: "Convert currency values. Usage: currency 100 USD EUR",
}, async (from, Prince, conText) => {
    const { q, mek, reply, react, config } = conText;
    try {
        if (!q) {
            await react("❌");
            return reply("💱 *Currency Converter*\n\nUsage: .currency <amount> <from> <to>\nExample: .currency 100 USD EUR");
        }
        const args = q.trim().split(/\s+/);
        if (args.length < 3) {
            await react("❌");
            return reply("💱 *Currency Converter*\n\nUsage: .currency <amount> <from> <to>\nExample: .currency 100 USD EUR");
        }
        const [amount, fromCur, toCur] = args;
        const res = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCur.toUpperCase()}`);
        const rate = res.data.rates[toCur.toUpperCase()];
        if (!rate) {
            await react("❌");
            return reply("❌ Invalid currency code. Please use valid ISO currency codes (e.g., USD, EUR, GBP).");
        }
        const converted = (parseFloat(amount) * rate).toFixed(2);
        await react("✅");
        await reply(`💱 *Currency Conversion*\n\n${amount} ${fromCur.toUpperCase()} = ${converted} ${toCur.toUpperCase()}\n\n> *${config.FOOTER}*`);
    } catch (e) {
        console.error("Currency Error:", e);
        await react("❌");
        await reply("❌ Failed to convert currency. Please check your input and try again.");
    }
});

gmd({
    pattern: "translate",
    aliases: ["trt", "trans", "lang", "tr"],
    category: "tools",
    react: "🌍",
    description: "Translate text. Usage: translate <lang> <text> or reply to a message with translate <lang>",
}, async (from, Prince, conText) => {
    const { q, mek, reply, react, quoted, quotedMsg, config, sender, newsletterJid, botName } = conText;
    try {
        let lang, text;
        const args = q ? q.trim().split(/\s+/) : [];

        if (quotedMsg && args.length === 1) {
            lang = args[0];
            const qMsg = quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.imageMessage?.caption || quoted?.text || null;
            text = typeof qMsg === "string" ? qMsg : null;
            if (!text) {
                await react("❌");
                return reply("❌ No text found in the quoted message. Please reply to a text message.");
            }
        } else if (args.length >= 2) {
            lang = args[0];
            text = args.slice(1).join(" ");
        } else {
            await react("❌");
            return reply("🌍 *Translator*\n\nUsage:\n1. Direct: .translate en Hello World\n2. Reply: Reply to a message with .translate en");
        }

        if (!lang || lang.length < 2 || lang.length > 5) {
            await react("❌");
            return reply("⚠️ Invalid language code. Examples: en, es, fr, de, ja, ko, zh, ru, ar, hi");
        }

        const response = await axios.get("https://translate.googleapis.com/translate_a/single", {
            params: { client: "gtx", sl: "auto", tl: lang, dt: "t", q: text },
        });

        let translatedText = "";
        if (response.data && response.data[0]) {
            translatedText = response.data[0].map((item) => item[0]).join("");
        } else {
            throw new Error("Translation API returned no data");
        }

        await react("✅");
        await Prince.sendMessage(from, {
            text: `🌍 *Translation*\n\n🔤 *Original:* ${text.substring(0, 500)}${text.length > 500 ? "..." : ""}\n🌐 *Target:* ${lang.toUpperCase()}\n📝 *Translated:* ${translatedText.substring(0, 500)}${translatedText.length > 500 ? "..." : ""}\n\n> *${config.FOOTER}*`,
            contextInfo: getContextInfo(sender, newsletterJid, botName),
        }, { quoted: mek });
    } catch (e) {
        console.error("Translation Error:", e);
        await react("❌");
        await reply("❌ Translation failed. Please try again.");
    }
});

gmd({
    pattern: "correct",
    aliases: ["corriger", "correcteur", "corrige", "ortho", "grammar"],
    category: "tools",
    react: "✍️",
    description: "Corrige l'orthographe, la grammaire, la conjugaison et la ponctuation d'un texte. Usage: correct <texte> ou répondre à un message avec correct",
}, async (from, Prince, conText) => {
    const { q, mek, reply, react, quoted, quotedMsg, sender, newsletterJid, botName, botFooter, PrinceTechApi, PrinceApiKey } = conText;

    // Text comes from the argument, or from the replied message
    let text = (q || "").trim();
    if (!text && quotedMsg) {
        const qMsg =
            quoted?.conversation ||
            quoted?.extendedTextMessage?.text ||
            quoted?.imageMessage?.caption ||
            quoted?.videoMessage?.caption ||
            quoted?.text;
        if (typeof qMsg === "string") text = qMsg.trim();
    }

    if (!text) {
        await react("❌");
        return reply("✍️ *Correcteur de texte*\n\nUsage:\n1. Direct: .correct votre texte ici\n2. Réponse: répondez à un message avec .correct");
    }

    await react("⏳");
    try {
        const prompt =
            `Detect the language of the following text and correct only its spelling, grammar, ` +
            `conjugation and punctuation. Keep the exact same language (works for French, English and any other), ` +
            `the same meaning and the same register. Reply ONLY with the corrected text, ` +
            `with no quotes, no labels, no explanation and no comment.\n\nText: ${text}`;

        const res = await axios.get(`${PrinceTechApi}/api/ai/gpt`, {
            params: { apikey: PrinceApiKey, q: prompt },
            timeout: 30000,
        });
        const d = res.data;
        let corrected = d?.result || d?.response || d?.answer || d?.text || d?.data || "";

        if (typeof corrected !== "string" || !corrected.trim()) {
            await react("❌");
            return reply("❌ Impossible de corriger le texte pour le moment. Réessayez.");
        }
        // Strip wrapping quotes the model may add
        corrected = corrected.trim().replace(/^["'«»\s]+|["'«»\s]+$/g, "").trim();

        await react("✅");
        await Prince.sendMessage(from, {
            text: corrected,
            contextInfo: getContextInfo(sender, newsletterJid, botName),
        }, { quoted: mek });
    } catch (e) {
        console.error("Correct error:", e);
        await react("❌");
        await reply("❌ Échec de la correction. Réessayez plus tard.");
    }
});

gmd({
    pattern: "qrcode",
    aliases: ["genqr", "t2qr", "makeqr"],
    category: "tools",
    react: "📸",
    description: "Generate a QR Code from text",
}, async (from, Prince, conText) => {
    const { q, mek, reply, react, config } = conText;
    try {
        if (!q) {
            await react("❌");
            return reply("📸 *QR Code Generator*\n\nUsage: .qrcode <text or URL>\nExample: .qrcode https://google.com");
        }
        const qrImage = await QRCode.toDataURL(q);
        const buffer = Buffer.from(qrImage.split(",")[1], "base64");
        await Prince.sendMessage(from, {
            image: buffer,
            caption: `📸 *QR Code Generated*\n\n> *${config.FOOTER}*`,
        }, { quoted: mek });
        await react("✅");
    } catch (e) {
        console.error("QRCode Error:", e);
        await react("❌");
        await reply("❌ Failed to generate QR code.");
    }
});

gmd({
    pattern: "shorturl",
    aliases: ["surl", "shrink", "shorten"],
    category: "tools",
    react: "🔗",
    description: "Shorten long URLs",
}, async (from, Prince, conText) => {
    const { q, mek, reply, react, config } = conText;
    try {
        if (!q) {
            await react("❌");
            return reply("🔗 *URL Shortener*\n\nUsage: .shorturl <URL>\nExample: .shorturl https://google.com");
        }
        const shortUrl = await tinyurl.shorten(q.trim().split(/\s+/)[0]);
        await react("✅");
        await reply(`🔗 *URL Shortened*\n\n📎 *Short URL:* ${shortUrl}\n\n> *${config.FOOTER}*`);
    } catch (e) {
        console.error("ShortURL Error:", e);
        await react("❌");
        await reply("❌ Failed to shorten URL. Please provide a valid URL.");
    }
});

gmd({
    pattern: "tts",
    aliases: ["say", "speak", "text2speech"],
    category: "tools",
    react: "🗣️",
    description: "Convert text to speech audio",
}, async (from, Prince, conText) => {
    const { q, mek, reply, react, quoted, quotedMsg } = conText;

    let text;
    if (q) {
        text = q;
    } else if (quotedMsg && quoted) {
        text = quoted?.conversation || quoted?.extendedTextMessage?.text || null;
    }

    if (!text) {
        await react("❌");
        return reply("🗣️ *Text to Speech*\n\nUsage: .tts <texte>\nOu réponds à un message avec .tts");
    }

    await react("⏳");

    // 1. Google TTS (le plus fiable, gratuit, pas d'API key)
    try {
        const googleTTS = require('google-tts-api');
        const ttsUrl = googleTTS.getAudioUrl(text, {
            lang: 'fr',
            slow: false,
            host: 'https://translate.google.com',
        });
        const res = await axios.get(ttsUrl, { responseType: 'arraybuffer', timeout: 30000 });
        await Prince.sendMessage(from, {
            audio: Buffer.from(res.data),
            mimetype: 'audio/mpeg',
            ptt: true
        }, { quoted: mek });
        await react("✅");
        return;
    } catch (e) {
        console.log('[TTS] Google failed:', e.message);
    }

    // 2. Fallback : APIs tierces
    const apis = [
        `https://api.princetechn.com/api/tools/tts?apikey=prince_api_56yjJ568dte4&text=${encodeURIComponent(text)}`,
        `https://api.giftedtech.web.id/api/tools/tts?apikey=gifted&text=${encodeURIComponent(text)}`,
        `https://apiskeith.vercel.app/ai/text2speech?q=${encodeURIComponent(text)}`,
    ];

    for (const api of apis) {
        try {
            const { data } = await axios.get(api, { timeout: 30000 });
            const audioUrl = data?.result?.URL || data?.result?.audio || data?.result?.url || data?.url || data?.audio_url;
            if (audioUrl) {
                const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 30000 });
                await Prince.sendMessage(from, {
                    audio: Buffer.from(audioRes.data),
                    mimetype: 'audio/mpeg',
                    ptt: true
                }, { quoted: mek });
                await react("✅");
                return;
            }
        } catch { continue; }
    }

    await react("❌");
    return reply("❌ TTS indisponible sur toutes les sources. Réessaie plus tard.");
});

gmd({
    pattern: "base64",
    aliases: ["b64"],
    category: "tools",
    react: "🛠️",
    description: "Base64 encode or decode text. Usage: base64 encode/decode <text>",
}, async (from, Prince, conText) => {
    const { q, mek, reply, react, quoted, quotedMsg } = conText;
    try {
        if (!q) {
            await react("❌");
            return reply("🛠️ *Base64 Encoder/Decoder*\n\nUsage:\n.base64 encode <text>\n.base64 decode <encoded text>");
        }
        const args = q.trim().split(/\s+/);
        const action = args[0]?.toLowerCase();
        let text = args.slice(1).join(" ");

        if (!text && quotedMsg) {
            text = quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.text || "";
        }

        if (!action || !text) {
            await react("❌");
            return reply("🛠️ *Base64 Encoder/Decoder*\n\nUsage:\n.base64 encode <text>\n.base64 decode <encoded text>");
        }

        let result;
        if (action === "encode") {
            result = Buffer.from(text, "utf-8").toString("base64");
        } else if (action === "decode") {
            result = Buffer.from(text, "base64").toString("utf-8");
        } else {
            await react("❌");
            return reply("❌ Invalid action. Use 'encode' or 'decode'.");
        }

        await react("✅");
        await reply(`🛠️ *Base64 ${action.toUpperCase()} Result:*\n\n\`${result}\``);
    } catch (e) {
        console.error("Base64 Error:", e);
        await react("❌");
        await reply("❌ Failed to process. Make sure the input is valid.");
    }
});

gmd({
    pattern: "password",
    aliases: ["passgen", "genpass"],
    category: "tools",
    react: "🔐",
    description: "Generate random passwords. Usage: password <length> <count>",
}, async (from, Prince, conText) => {
    const { q, mek, reply, react, config } = conText;
    try {
        const args = q ? q.trim().split(/\s+/) : [];
        const length = parseInt(args[0]) || 12;
        const count = parseInt(args[1]) || 5;

        if (length < 6 || length > 50) {
            await react("❌");
            return reply("❌ Password length must be between 6 and 50.");
        }
        if (count < 1 || count > 10) {
            await react("❌");
            return reply("❌ Password count must be between 1 and 10.");
        }

        const charSet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_+?><:{}[]";
        function generatePassword(len) {
            let password = "";
            for (let i = 0; i < len; i++) {
                password += charSet.charAt(Math.floor(Math.random() * charSet.length));
            }
            return password;
        }

        let messageText = `🔐 *Generated Passwords (${length} chars):*\n\n`;
        for (let i = 0; i < count; i++) {
            messageText += `*${i + 1}.*  \`${generatePassword(length)}\`\n`;
        }
        messageText += `\n> *${config.FOOTER}*`;

        await react("✅");
        await Prince.sendMessage(from, { text: messageText }, { quoted: mek });
    } catch (e) {
        console.error("Password Error:", e);
        await react("❌");
        await reply("❌ Failed to generate passwords.");
    }
});

gmd({
    pattern: "fakeaddress",
    aliases: ["address", "faddr"],
    category: "tools",
    react: "🏠",
    description: "Generate a random fake address",
}, async (from, Prince, conText) => {
    const { mek, reply, react, config } = conText;
    try {
        let address = await fetchRandomAddress();
        if (!address) {
            const user = await fetchRandomUser();
            if (user) address = user.address;
        }
        if (address) {
            await react("✅");
            await Prince.sendMessage(from, {
                text: `🏠 *Random Address Generated*\n\n➠ *Street:* ${address.street}\n➠ *City:* ${address.city}\n➠ *State:* ${address.state}\n➠ *Zip Code:* ${address.zipcode || address.postcode}\n➠ *Country:* ${address.country}\n\n➠ *Full Address:*\n${address.full}\n\n_Data from API for testing purposes only_\n\n> *${config.FOOTER}*`,
            }, { quoted: mek });
        } else {
            await react("❌");
            await reply("❌ Unable to fetch address. Please try again.");
        }
    } catch (e) {
        console.error("FakeAddress Error:", e);
        await react("❌");
        await reply("❌ Error fetching address.");
    }
});

gmd({
    pattern: "fakeperson",
    aliases: ["person", "fperson"],
    category: "tools",
    react: "👤",
    description: "Generate a random fake person profile",
}, async (from, Prince, conText) => {
    const { mek, reply, react, config } = conText;
    try {
        const user = await fetchRandomUser();
        if (user) {
            await react("✅");
            await Prince.sendMessage(from, {
                image: { url: user.picture },
                caption: `👤 *Random Person Generated*\n\n➠ *Name:* ${user.name.full}\n➠ *Email:* ${user.email}\n➠ *Phone:* ${user.phone}\n➠ *Date of Birth:* ${user.dob}\n\n_Data from API for testing purposes only_\n\n> *${config.FOOTER}*`,
            }, { quoted: mek });
        } else {
            await react("❌");
            await reply("❌ Unable to fetch person data. Please try again.");
        }
    } catch (e) {
        console.error("FakePerson Error:", e);
        await react("❌");
        await reply("❌ Error fetching person data.");
    }
});

gmd({
    pattern: "fakevisa",
    aliases: ["visa", "fvisa"],
    category: "tools",
    react: "💳",
    description: "Generate a fake Visa card for testing",
}, async (from, Prince, conText) => {
    const { mek, reply, react, config } = conText;
    try {
        const visa = generateCardDetails("visa");
        const bank = await fetchRandomCompany();
        if (bank) {
            await react("✅");
            await Prince.sendMessage(from, {
                text: `💳 *Fake Visa Card Generated*\n\n➠ *Bank:* ${bank}\n➠ *Type:* Visa\n➠ *Number:* ${visa.number}\n➠ *Expiry:* ${visa.expiry}\n➠ *CVV:* ${visa.cvv}\n\n_This is a generated fake card for testing only.\nDo not use for real transactions._\n\n> *${config.FOOTER}*`,
            }, { quoted: mek });
        } else {
            await react("❌");
            await reply("❌ Failed to fetch bank data. Please try again.");
        }
    } catch (e) {
        console.error("FakeVisa Error:", e);
        await react("❌");
        await reply("❌ Error generating Visa card.");
    }
});

gmd({
    pattern: "fakemaster",
    aliases: ["mastercard", "fmaster"],
    category: "tools",
    react: "💳",
    description: "Generate a fake MasterCard for testing",
}, async (from, Prince, conText) => {
    const { mek, reply, react, config } = conText;
    try {
        const mastercard = generateCardDetails("mastercard");
        const bank = await fetchRandomCompany();
        if (bank) {
            await react("✅");
            await Prince.sendMessage(from, {
                text: `💳 *Fake MasterCard Generated*\n\n➠ *Bank:* ${bank}\n➠ *Type:* MasterCard\n➠ *Number:* ${mastercard.number}\n➠ *Expiry:* ${mastercard.expiry}\n➠ *CVV:* ${mastercard.cvv}\n\n_This is a generated fake card for testing only.\nDo not use for real transactions._\n\n> *${config.FOOTER}*`,
            }, { quoted: mek });
        } else {
            await react("❌");
            await reply("❌ Failed to fetch bank data. Please try again.");
        }
    } catch (e) {
        console.error("FakeMaster Error:", e);
        await react("❌");
        await reply("❌ Error generating MasterCard.");
    }
});

gmd({
    pattern: "fakecard",
    aliases: ["card", "fcard", "ccgen"],
    category: "tools",
    react: "💳",
    description: "Generate both Visa and MasterCard for testing",
}, async (from, Prince, conText) => {
    const { mek, reply, react, config } = conText;
    try {
        const visa = generateCardDetails("visa");
        const mastercard = generateCardDetails("mastercard");
        const bank1 = await fetchRandomCompany();
        const bank2 = await fetchRandomCompany();
        if (bank1 && bank2) {
            await react("✅");
            await Prince.sendMessage(from, {
                text: `💳 *Fake Credit Cards Generated*\n\n*➠ VISA CARD*\n• Bank: ${bank1}\n• Number: ${visa.number}\n• Expiry: ${visa.expiry} | CVV: ${visa.cvv}\n\n*➠ MASTERCARD*\n• Bank: ${bank2}\n• Number: ${mastercard.number}\n• Expiry: ${mastercard.expiry} | CVV: ${mastercard.cvv}\n\n_Generated fake cards for testing only.\nDo not use for actual transactions.\nAll numbers pass Luhn validation._\n\n> *${config.FOOTER}*`,
            }, { quoted: mek });
        } else {
            await react("❌");
            await reply("❌ Failed to fetch bank data. Please try again.");
        }
    } catch (e) {
        console.error("FakeCard Error:", e);
        await react("❌");
        await reply("❌ Error generating cards.");
    }
});

gmd({
    pattern: "encrypt",
    aliases: ["obfuscate", "obfuscator"],
    category: "tools",
    react: "🔒",
    description: "Encrypt/obfuscate JavaScript code. Reply to JS code.",
}, async (from, Prince, conText) => {
    const { q, mek, reply, react, quoted, quotedMsg } = conText;
    try {
        let code = "";
        if (quotedMsg) {
            code = quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.text || "";
        }
        if (!code && q) {
            code = q;
        }
        if (!code) {
            await react("❌");
            return reply("🔒 *JS Code Encryptor*\n\nReply to a JavaScript code message with .encrypt");
        }
        const obfuscationResult = Obf.obfuscate(code, {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 1,
            numbersToExpressions: true,
            simplify: true,
            stringArrayShuffle: true,
            splitStrings: true,
            stringArrayThreshold: 1,
        });
        await react("✅");
        await reply(obfuscationResult.getObfuscatedCode());
    } catch (e) {
        console.error("Encrypt Error:", e);
        await react("❌");
        await reply("❌ " + (e?.message || "Please provide valid JavaScript code to encrypt."));
    }
});

gmd({
    pattern: "removebg",
    aliases: ["rmbg", "bgremove", "nobg"],
    category: "tools",
    react: "🖼️",
    description: "Remove background from a quoted image",
}, async (from, Prince, conText) => {
    const { mek, reply, react, quoted, quotedMsg, m } = conText;
    try {
        if (!quotedMsg) {
            await react("❌");
            return reply("🖼️ *Background Remover*\n\nReply to an image message to remove its background.");
        }

        const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
        if (!quotedImg) {
            await react("❌");
            return reply("❌ Please reply to an image message.");
        }

        await react("⏳");

        let tempFilePath;
        try {
            tempFilePath = await Prince.downloadAndSaveMediaMessage(quotedImg, "temp_media");
            const buffer = await require("fs").promises.readFile(tempFilePath);

            if (!buffer || buffer.length === 0) {
                throw new Error("Could not extract image content");
            }

            const pngBuffer = await sharp(buffer).png().toBuffer();
            const base64Img = pngBuffer.toString("base64");

            const response = await axios.post(
                "https://api.remove.bg/v1.0/removebg",
                { image_file_b64: base64Img, size: "auto" },
                {
                    headers: { "X-Api-Key": "insert_your_key_here" },
                    responseType: "arraybuffer",
                    timeout: 60000,
                }
            ).catch(async () => {
                const uploadRes = await axios.post("https://tmpfiles.org/api/v1/upload", (() => {
                    const FormData = require("form-data");
                    const form = new FormData();
                    form.append("file", buffer, { filename: "image.png" });
                    return form;
                })(), { headers: { "Content-Type": "multipart/form-data" } }).catch(() => null);

                if (uploadRes?.data?.data?.url) {
                    const imgUrl = uploadRes.data.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
                    const apiRes = await axios.get(
                        `https://apiskeith.vercel.app/ai/removebg?url=${encodeURIComponent(imgUrl)}`,
                        { timeout: 60000 }
                    );
                    if (apiRes.data?.status && apiRes.data?.result) {
                        return { data: null, fallbackUrl: apiRes.data.result };
                    }
                }
                throw new Error("All removebg methods failed");
            });

            if (response.fallbackUrl) {
                await Prince.sendMessage(from, { image: { url: response.fallbackUrl } }, { quoted: mek });
            } else {
                await Prince.sendMessage(from, { image: Buffer.from(response.data) }, { quoted: mek });
            }
            await react("✅");
        } finally {
            if (tempFilePath) await require("fs").promises.unlink(tempFilePath).catch(() => {});
        }
    } catch (e) {
        console.error("RemoveBG Error:", e);
        await react("❌");
        await reply("❌ Failed to remove background. Try a different image.");
    }
});

gmd({
    pattern: "flux",
    aliases: ["fluxai", "imageai", "aigen", "generate"],
    category: "ai",
    react: "🎨",
    description: "Generate an image using Flux AI with fallback APIs",
}, async (from, Prince, conText) => {
    const { q, mek, reply, react, config } = conText;
    try {
        if (!q) {
            await react("❌");
            return reply("🎨 *Flux AI Image Generator*\n\nUsage: .flux <prompt>\nExample: .flux a cute cat wearing glasses");
        }

        await react("⏳");
        const processingMsg = await reply(`🎨 *Generating image with Flux AI...*\n\n📝 *Prompt:* ${q}\n⏳ Please wait...`);

        let imageBuffer = null;
        const apis = [
            `https://apiskeith.vercel.app/ai/flux?q=${encodeURIComponent(q)}`,
            `https://api.nekorinn.my.id/ai/flux?prompt=${encodeURIComponent(q)}`,
        ];

        for (const apiUrl of apis) {
            try {
                const response = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 45000 });
                const buf = Buffer.from(response.data);
                if (buf && buf.length > 1000) {
                    imageBuffer = buf;
                    break;
                }
            } catch (apiErr) {
                console.log("Flux API attempt failed:", apiErr.message);
            }
        }

        if (processingMsg?.key) {
            await Prince.sendMessage(from, { delete: processingMsg.key }).catch(() => {});
        }

        if (imageBuffer) {
            await Prince.sendMessage(from, {
                image: imageBuffer,
                caption: `🎨 *Flux AI Image*\n\n📝 *Prompt:* ${q}\n\n> *${config.FOOTER}*`,
            }, { quoted: mek });
            await react("✅");
        } else {
            await react("❌");
            await reply("❌ All AI image services are currently unavailable. Please try again later.");
        }
    } catch (e) {
        console.error("Flux Error:", e);
        await react("❌");
        await reply("⚠️ An error occurred. Please try again later.");
    }
});

gmd({
    pattern: "editimg",
    aliases: ["imgedit", "editimage", "aimg"],
    category: "ai",
    react: "🎨",
    description: "Edit images with AI using text prompts. Reply to an image.",
}, async (from, Prince, conText) => {
    const { q, mek, reply, react, quoted, quotedMsg, config } = conText;
    try {
        if (!quotedMsg) {
            await react("❌");
            return reply("🎨 *AI Image Editor*\n\nReply to an image with your edit prompt.\n\nExample:\n.editimg make it look like a cartoon\n.editimg add sunglasses\n.editimg change background to beach");
        }

        if (!q) {
            await react("❌");
            return reply("❌ Please provide an edit prompt.\n\nExample: .editimg make it look like a painting");
        }

        const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
        const quotedSticker = quoted?.stickerMessage || quoted?.message?.stickerMessage;
        if (!quotedImg && !quotedSticker) {
            await react("❌");
            return reply("❌ Please reply to an image or sticker message.");
        }

        await react("⏳");
        const processingMsg = await reply(`🎨 *Processing your image edit...*\n\n📝 *Prompt:* ${q}\n⏳ Please wait...`);

        let tempFilePath;
        try {
            tempFilePath = await Prince.downloadAndSaveMediaMessage(quotedImg || quotedSticker, "temp_media");
            let buffer = await require("fs").promises.readFile(tempFilePath);

            if (quotedSticker) {
                buffer = await sharp(buffer).png().toBuffer();
            }

            const base64Image = buffer.toString("base64");

            const response = await axios.post(
                "https://ai-studio.anisaofc.my.id/api/edit-image",
                { image: base64Image, prompt: q },
                { headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" }, timeout: 60000 }
            );

            if (!response.data || !response.data.imageUrl) {
                throw new Error("API returned no image URL");
            }

            if (processingMsg?.key) {
                await Prince.sendMessage(from, { delete: processingMsg.key }).catch(() => {});
            }

            await Prince.sendMessage(from, {
                image: { url: response.data.imageUrl },
                caption: `🎨 *AI Image Edit*\n\n📝 *Prompt:* ${q}\n\n> *${config.FOOTER}*`,
            }, { quoted: mek });
            await react("✅");
        } finally {
            if (tempFilePath) await require("fs").promises.unlink(tempFilePath).catch(() => {});
        }
    } catch (e) {
        console.error("EditImg Error:", e);
        await react("❌");
        await reply("❌ Image edit failed. Please try a different image or simpler prompt.");
    }
});

// Render plain text into a multi-page PDF buffer (pdf-lib, word-wrapped A4).
async function renderTextPdf(text) {
    const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pageW = 595, pageH = 842, margin = 50, fontSize = 12, lineH = fontSize * 1.45;
    const maxW = pageW - margin * 2;

    const lines = [];
    for (const para of String(text).split(/\r?\n/)) {
        if (para === "") { lines.push(""); continue; }
        let line = "";
        for (const word of para.split(/\s+/)) {
            const test = line ? line + " " + word : word;
            if (font.widthOfTextAtSize(test, fontSize) > maxW && line) {
                lines.push(line);
                line = word;
            } else {
                line = test;
            }
        }
        lines.push(line);
    }

    let page = pdfDoc.addPage([pageW, pageH]);
    let y = pageH - margin;
    for (const ln of lines) {
        if (y < margin) { page = pdfDoc.addPage([pageW, pageH]); y = pageH - margin; }
        // strip characters Helvetica can't encode (e.g. emoji) to avoid throwing
        const safe = ln.replace(/[^\x00-\xFF]/g, "");
        page.drawText(safe, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
        y -= lineH;
    }
    return Buffer.from(await pdfDoc.save());
}

// Embed an image buffer into a pdf-lib doc, trying JPEG/PNG directly then sharp.
async function embedAnyImage(pdfDoc, raw) {
    try { return await pdfDoc.embedJpg(raw); } catch (_) {}
    try { return await pdfDoc.embedPng(raw); } catch (_) {}
    try {
        const jpg = await sharp(raw).flatten({ background: "#ffffff" }).jpeg({ quality: 90 }).toBuffer();
        return await pdfDoc.embedJpg(jpg);
    } catch (e) {
        console.error("[PDF] embed image failed:", e.message);
        return null;
    }
}

gmd({
    pattern: "pdf",
    aliases: ["topdf", "makepdf", "createpdf"],
    category: "tools",
    react: "📄",
    description: "Make a PDF from text and/or image(s). Reply to a message/media, or send media with caption .pdf [name]. Reply to the result with '1 <name>' to rename.",
}, async (from, Prince, conText) => {
    const { q, mek, reply, react, quoted, getMediaBuffer, PrinceApiKey } = conText;
    try {
        const arg = (q || "").trim();

        // ── Collect image(s): replied media + media sent with the command ──
        const imageBuffers = [];
        const grabImage = async (mediaMsg, type) => {
            try {
                const b = await getMediaBuffer(mediaMsg, type);
                if (b && b.length) imageBuffers.push(b);
            } catch (e) { console.error("[PDF] media download:", e.message); }
        };
        const unwrap = (msg) =>
            msg?.viewOnceMessageV2?.message ||
            msg?.viewOnceMessage?.message ||
            msg || {};

        // a) the replied message
        const rq = unwrap(quoted);
        if (rq.imageMessage) await grabImage(rq.imageMessage, "image");
        else if (rq.stickerMessage) await grabImage(rq.stickerMessage, "sticker");
        // b) media attached to the command message itself
        const cm = unwrap(mek.message);
        if (cm.imageMessage) await grabImage(cm.imageMessage, "image");
        else if (cm.stickerMessage) await grabImage(cm.stickerMessage, "sticker");

        // ── Collect text from the replied message ──
        const quotedText =
            quoted?.conversation ||
            quoted?.extendedTextMessage?.text ||
            quoted?.imageMessage?.caption ||
            quoted?.videoMessage?.caption ||
            quoted?.documentMessage?.caption ||
            quoted?.text || "";

        // ── Decide filename vs content ──
        // With media: the typed arg is the filename, replied text becomes a page.
        // Without media: replied text is content (arg = name), else arg is content.
        let fileName = "document";
        let textContent = "";
        const hasMedia = imageBuffers.length > 0;

        if (hasMedia) {
            if (arg) fileName = arg;
            if (quotedText) textContent = quotedText.trim();
        } else if (quotedText) {
            textContent = quotedText.trim();
            if (arg) fileName = arg;
        } else if (arg) {
            textContent = arg;
        }

        if (!hasMedia && !textContent) {
            await react("❌");
            return reply(
                "📄 *PDF Creator*\n\nUsage:\n" +
                "• .pdf <your text>\n" +
                "• Reply to text/image with .pdf [name]\n" +
                "• Send an image with caption .pdf [name]\n\n" +
                "After it's made, reply to the PDF with *1 <name>* to rename it."
            );
        }

        await react("⏳");

        let buf;
        if (hasMedia) {
            // Build the PDF locally: one page per image (+ a text page if any).
            const { PDFDocument } = require("pdf-lib");
            const pdfDoc = await PDFDocument.create();
            let embedded = 0;
            for (const raw of imageBuffers) {
                const img = await embedAnyImage(pdfDoc, raw);
                if (!img) continue;
                const page = pdfDoc.addPage([img.width, img.height]);
                page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
                embedded++;
            }
            if (embedded === 0 && !textContent) {
                await react("❌");
                return reply("❌ Couldn't read the image(s). Try a different one.");
            }
            if (textContent) {
                // append the text as extra A4 pages
                const { StandardFonts, rgb } = require("pdf-lib");
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const pageW = 595, pageH = 842, margin = 50, fontSize = 12, lineH = fontSize * 1.45;
                const maxW = pageW - margin * 2;
                const lines = [];
                for (const para of textContent.split(/\r?\n/)) {
                    if (para === "") { lines.push(""); continue; }
                    let line = "";
                    for (const word of para.split(/\s+/)) {
                        const test = line ? line + " " + word : word;
                        if (font.widthOfTextAtSize(test, fontSize) > maxW && line) { lines.push(line); line = word; }
                        else line = test;
                    }
                    lines.push(line);
                }
                let page = pdfDoc.addPage([pageW, pageH]);
                let y = pageH - margin;
                for (const ln of lines) {
                    if (y < margin) { page = pdfDoc.addPage([pageW, pageH]); y = pageH - margin; }
                    page.drawText(ln.replace(/[^\x00-\xFF]/g, ""), { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
                    y -= lineH;
                }
            }
            buf = Buffer.from(await pdfDoc.save());
        } else {
            // Text-only → external API (nice formatting), with local fallback.
            try {
                const res = await axios.get("https://api.princetechn.com/api/tools/topdf", {
                    params: { apikey: PrinceApiKey || "prince_api_56yjJ568dte4", query: textContent },
                    responseType: "arraybuffer",
                    timeout: 60000,
                    validateStatus: () => true,
                });
                const apiBuf = Buffer.from(res.data);
                if (apiBuf.slice(0, 5).toString("latin1") === "%PDF-") {
                    buf = apiBuf;
                } else {
                    buf = await renderTextPdf(textContent);
                }
            } catch (_) {
                buf = await renderTextPdf(textContent);
            }
        }

        fileName = fileName.replace(/[^\w\s.-]/g, "").trim() || "document";
        if (!/\.pdf$/i.test(fileName)) fileName += ".pdf";

        const sent = await Prince.sendMessage(from, {
            document: buf,
            mimetype: "application/pdf",
            fileName,
            caption: `📄 *${fileName}*\n\n_Reply with *1 <name>* to rename._`,
        }, { quoted: mek });

        try { require("./pdf-store").rememberPdf(sent?.key?.id, buf); } catch (_) {}

        await react("✅");
    } catch (e) {
        console.error("PDF Error:", e);
        await react("❌");
        await reply("❌ Failed to create PDF: " + e.message);
    }
});

gmd({
    pattern: "cjs2esm",
    aliases: ["c2e", "commonjstoesm", "commonjs2esm"],
    category: "tools",
    react: "⚜️",
    description: "Convert CommonJS code to ESM code. Reply to CJS code.",
}, async (from, Prince, conText) => {
    const { q, mek, reply, react, quoted, quotedMsg } = conText;
    try {
        let code = "";
        if (quotedMsg) {
            code = quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.text || "";
        }
        if (!code && q) code = q;

        if (!code) {
            await react("❌");
            return reply("⚜️ *CJS to ESM Converter*\n\nReply to a CommonJS code message with .cjs2esm");
        }

        const data = await axios.get(`https://api.nekorinn.my.id/tools/cjs2esm?code=${encodeURIComponent(code)}`, { timeout: 30000 });
        if (!data.data?.status) {
            await react("❌");
            return reply("❌ Failed to convert code. Make sure it's valid CJS.");
        }

        await react("✅");
        await Prince.sendMessage(from, { text: data.data.result }, { quoted: mek });
    } catch (e) {
        console.error("CJS2ESM Error:", e);
        await react("❌");
        await reply("❌ Failed to convert code.");
    }
});

// ─── TELEGRAM STICKER DOWNLOADER ─────────────────────────────────────────────
// Download a whole Telegram sticker pack from its link and send them as WhatsApp
// stickers. Needs a Telegram bot token (set TELEGRAM_BOT_TOKEN env var, get one
// from @BotFather).
gmd({
    pattern: "tgsticker",
    aliases: ["tgs", "telesticker", "stickertg", "tgstickers", "tgstic!ker"],
    category: "tools",
    react: "🪄",
    description: "Download a Telegram sticker pack from its link. Usage: .tgsticker https://t.me/addstickers/PackName",
}, async (from, Prince, conText) => {
    const { q, mek, reply, react, getSetting } = conText;
    try {
        const token = (getSetting("TELEGRAM_BOT_TOKEN", config.TELEGRAM_BOT_TOKEN) || "").trim();
        if (!token) {
            await react("❌");
            return reply(
                "❌ Telegram bot token not set.\n\n" +
                "1. Open Telegram → talk to *@BotFather* → /newbot → copy the token.\n" +
                "2. Set it as the *TELEGRAM_BOT_TOKEN* environment variable (or `.setenv TELEGRAM_BOT_TOKEN <token>` if supported), then restart.\n\n" +
                "Then run: .tgsticker https://t.me/addstickers/PackName"
            );
        }

        const link = (q || "").trim();
        // Accept full links or a bare pack name
        const m = link.match(/(?:t\.me\/addstickers\/|addstickers\/|^)([A-Za-z0-9_]+)\s*$/);
        const packName = m ? m[1] : "";
        if (!packName) {
            await react("❌");
            return reply("🪄 *Telegram Sticker Downloader*\n\nUsage:\n• .tgsticker https://t.me/addstickers/PackName\n• .tgsticker PackName");
        }

        await react("⏳");
        const api = `https://api.telegram.org/bot${token}`;

        const setRes = await axios.get(`${api}/getStickerSet`, {
            params: { name: packName },
            timeout: 30000,
            validateStatus: () => true,
        });
        if (!setRes.data?.ok) {
            await react("❌");
            const desc = setRes.data?.description || "pack not found or invalid token";
            return reply(`❌ Couldn't fetch the pack: ${desc}`);
        }

        const set = setRes.data.result;
        const all = Array.isArray(set.stickers) ? set.stickers : [];
        // Static stickers (.webp) only — animated (.tgs) / video (.webm) can't be
        // sent as native WhatsApp stickers without conversion.
        const statics = all.filter((s) => !s.is_animated && !s.is_video);
        const skipped = all.length - statics.length;

        if (statics.length === 0) {
            await react("❌");
            return reply(`❌ This pack has no static stickers (it has ${all.length} animated/video sticker(s), which aren't supported).`);
        }

        const MAX = 30;
        const batch = statics.slice(0, MAX);
        let ok = 0, fail = 0;

        for (const st of batch) {
            try {
                const fileRes = await axios.get(`${api}/getFile`, {
                    params: { file_id: st.file_id },
                    timeout: 30000,
                    validateStatus: () => true,
                });
                if (!fileRes.data?.ok) { fail++; continue; }
                const filePath = fileRes.data.result.file_path;
                const dlRes = await axios.get(
                    `https://api.telegram.org/file/bot${token}/${filePath}`,
                    { responseType: "arraybuffer", timeout: 45000, validateStatus: () => true }
                );
                let buf = Buffer.from(dlRes.data);
                // Normalize to a WhatsApp-friendly 512x512 webp
                try {
                    buf = await sharp(buf)
                        .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
                        .webp()
                        .toBuffer();
                } catch (_) { /* fall back to the raw webp */ }
                await Prince.sendMessage(from, { sticker: buf }, { quoted: mek });
                ok++;
            } catch (e) {
                fail++;
                console.error("[TGSTICKER] item failed:", e.message);
            }
            await new Promise((r) => setTimeout(r, 700));
        }

        await react("✅");
        let summary = `🪄 Sent *${ok}* sticker(s) from *${set.title || packName}*.`;
        if (statics.length > MAX) summary += `\n📦 Pack has ${statics.length} static stickers — sent the first ${MAX}.`;
        if (skipped > 0) summary += `\n⏭️ Skipped ${skipped} animated/video sticker(s).`;
        if (fail > 0) summary += `\n⚠️ Failed: ${fail}.`;
        return reply(summary);
    } catch (e) {
        console.error("TGSticker Error:", e);
        await react("❌");
        return reply("❌ Failed to download Telegram stickers: " + e.message);
    }
});

