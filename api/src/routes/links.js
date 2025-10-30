// Rotas de links: CRUD, QRCode e estatísticas. Requer verifyAuth.

import { Router } from "express"
import { z } from "zod"
import { db } from "../firebase.js"
import { verifyAuth } from "../middlewares/auth.js"
import { normalizeSlug, randomSlug } from "../utils/slug.js"
import QRCode from "qrcode"
import { toEpochMillis, ymd } from "../utils/time.js"

const router = Router()

/* ========= helpers ========= */

// Esquema de validação do payload de link.
const LinkSchema = z.object({
  slug: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/).optional(),
  targetUrl: z.string().url(),
  utm: z.object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
    term: z.string().optional(),
    content: z.string().optional()
  }).optional(),
  appendUtm: z.boolean().optional().default(true)
})

// Base pública para compor a short URL.
function shortBase() {
  return (process.env.PUBLIC_BASE_URL || "http://localhost:8080").replace(/\/+$/, "")
}
// Constrói a short URL a partir do slug.
function shortUrl(slug) {
  return `${shortBase()}/l/${slug}`
}

/* ========= create ========= */
// Cria um novo link do usuário autenticado.
router.post("/", verifyAuth, async (req, res) => {
  try {
    const parsed = LinkSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    let { slug, targetUrl, utm, appendUtm } = parsed.data
    slug = normalizeSlug(slug || randomSlug(7))

    const ref = db.collection("links").doc(slug)
    const snap = await ref.get()
    if (snap.exists) return res.status(409).json({ error: "slug_in_use" })

    const now = Date.now()
    const link = {
      targetUrl,
      utm: utm || null,
      appendUtm: appendUtm ?? true,
      ownerUid: req.user.uid,
      createdAt: now,
      updatedAt: now
    }

    await ref.set(link)
    res.status(201).json({ slug, shortUrl: shortUrl(slug), ...link })
  } catch (e) {
    console.error("POST /links error:", e)
    res.status(500).json({ error: "internal_error", detail: String(e) })
  }
})

/* ========= list (paginated) ========= */
// Lista os links do usuário (ordem decrescente por createdAt).
router.get("/", verifyAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100)
    const cursor = req.query.cursor
    let q = db.collection("links")
      .where("ownerUid", "==", req.user.uid)
      .orderBy("createdAt", "desc")
      .limit(limit)

    if (cursor) q = q.startAfter(Number(cursor))

    const snap = await q.get()
    const items = []
    snap.forEach(doc => items.push({ slug: doc.id, shortUrl: shortUrl(doc.id), ...doc.data() }))

    const nextCursor = items.length === limit ? items[items.length - 1].createdAt : null
    res.json({ items, nextCursor })
  } catch (e) {
    console.error("GET /links error:", e)
    res.status(500).json({ error: "internal_error", detail: String(e) })
  }
})

/* ========= get one ========= */
// Retorna um link específico do usuário.
router.get("/:slug", verifyAuth, async (req, res) => {
  try {
    const ref = db.collection("links").doc(req.params.slug)
    const doc = await ref.get()
    if (!doc.exists) return res.status(404).json({ error: "not_found" })
    const data = doc.data()
    if (data.ownerUid !== req.user.uid) return res.status(403).json({ error: "forbidden" })
    res.json({ slug: req.params.slug, shortUrl: shortUrl(req.params.slug), ...data })
  } catch (e) {
    console.error("GET /links/:slug error:", e)
    res.status(500).json({ error: "internal_error", detail: String(e) })
  }
})

/* ========= patch (no slug change) ========= */
// Atualiza campos do link (o slug não é alterado).
router.patch("/:slug", verifyAuth, async (req, res) => {
  try {
    const parsed = LinkSchema.partial().safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const ref = db.collection("links").doc(req.params.slug)
    const doc = await ref.get()
    if (!doc.exists) return res.status(404).json({ error: "not_found" })
    const data = doc.data()
    if (data.ownerUid !== req.user.uid) return res.status(403).json({ error: "forbidden" })

    const update = { ...parsed.data, updatedAt: Date.now() }
    delete update.slug

    await ref.update(update)
    res.json({ ok: true })
  } catch (e) {
    console.error("PATCH /links/:slug error:", e)
    res.status(500).json({ error: "internal_error", detail: String(e) })
  }
})

