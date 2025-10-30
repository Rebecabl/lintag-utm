// Camada de acesso à API do Lintag no frontend.
// Lê bases da API/shortener via env do Vite e expõe utilitários de criação, listagem e stats.

export const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8080";
export const SHORT = import.meta.env.VITE_SHORT_BASE_URL || "http://127.0.0.1:8080";

async function handle(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText);
  }
  return res.json();
}

/**
 * Cria um link curto.
 * @param {Object} payload Ex.: { targetUrl, slug?, appendUtm?, utm? }
 * @returns {Promise<Object>} Ex.: { slug, shortUrl, timestamps, ... }
 */
export async function createLink(payload) {
  const res = await fetch(`${API}/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

/**
 * Lista links do usuário (paginado).
 * @param {Object} [opts]
 * @param {number} [opts.limit=50]
 * @returns {Promise<{ items: Array, nextCursor?: number }>}
 */
export async function listLinks({ limit = 50 } = {}) {
  const url = new URL(`${API}/links`);
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url);
  return handle(res);
}

/**
 * Obtém estatísticas agregadas de um slug.
 * @param {string} slug
 * @param {Object} [range]
 * @param {string|number|Date} [range.from]
 * @param {string|number|Date} [range.to]
 * @returns {Promise<Object>} Ex.: { total, byDay, topReferrers, ... }
 */
export async function getStats(slug, { from, to } = {}) {
  const url = new URL(`${API}/links/${slug}/stats`);
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);
  const res = await fetch(url);
  return handle(res);
}
