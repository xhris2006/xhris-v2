const { gmd, getContextInfo } = require("../mayel");
const { tryMultipleEndpoints } = require('../mayel/apiFallback');



gmd({
    pattern: "sendimage",
    aliases: ["sendimg", "dlimg", "dlimage"],
    category: "downloader",
    react: "📷",
    description: "Download Audio from url"
  },
  async (from, Prince, conText) => {
    const { q, mek, reply, react, sender, botFooter, gmdBuffer } = conText;

    if (!q) {
      await react("❌");
      return reply("Please provide image url");
    }

    try {
      const buffer = await gmdBuffer(q);
      if (buffer instanceof Error) {
        await react("❌");
        return reply("Failed to download the image file.");
      }
      await Prince.sendMessage(from, {
        image: imageBuffer,
        mimetype: "image/jpg",
        caption: `> *${botFooter}*`,
      }, { quoted: mek });
      await react("✅");
    } catch (error) {
      console.error("Error during download process:", error);
      await react("❌");
      return reply("Oops! Something went wrong. Please try again.");
    }
  }
);


gmd({
    pattern: "sendaudio",
    aliases: ["sendmp3", "dlmp3", "dlaudio"],
    category: "downloader",
    react: "🎶",
    description: "Download Audio from url"
  },
  async (from, Prince, conText) => {
    const { q, mek, reply, react, sender, botFooter, gmdBuffer, formatAudio } = conText;

    if (!q) {
      await react("❌");
      return reply("Please provide audio url");
    }

    try {
      const buffer = await gmdBuffer(q);
      const convertedBuffer = await formatAudio(buffer);
      if (buffer instanceof Error) {
        await react("❌");
        return reply("Failed to download the audio file.");
      }
      await Prince.sendMessage(from, {
        audio: convertedBuffer,
        mimetype: "audio/mpeg",
        caption: `> *${botFooter}*`,
      }, { quoted: mek });
      await react("✅");
    } catch (error) {
      console.error("Error during download process:", error);
      await react("❌");
      return reply("Oops! Something went wrong. Please try again.");
    }
  }
);


gmd({
    pattern: "sendvideo",
    aliases: ["sendmp4", "dlmp4", "dvideo"],
    category: "downloader",
    react: "🎥",
    description: "Download Video from url"
  },
  async (from, Prince, conText) => {
    const { q, mek, reply, react, sender, botFooter, gmdBuffer, formatVideo } = conText;

    if (!q) {
      await react("❌");
      return reply("Please provide video url");
    }

    try {
      const buffer = await gmdBuffer(q);
      const convertedBuffer = await formatVideo(buffer);
      if (buffer instanceof Error) {
        await react("❌");
        return reply("Failed to download the video file.");
      }
      await Prince.sendMessage(from, {
        video: convertedBuffer,
        mimetype: "video/mp4",
        caption: `> *${botFooter}*`,
      }, { quoted: mek });
      await react("✅");
    } catch (error) {
      console.error("Error during download process:", error);
      await react("❌");
      return reply("Oops! Something went wrong. Please try again.");
    }
  }
);


