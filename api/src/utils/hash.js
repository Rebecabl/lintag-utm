import crypto from "crypto"

// Sal da hash (defina um valor forte via env em produção)
const SALT = process.env.HASH_SALT || "change-me"

/**
 * Gera um identificador estável do cliente (IP + User-Agent),
 * útil para deduplicar cliques sem persistir IP em claro.
 * Heurístico: pode haver colisões/impersonação.
 */
export function hashClient(req) {
  // IP: prioriza X-Forwarded-For (proxy/CDN), depois socket, depois req.ip
  const ip = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim()
    || req.socket?.remoteAddress
    || req.ip
    || ""

  const ua = req.get("user-agent") || ""

  // HMAC-SHA256 com SALT; retorna 32 hex chars (compacto)
  const h = crypto.createHmac("sha256", SALT)
  h.update(ip + "|" + ua)
  return h.digest("hex").slice(0, 32)
}
