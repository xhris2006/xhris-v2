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
            `Corrige uniquement les fautes d'orthographe, de grammaire, de conjugaison et de ponctuation du texte suivant. ` +
            `Garde exactement la même langue, le même sens et le même registre. ` +
            `Réponds UNIQUEMENT avec le texte corrigé, sans guillemets, sans explication ni commentaire.\n\nTexte: ${text}`;

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

        const changed = corrected !== text.trim();
        await react("✅");
        await Prince.sendMessage(from, {
            text:
                `✍️ *Correction*\n\n` +
                `📝 *Original:*\n${text}\n\n` +
                `✅ *Corrigé:*\n${corrected}` +
                (changed ? "" : "\n\n_Aucune faute détectée._") +
                `\n\n> *${botFooter}*`,
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

gmd({
    pattern: "pdf",
    aliases: ["topdf", "makepdf", "createpdf"],
    category: "tools",
    react: "📄",
    description: "Create a PDF from text. Usage: .pdf <name> <text> or reply to message",
}, async (from, Prince, conText) => {
    const { q, mek, reply, react, quoted, quotedMsg, config } = conText;
    try {
        const input = q?.trim() || "";
        const parts = input.split(/\s+/);
        const pdfName = parts[0] || "";
        let content = parts.slice(1).join(" ");

        if (!content && quotedMsg) {
            content = quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.imageMessage?.caption || quoted?.text || "";
        }

        if (typeof content !== "string") content = "";

        if (!pdfName) {
            await react("❌");
            return reply("📄 *PDF Creator*\n\nUsage:\n.pdf <name> <text>\n.pdf <name> (reply to a message)");
        }
        if (!content) {
            await react("❌");
            return reply("❌ Please provide content for the PDF.");
        }

        await react("⏳");

        const res = await axios.get("https://api.princetechn.com/api/tools/topdf", {
            params: { apikey: "prince", query: content },
            responseType: "arraybuffer",
        });

        const fileName = pdfName.endsWith(".pdf") ? pdfName : `${pdfName}.pdf`;

        await Prince.sendMessage(from, {
            document: Buffer.from(res.data),
            mimetype: "application/pdf",
            fileName: fileName,
            caption: `📄 *${fileName}*`,
        }, { quoted: mek });
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

