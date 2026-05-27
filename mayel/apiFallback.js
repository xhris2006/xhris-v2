/**
 * XHRIS MD V2 - Systeme de Fallback API
 *
 * Si l'API principale (Prince Tech) tombe, on bascule automatiquement
 * sur des APIs alternatives. L'ordre est defini par categorie.
 *
 * Usage:
 *   const { callApiWithFallback } = require('./apiFallback');
 *   const result = await callApiWithFallback('download/ytmp3', { url: 'https://...' });
 */

const axios = require('axios');

const API_PROVIDERS = {
  prince: {
    name: 'Prince Tech',
    baseUrl: 'https://api.princetechn.com',
    apiKey: 'prince_api_56yjJ568dte4',
    keyParam: 'apikey',
    priority: 1,
  },
  gifted: {
    name: 'Gifted Tech',
    baseUrl: 'https://api.giftedtech.web.id',
    apiKey: 'gifted',
    keyParam: 'apikey',
    priority: 2,
  },
  davidcyril: {
    name: 'David Cyril',
    baseUrl: 'https://api.davidcyriltech.my.id',
    apiKey: null,
    keyParam: null,
    priority: 3,
  },
  dreaded: {
    name: 'Dreaded',
    baseUrl: 'https://api.dreaded.site',
    apiKey: null,
    keyParam: null,
    priority: 4,
  },
};

const ENDPOINT_MAPPING = {
  'download/ytmp3': {
    prince: '/api/download/ytmp3',
    gifted: '/api/download/dlmp3',
    davidcyril: '/api/download/ytmp3',
    dreaded: '/api/youtube/mp3',
  },
  'download/yta': {
    prince: '/api/download/yta',
    gifted: '/api/download/dlmp3',
    davidcyril: '/api/download/ytmp3',
  },
  'download/dlmp3': {
    prince: '/api/download/dlmp3',
    gifted: '/api/download/dlmp3',
    davidcyril: '/api/download/ytmp3',
  },
  'download/mp3': {
    prince: '/api/download/mp3',
    gifted: '/api/download/dlmp3',
    davidcyril: '/api/download/ytmp3',
  },
  'download/ytaudio': {
    prince: '/api/download/ytaudio',
    gifted: '/api/download/dlmp3',
  },
  'download/ytmusic': {
    prince: '/api/download/ytmusic',
    gifted: '/api/download/dlmp3',
  },
  'download/ytmp4': {
    prince: '/api/download/ytmp4',
    gifted: '/api/download/dlmp4',
    davidcyril: '/api/download/ytmp4',
    dreaded: '/api/youtube/mp4',
  },
  'download/mp4': {
    prince: '/api/download/mp4',
    gifted: '/api/download/dlmp4',
    davidcyril: '/api/download/ytmp4',
  },
  'download/ytv': {
    prince: '/api/download/ytv',
    gifted: '/api/download/dlmp4',
  },
  'download/dlmp4': {
    prince: '/api/download/dlmp4',
    gifted: '/api/download/dlmp4',
  },
  'download/ytvideo': {
    prince: '/api/download/ytvideo',
    gifted: '/api/download/dlmp4',
  },
  'download/ytvid': {
    prince: '/api/download/ytvid',
    gifted: '/api/download/dlmp4',
  },
  'download/tiktok': {
    prince: '/api/download/tiktok',
    gifted: '/api/download/tiktokdl',
    davidcyril: '/api/download/tiktok',
    dreaded: '/api/tiktok',
  },
  'download/facebook': {
    prince: '/api/download/facebook',
    gifted: '/api/download/facebook',
    davidcyril: '/api/download/facebook',
  },
  'download/instadl': {
    prince: '/api/download/instadl',
    gifted: '/api/download/instagram',
    davidcyril: '/api/download/instagram',
  },
  'download/twitter': {
    prince: '/api/download/twitter',
    gifted: '/api/download/twitter',
    davidcyril: '/api/download/twitter',
  },
  'download/spotifydl': {
    prince: '/api/download/spotifydl',
    gifted: '/api/download/spotifydl',
    davidcyril: '/api/download/spotify',
  },
  'search/spotifysearch': {
    prince: '/api/search/spotifysearch',
    gifted: '/api/search/spotifysearch',
  },
  'download/gdrivedl': {
    prince: '/api/download/gdrivedl',
    gifted: '/api/download/gdrive',
  },
  'download/mediafire': {
    prince: '/api/download/mediafire',
    gifted: '/api/download/mediafire',
    davidcyril: '/api/download/mediafire',
  },
  'download/apkdl': {
    prince: '/api/download/apkdl',
    gifted: '/api/download/apk',
    davidcyril: '/api/download/apk',
  },
  'download/pastebin': {
    prince: '/api/download/pastebin',
    gifted: '/api/download/pastebin',
  },
  'ai/gpt': {
    prince: '/api/ai/gpt',
    gifted: '/api/ai/gpt',
    davidcyril: '/api/ai/gpt',
  },
  'ai/gpt4': {
    prince: '/api/ai/gpt4',
    gifted: '/api/ai/gpt4',
    davidcyril: '/api/ai/gpt4',
  },
  'ai/geminiai': {
    prince: '/api/ai/geminiai',
    gifted: '/api/ai/gemini',
  },
  'ai/deepseek-v3': {
    prince: '/api/ai/deepseek-v3',
    gifted: '/api/ai/deepseek',
  },
  'ai/blackbox': {
    prince: '/api/ai/blackbox',
    gifted: '/api/ai/blackbox',
  },
  'search/lyrics': {
    prince: '/api/search/lyrics',
    gifted: '/api/search/lyrics',
    davidcyril: '/api/search/lyrics',
  },
  'search/wallpaper': {
    prince: '/api/search/wallpaper',
    gifted: '/api/search/wallpaper',
  },
  'search/yts': {
    prince: '/api/search/yts',
    gifted: '/api/search/yts',
    davidcyril: '/api/search/yts',
  },
  'tools/removebg': {
    prince: '/api/tools/removebg',
    gifted: '/api/tools/removebg',
  },
  'tools/remini': {
    prince: '/api/tools/remini',
    gifted: '/api/tools/remini',
  },
  'tools/createqr': {
    prince: '/api/tools/createqr',
    gifted: '/api/tools/qrcode',
  },
  'tools/topdf': {
    prince: '/api/tools/topdf',
  },
};

