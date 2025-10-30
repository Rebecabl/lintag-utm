// App Express principal: middlewares, CORS, rate limit, rotas e health-check.
// Em dev/local, serve /public; no Vercel apenas exporta o app (sem listen).
// Logs via morgan desativados em produção.

import "dotenv/config"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import rateLimit from "express-rate-limit"
import path from "path"
import { fileURLToPath } from "url"

import { db } from "./firebase.js"
import links from "./routes/links.js"
import redirect from "./routes/redirect.js"

// Caminhos para servir /public em dev/local
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const publicDir = path.join(__dirname, "../public")

// Criação do app
const app = express()

// Middlewares base
app.use(express.json({ limit: "1mb" }))
app.use(helmet())

// Logs apenas fora de produção
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("tiny"))
}

// CORS: use CORS_ORIGIN ou ALLOWED_ORIGINS (separados por vírgula)
// Ex.: CORS_ORIGIN="https://meufront.vercel.app,https://meudominio.com"
const origins =
  (process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)

app.use(
  cors({
    // Se houver origem definida, restringe; caso contrário, libera (dev)
    origin: origins.length ? origins : true,
  })
)

// Rate limit básico
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

// Em dev/local, servir /public
if (!process.env.VERCEL) {
  app.use(express.static(publicDir))
}

// Health e diagnóstico do Firestore
app.get("/health", (_req, res) => res.json({ ok: true }))
app.get("/debug/firebase", async (_req, res) => {
  try {
    await db.collection("_diag").doc("ping").set({ ts: Date.now() }, { merge: true })
    const snap = await db.collection("_diag").doc("ping").get()
    res.json({ ok: true, exists: snap.exists })
  } catch (e) {
    console.error("FB error", e)
    res.status(500).json({ ok: false, error: String(e) })
  }
})

// Rotas da API e redirecionamento público
app.use("/links", links)   // autenticada
app.use("/l", redirect)    // pública (redirect + log)

// Localmente inicia o servidor; no Vercel exporta o app
const port = process.env.PORT || 8080
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`API listening on http://localhost:${port}`))
}

export default app
