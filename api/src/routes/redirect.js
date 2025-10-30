// Redirecionamento público: GET /l/:slug. Lê o link e registra clique.

import { Router } from "express"
import { db } from "../firebase.js"
import { hashClient } from "../utils/hash.js"

const router = Router()

// Anexa parâmetros UTM quando necessário.
function appendUtmIfNeeded(targetUrl, linkUtm = {}, clickUtm = {}) {
  try {
    const url = new URL(targetUrl)

    // Começa com UTMs do link; UTMs do clique têm prioridade.
    const utm = { ...linkUtm }

    // 1) Prioriza utm_* vindas da query string.
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      if (clickUtm[k]) utm[k] = clickUtm[k]
    }

    // 2) Converte forma curta do link (source/medium/...) para utm_* quando ausente.
    const map = { source: "utm_source", medium: "utm_medium", campaign: "utm_campaign", term: "utm_term", content: "utm_content" }
    for (const [short, full] of Object.entries(map)) {
      if (linkUtm?.[short] && !utm[full]) utm[full] = linkUtm[short]
    }

    // 3) Só adiciona se não existir na query.
    for (const [k, v] of Object.entries(utm)) {
      if (!url.searchParams.has(k) && v) url.searchParams.set(k, v)
    }

    return url.toString()
  } catch {
    // Se a URL de destino for inválida, retorna sem alterações.
    return targetUrl
  }
}

// GET /l/:slug → redireciona e registra clique.
router.get("/:slug", async (req, res) => {
  const slug = req.params.slug

  // Carrega o link.
  const ref = db.collection("links").doc(slug)
  const doc = await ref.get()
  if (!doc.exists) return res.status(404).send("Not found")
  const link = doc.data()

  // UTMs vindas da query string do clique.
  const clickUtm = {}
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    if (req.query[k]) clickUtm[k] = String(req.query[k])
  }

  // Monta a URL final conforme a flag appendUtm.
  const finalUrl = link.appendUtm !== false
    ? appendUtmIfNeeded(link.targetUrl, link.utm || {}, clickUtm)
    : link.targetUrl

  // Registro assíncrono do clique (não bloqueia o redirect).
  const rec = {
    linkSlug: slug,
    ts: Date.now(),
    ua: req.get("user-agent") || "",
    referrer: req.get("referer") || "",
    ipHash: hashClient(req),
    qp: Object.keys(req.query).length ? Object.fromEntries(Object.entries(req.query).map(([k, v]) => [k, String(v)])) : null,
    lutm: link.utm || null
  }
  db.collection("clicks").add(rec).catch(() => {}) // Falha no log não impede o redirect.

  // Redireciona.
  return res.redirect(302, finalUrl)
})

export default router