function buildApiUrl(providerKey, endpoint, params = {}) {
  const provider = API_PROVIDERS[providerKey];
  if (!provider) return null;

  const mapping = ENDPOINT_MAPPING[endpoint];
  if (!mapping || !mapping[providerKey]) return null;

  const path = mapping[providerKey];
  const url = new URL(provider.baseUrl + path);

  if (provider.apiKey && provider.keyParam) {
    url.searchParams.set(provider.keyParam, provider.apiKey);
  }

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

function isValidResponse(data) {
  if (!data) return false;
  if (data instanceof Error) return false;
  if (data.status === false || data.success === false) return false;
  if (data.error) return false;
  return true;
}

async function callApiWithFallback(endpoint, params = {}, options = {}) {
  const providers = Object.keys(API_PROVIDERS).sort(
    (a, b) => API_PROVIDERS[a].priority - API_PROVIDERS[b].priority
  );

  const errors = [];

  for (const providerKey of providers) {
    const url = buildApiUrl(providerKey, endpoint, params);
    if (!url) continue;

    try {
      console.log(`[API] Trying ${API_PROVIDERS[providerKey].name}: ${endpoint}`);
      const res = await axios({
        method: 'GET',
        url: url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        timeout: options.timeout || 30000,
        ...options,
      });

      if (isValidResponse(res.data)) {
        console.log(`[API] OK ${API_PROVIDERS[providerKey].name} succeeded for ${endpoint}`);
        return {
          success: true,
          data: res.data,
          provider: providerKey,
          providerName: API_PROVIDERS[providerKey].name,
        };
      } else {
        errors.push(`${providerKey}: invalid response`);
      }
    } catch (e) {
      errors.push(`${providerKey}: ${e.message}`);
      console.log(`[API] FAILED ${API_PROVIDERS[providerKey].name} failed for ${endpoint}: ${e.message}`);
    }
  }

  return {
    success: false,
    data: null,
    error: `All API providers failed. Errors: ${errors.join(' | ')}`,
  };
}

async function tryMultipleEndpoints(endpoints, params = {}) {
  for (const endpoint of endpoints) {
    const result = await callApiWithFallback(endpoint, params);
    if (result.success) {
      return result;
    }
  }
  return {
    success: false,
    data: null,
    error: 'All endpoints failed across all providers',
  };
}

module.exports = {
  callApiWithFallback,
  tryMultipleEndpoints,
  buildApiUrl,
  API_PROVIDERS,
  ENDPOINT_MAPPING,
};
