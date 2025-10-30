/**
 * Normaliza slug:
 * - minúsculas
 * - caracteres inválidos → "-"
 * - múltiplos "-" → um só
 * - remove "-" nas bordas
 */
export function normalizeSlug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "")
}

/**
 * Slug aleatório [a-z0-9] de tamanho configurável (fallback).
 */
export function randomSlug(size = 7) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let out = ""
  for (let i = 0; i < size; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}
