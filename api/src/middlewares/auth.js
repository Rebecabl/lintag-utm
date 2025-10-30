// Middleware de autenticação com Firebase ID Token.

import admin from "../firebase.js" // default export = admin
import "dotenv/config"

export function verifyAuth(req, res, next) {
  try {
    // Bypass de autenticação para desenvolvimento local (não usar em produção).
    if (process.env.DEV_BYPASS_AUTH === "true") {
      req.user = { uid: "dev-user" }
      return next()
    }

    // Lê o header Authorization no formato "Bearer <token>".
    const h = req.headers.authorization || ""
    const [, token] = h.split(" ")
    if (!token) return res.status(401).json({ error: "missing_token" })

    // Valida o token e injeta o uid no request.
    admin.auth().verifyIdToken(token)
      .then(decoded => { req.user = { uid: decoded.uid }; next() })
      .catch(() => res.status(401).json({ error: "invalid_token" }))
  } catch (e) {
    // Erro inesperado no fluxo do middleware.
    console.error("verifyAuth error:", e)
    return res.status(500).json({ error: "auth_middleware_failed" })
  }
}

export default verifyAuth