/* ========= delete ========= */
// Remove um link do usuário.
router.delete("/:slug", verifyAuth, async (req, res) => {
  try {
    const ref = db.collection("links").doc(req.params.slug)
    const doc = await ref.get()
    if (!doc.exists) return res.status(404).json({ error: "not_found" })
    const data = doc.data()
    if (data.ownerUid !== req.user.uid) return res.status(403).json({ error: "forbidden" })
    await ref.delete()
    res.status(204).end()
  } catch (e) {
    console.error("DELETE /links/:slug error:", e)
    res.status(500).json({ error: "internal_error", detail: String(e) })
  }
})

/* ========= qrcode (tamanho configurável) ========= */
// Retorna um PNG de QR Code da short URL.
router.get("/:slug/qrcode.png", verifyAuth, async (req, res) => {
  try {
    const ref = db.collection("links").doc(req.params.slug)
    const doc = await ref.get()
    if (!doc.exists) return res.status(404).end()
    const data = doc.data()
    if (data.ownerUid !== req.user.uid) return res.status(403).end()

    const url = new URL(shortUrl(req.params.slug))

    const size = Math.max(128, Math.min(2048, Number(req.query.size) || 512))
    const margin = Math.max(0, Math.min(8, Number(req.query.margin) || 1))

    const png = await QRCode.toBuffer(url.toString(), { width: size, margin })
    res.setHeader("Content-Type", "image/png")
    res.setHeader("Cache-Control", "no-store") // cache curto em dev
    res.send(png)
  } catch (e) {
    console.error("GET /links/:slug/qrcode.png error:", e)
    res.status(500).end()
  }
})

/* ========= stats ========= */
// Estatísticas agregadas do link (janela limitada).
router.get("/:slug/stats", verifyAuth, async (req, res) => {
  try {
    const slug = req.params.slug
    const linkDoc = await db.collection("links").doc(slug).get()
    if (!linkDoc.exists) return res.status(404).json({ error: "not_found" })
    if (linkDoc.data().ownerUid !== req.user.uid) return res.status(403).json({ error: "forbidden" })

    const from = toEpochMillis(req.query.from)
    const to = toEpochMillis(req.query.to) || Date.now()
    const limitDays = 400 * 24 * 60 * 60 * 1000
    if (from && to - from > limitDays) {
      return res.status(400).json({ error: "range_too_large" })
    }

    let q = db.collection("clicks")
      .where("linkSlug", "==", slug)
      .orderBy("ts", "desc")
      .limit(5000)
    if (from) q = q.where("ts", ">=", from)

    const snap = await q.get()

    const total = snap.size
    const byDay = {}
    const referrers = {}
    const utmSources = {}
    const utmMediums = {}
    const utmCampaigns = {}

    snap.forEach(doc => {
      const c = doc.data()
      if (to && c.ts > to) return

      const day = ymd(c.ts)
      byDay[day] = (byDay[day] || 0) + 1

      const ref = (c.referrer || "").replace(/^https?:\/\//, "").split("/")[0]
      if (ref) referrers[ref] = (referrers[ref] || 0) + 1

      const qp = c.qp || {}
      const lutm = c.lutm || {}
      const src = qp.utm_source || lutm.source
      const med = qp.utm_medium || lutm.medium
      const camp = qp.utm_campaign || lutm.campaign
      if (src) utmSources[src] = (utmSources[src] || 0) + 1
      if (med) utmMediums[med] = (utmMediums[med] || 0) + 1
      if (camp) utmCampaigns[camp] = (utmCampaigns[camp] || 0) + 1
    })

    const top = (obj, n = 10) =>
      Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }))

    res.json({
      total,
      byDay,
      topReferrers: top(referrers),
      topUtmSources: top(utmSources),
      topUtmMediums: top(utmMediums),
      topUtmCampaigns: top(utmCampaigns)
    })
  } catch (e) {
    console.error("GET /links/:slug/stats error:", e)
    res.status(500).json({ error: "internal_error", detail: String(e) })
  }
})

export default router
