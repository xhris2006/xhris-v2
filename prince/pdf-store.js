// In-memory store mapping a generated PDF's message id -> its buffer, so the
// user can reply to the PDF with "1 <name>" to resend it under a new filename.
const store = new Map();
const TTL = 15 * 60 * 1000; // 15 minutes

function rememberPdf(msgId, buffer) {
  if (!msgId || !buffer) return;
  store.set(msgId, { buffer, expires: Date.now() + TTL });
}

function takePdf(msgId) {
  if (!msgId) return null;
  const entry = store.get(msgId);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(msgId);
    return null;
  }
  return entry.buffer;
}

// Periodic cleanup of expired entries
const timer = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now > v.expires) store.delete(k);
  }
}, 5 * 60 * 1000);
if (timer.unref) timer.unref();

module.exports = { rememberPdf, takePdf };
