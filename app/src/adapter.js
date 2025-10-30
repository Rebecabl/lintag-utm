// Adaptação do front para a API do Lintag:
// centraliza base URL, fetch JSON (jfetch) e rotas de conveniência.

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '')

/** Fetch JSON com tratamento simples de erro (texto ou { error }) */
async function jfetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  })
  const ct = res.headers.get('content-type') || ''
  const data = ct.includes('application/json') ? await res.json() : await res.text()
  if (!res.ok) {
    const msg = typeof data === 'string' ? data : data?.error || 'request_failed'
    throw new Error(msg)
  }
  return data
}

const Lintag = {
  /** URL curta pública (redirect) */
  shortUrl: (slug) => `${API_BASE}/l/${slug}`,

  /** URL do QR gerado no backend (size/margin opcionais) */
  qrcodeUrl: (slug, { size = 512, margin = 1 } = {}) =>
    `${API_BASE}/links/${encodeURIComponent(slug)}/qrcode.png?size=${size}&margin=${margin}`,

  /** Cria link (slug e UTM opcionais; limpa UTM vazia) */
  async createLink({ slug, targetUrl, utm, appendUtm = true }) {
    const cleanUtm = utm
      ? Object.fromEntries(Object.entries(utm).filter(([, v]) => v && String(v).trim() !== ''))
      : undefined
    const body = { slug, targetUrl, utm: cleanUtm && Object.keys(cleanUtm).length ? cleanUtm : undefined, appendUtm }
    return jfetch('/links', { method: 'POST', body: JSON.stringify(body) })
  },

  /** Lista links (cursor/limit opcionais) */
  async listLinks({ limit = 100, cursor } = {}) {
    const qs = new URLSearchParams()
    qs.set('limit', String(limit))
    if (cursor) qs.set('cursor', String(cursor))
    return jfetch(`/links?${qs.toString()}`)
  },

  /** Remove link por slug */
  async deleteLink(slug) {
    return jfetch(`/links/${encodeURIComponent(slug)}`, { method: 'DELETE' })
  },

  /** Estatísticas agregadas (from/to opcionais) */
  async stats(slug, { from, to } = {}) {
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    const url = qs.toString()
      ? `/links/${encodeURIComponent(slug)}/stats?${qs.toString()}`
      : `/links/${encodeURIComponent(slug)}/stats`
    return jfetch(url)
  }
}

export default Lintag
