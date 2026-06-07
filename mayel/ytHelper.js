// Shared, resilient YouTube search + MP4 download helpers.
// Both .video (play.js) and .ytv (downloader2.js) use these so a single place
// handles the many provider response shapes and fallbacks.

const axios = require("axios");
const { callApiWithFallback, tryMultipleEndpoints } = require("./apiFallback");

// Normalize a search result from any provider's shape into a stable object.
function normalizeResult(v) {
  if (!v || typeof v !== "object") return null;
  const url = v.url || v.link || v.videoUrl || v.video_url || v.watchUrl || v.video;
  if (!url || typeof url !== "string") return null;
  return {
    url,
    title: v.title || v.name || v.titulo || "YouTube Video",
    duration: v.duration || v.timestamp || v.time || v.dur || "",
    views: v.views || v.view || v.viewH || "",
    ago: v.ago || v.uploaded || v.published || v.publishedTime || "",
    author: (v.author && (v.author.name || v.author)) || v.channel || v.artist || "",
    thumbnail: v.thumbnail || v.image || v.thumb || v.cover || "",
  };
}

// Search YouTube. Returns a normalized result object or null.
async function ytSearch(query) {
  try {
    const sr = await callApiWithFallback("search/yts", { query });
    if (sr.success && sr.data) {
      const list =
        sr.data.results || sr.data.result || sr.data.data || sr.data.videos || [];
      const first = normalizeResult(Array.isArray(list) ? list[0] : null);
      if (first) return first;
    }
  } catch (e) {
    console.log("[YT] search fallback failed:", e.message);
  }

  // last-resort host
  try {
    const r = await axios.get(
      `https://yts.giftedtech.co.ke/?q=${encodeURIComponent(query)}`,
      { timeout: 20000 }
    );
    const list = r.data?.videos || r.data?.results || [];
    const first = normalizeResult(Array.isArray(list) ? list[0] : null);
    if (first) return first;
  } catch (e) {
    console.log("[YT] giftedtech search failed:", e.message);
  }

  return null;
}

// Pull a direct download URL out of any provider response shape.
function pickDownloadUrl(data) {
  if (!data) return null;
  return (
    data.result?.download_url ||
    data.result?.downloadUrl ||
    data.result?.download?.url ||
    data.result?.url ||
    data.result?.video ||
    data.result?.media ||
    data.result?.dl_url ||
    (typeof data.result === "string" ? data.result : null) ||
    data.download_url ||
    data.downloadUrl ||
    data.url ||
    data.video ||
    data.media ||
    data.dl_url ||
    data.data?.url ||
    data.data?.download_url ||
    data.data?.downloadUrl ||
    null
  );
}

// Resolve a direct MP4 download URL for a YouTube URL. `quality` optional.
async function ytGetVideoUrl(url, quality) {
  const params = quality ? { url, quality } : { url };

  // 1) provider/endpoint fallback system
  try {
    const res = await tryMultipleEndpoints(
      ["download/ytmp4", "download/mp4", "download/ytv", "download/dlmp4", "download/ytvideo", "download/ytvid"],
      params
    );
    if (res.success) {
      const dl = pickDownloadUrl(res.data);
      if (dl) return dl;
    }
  } catch (e) {
    console.log("[YT] ytmp4 fallback failed:", e.message);
  }

  // 2) extra direct endpoints
  const enc = encodeURIComponent(url);
  const qp = quality ? `&quality=${quality}` : "";
  const direct = [
    `https://api.princetechn.com/api/download/ytmp4?apikey=prince_api_56yjJ568dte4&url=${enc}${qp}`,
    `https://api.giftedtech.web.id/api/download/dlmp4?apikey=gifted&url=${enc}`,
    `https://api.davidcyriltech.my.id/download/ytmp4?url=${enc}`,
    `https://api.dreaded.site/api/youtube/mp4?url=${enc}`,
  ];
  for (const ep of direct) {
    try {
      const r = await axios.get(ep, { timeout: 45000 });
      const dl = pickDownloadUrl(r.data);
      if (dl) return dl;
    } catch (e) {
      continue;
    }
  }

  return null;
}

module.exports = { ytSearch, ytGetVideoUrl, normalizeResult, pickDownloadUrl };