gmd({
  pattern: "play",
  aliases: ["ytmp3", "music", "song", "audiodoc", "yta"],
  category: "downloader",
  react: "🎶",
  description: "Recherche et télécharge une musique YouTube"
},
async (from, Prince, conText) => {
  const { q, mek, reply, react, botFooter } = conText;

  if (!q) {
    await react("❌");
    return reply("❌ Usage: .play <artiste> <titre>\nExemple: .play Burna Boy Last Last");
  }

  await react("🔍");

  try {
    const yts  = require('yt-search');
    const axios = require('axios');
    const isUrl = /^https?:\/\//.test(q) && (q.includes('youtu') || q.includes('youtube'));
    let videoInfo = null;

    if (isUrl) {
      videoInfo = { url: q, title: 'YouTube Audio', duration: '?', author: '', thumbnail: null };
      try {
        const o = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(q)}&format=json`, { timeout: 8000 });
        videoInfo.title     = o.data?.title       || videoInfo.title;
        videoInfo.author    = o.data?.author_name  || '';
        videoInfo.thumbnail = o.data?.thumbnail_url || null;
      } catch {}
    } else {
      try {
        const r1 = await yts(q + ' audio');
        const v1 = r1?.videos?.[0];
        if (v1) videoInfo = { url: v1.url, title: v1.title, duration: v1.timestamp || v1.duration?.timestamp || '?', author: v1.author?.name || '', thumbnail: v1.thumbnail || v1.image };
      } catch {}

      if (!videoInfo) {
        try {
          const r2 = await yts(q);
          const v2 = r2?.videos?.[0];
          if (v2) videoInfo = { url: v2.url, title: v2.title, duration: v2.timestamp || '?', author: v2.author?.name || '', thumbnail: v2.thumbnail || v2.image };
        } catch {}
      }

      if (!videoInfo) {
        await react("❌");
        return reply(`❌ Aucun résultat pour "${q}".\nRéessaie ou utilise une URL YouTube directe.`);
      }
    }

    const displayTitle = videoInfo.author ? `${videoInfo.author} - ${videoInfo.title}` : videoInfo.title;
    const safeFileName = displayTitle.replace(/[\\/:*?"<>|]/g, '').slice(0, 100);

    const infoText =
      `🎵 *${displayTitle}*\n\n` +
      `⏱️ *Durée:* ${videoInfo.duration}\n` +
      `🔗 ${videoInfo.url}\n\n` +
      `📥 _Téléchargement en cours..._\n\n` +
      `> *${botFooter}*`;

    if (videoInfo.thumbnail) {
      try {
        const tRes = await axios.get(videoInfo.thumbnail, { responseType: 'arraybuffer', timeout: 10000 });
        await Prince.sendMessage(from, { image: Buffer.from(tRes.data), caption: infoText }, { quoted: mek });
      } catch { await reply(infoText); }
    } else {
      await reply(infoText);
    }

    await react("⬇️");

    const downloadEndpoints = [
      `https://api.princetechn.com/api/download/ytmp3?apikey=prince_api_56yjJ568dte4&url=${encodeURIComponent(videoInfo.url)}`,
      `https://api.giftedtech.web.id/api/download/dlmp3?apikey=gifted&url=${encodeURIComponent(videoInfo.url)}`,
      `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoInfo.url)}`,
      `https://api.dreaded.site/api/youtube/mp3?url=${encodeURIComponent(videoInfo.url)}`,
      `https://api.princetechn.com/api/download/yta?apikey=prince_api_56yjJ568dte4&url=${encodeURIComponent(videoInfo.url)}`,
    ];

    let dlUrl = null, provider = '';
    for (const endpoint of downloadEndpoints) {
      try {
        const res = await axios.get(endpoint, { timeout: 30000 });
        const d = res.data;
        dlUrl = d?.result?.download_url || d?.result?.url || d?.result?.audio
             || d?.download_url || d?.url || d?.audio || d?.dl_url
             || d?.result?.download?.url || d?.data?.url || d?.data?.download_url;
        if (dlUrl) {
          provider = endpoint.includes('princetechn') ? 'Prince'
                   : endpoint.includes('giftedtech')  ? 'Gifted'
                   : endpoint.includes('davidcyril')  ? 'David'
                   : 'Dreaded';
          break;
        }
      } catch { continue; }
    }

    if (!dlUrl) {
      await react("❌");
      return reply("❌ Audio indisponible sur toutes les APIs. Réessaie dans quelques minutes.");
    }

    console.log(`[PLAY] ✅ Download via ${provider}`);

    const audioRes = await axios.get(dlUrl, {
      responseType: 'arraybuffer',
      timeout: 90000,
      maxContentLength: 50 * 1024 * 1024
    });

    await Prince.sendMessage(from, {
      audio: Buffer.from(audioRes.data),
      mimetype: 'audio/mpeg',
      fileName: `${safeFileName}.mp3`
    }, { quoted: mek });

    await react("✅");
  } catch (e) {
    console.error("[PLAY] Error:", e);
    await react("❌");
    await reply(`❌ Erreur : ${e.message}`);
  }
});


