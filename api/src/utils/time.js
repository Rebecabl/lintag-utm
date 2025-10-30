/**
 * Converte string/Date para epoch millis.
 * Retorna null se inválido.
 */
export function toEpochMillis(d) {
  if (!d) return null
  const t = new Date(d)
  if (Number.isNaN(t.getTime())) return null
  return t.getTime()
}

/**
 * Formata timestamp (ms) em YYYY-MM-DD (UTC).
 * Útil para agregação diária consistente.
 */
export function ymd(ts) {
  const d = new Date(ts)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}