gmd({
    pattern: "video",
    aliases: ["ytmp4doc", "mp4", "ytmp4", "dlmp4"],
    category: "downloader",
    react: "🎥",
    description: "Download Video from Youtube"
  },
  async (from, Prince, conText) => {
    const { q, mek, reply, react, sender, botPic, botName, botFooter, newsletterUrl, newsletterJid, gmdJson, gmdBuffer, formatVideo, PrinceTechApi, PrinceApiKey } = conText;

    if (!q) {
      await react("❌");
      return reply("Please provide a video name or youtube url");
    }

    try {
      const searchResponse = await gmdJson(`https://yts.giftedtech.co.ke/?q=${encodeURIComponent(q)}`);
      
      if (!searchResponse || !Array.isArray(searchResponse.videos)) {
        await react("❌");
        return reply("Invalid response from search API. Please try again.");
      }

      if (searchResponse.videos.length === 0) {
        await react("❌");
        return reply("No results found for your search.");
      }
      
      const firstVideo = searchResponse.videos[0];
      const videoUrl = firstVideo.url;
      
      const { tryMultipleEndpoints } = require('../mayel/apiFallback');
      const apiResult = await tryMultipleEndpoints(
        ['download/ytmp4', 'download/mp4', 'download/ytv', 'download/dlmp4', 'download/ytvideo', 'download/ytvid'],
        { url: videoUrl }
      );
      let downloadUrl = null;

      if (apiResult.success && apiResult.data) {
        downloadUrl = apiResult.data.result?.download_url
                   || apiResult.data.result?.url
                   || apiResult.data.result?.video
                   || apiResult.data.result?.media
                   || apiResult.data.download_url
                   || apiResult.data.url
                   || apiResult.data.video
                   || apiResult.data.media
                   || apiResult.data.dl_url
                   || apiResult.data.downloadUrl
                   || apiResult.data.data?.url
                   || apiResult.data.data?.download_url;
        if (downloadUrl) {
          console.log(`[YTMP4] ✅ Source: ${apiResult.providerName}`);
        }
      }
      // Essai 2 : fallback dreaded.site si tout échoue
      if (!downloadUrl) {
        try {
          const fallbackRes = await gmdJson(`https://api.dreaded.site/api/youtube/mp4?url=${encodeURIComponent(videoUrl)}`);
          downloadUrl = fallbackRes?.result?.download?.url
                     || fallbackRes?.result?.url
                     || fallbackRes?.url;
          if (downloadUrl) console.log(`[YTMP4] ✅ Fallback dreaded.site OK`);
        } catch (e) { console.log('[YTMP4] dreaded fallback failed:', e.message); }
      }

      if (!downloadUrl) {
        await react("❌");
        return reply("Failed to get download URL for the video.");
      }

      const buffer = await gmdBuffer(downloadUrl);
      const convertedBuffer = await formatVideo(buffer);
      if (buffer instanceof Error) {
        await react("❌");
        return reply("Failed to download the video file.");
      }

      const infoMess = {
        image: { url: botPic },
        caption: `> *${botName} 𝐕𝐈𝐃𝐄𝐎 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑*  
╭───────────────◆  
│⿻ *Title:* ${firstVideo.name}
│⿻ *Duration:* ${firstVideo.duration}
╰────────────────◆  
⏱ *Session expires in 2 minutes*
╭───────────────◆
│Reply With:
│1️⃣ To Download Video 🎥 
│2️⃣ To Download as Document 📄
╰────────────────◆`,
        contextInfo: getContextInfo(sender, newsletterJid, botName)
      };

      const messageSent = await Prince.sendMessage(from, infoMess, { quoted: mek });
      const messageId = messageSent.key.id;
      
      const handleResponse = async (event) => {
        const messageData = event.messages[0];
        if (!messageData.message) return;
        const isReplyToDownloadPrompt = messageData.message.extendedTextMessage?.contextInfo?.stanzaId === messageId;
        if (!isReplyToDownloadPrompt) return;
        const messageContent = messageData.message.conversation || messageData.message.extendedTextMessage?.text;
        await react("⬇️");
        
        try {
          switch (messageContent.trim()) {
            case "1":
              await Prince.sendMessage(from, {
                video: convertedBuffer,
                mimetype: "video/mp4",
                pvt: true,
                fileName: `${firstVideo.name}.mp4`.replace(/[^\w\s.-]/gi, ''),
                caption: `🎥 ${firstVideo.name}`,
              }, { quoted: messageData });
              break;
              
            case "2":
              await Prince.sendMessage(from, {
                document: convertedBuffer,
                mimetype: "video/mp4",
                fileName: `${firstVideo.name}.mp4`.replace(/[^\w\s.-]/gi, ''),
                caption: `📄 ${firstVideo.name}`,
              }, { quoted: messageData });
              break;
              
            default:
              await reply("Invalid option selected. Please reply with:\n1️⃣ For Video\n2️⃣ For Document", messageData);
              return;
          }
          await react("✅");
        } catch (error) {
          console.error("Error sending media:", error);
          await react("❌");
          await reply("Failed to send media. Please try again.", messageData);
        }
      };

      let sessionExpired = false;
      
      const timeoutHandler = () => {
        sessionExpired = true;
        Prince.ev.off("messages.upsert", handleResponse);
      };

      setTimeout(timeoutHandler, 120000);
      
      Prince.ev.on("messages.upsert", handleResponse);
      
    } catch (error) {
      console.error("Error during download process:", error);
      await react("❌");
      return reply("Oops! Something went wrong. Please try again.");
    }
  }
);
