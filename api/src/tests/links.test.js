// Exercício de ponta a ponta da Links API:
// criar → listar → redirecionar (registrar cliques) → stats → deletar → validar URL inválida
// Usa slug aleatório para evitar colisões entre execuções

import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../server.js'

// Slug único por execução
function randSlug(prefix = 't') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

describe('Links API', () => {
  const baseUrl = 'https://example.com/pagina-de-teste'
  const slug = randSlug('spec')

  it('POST /links cria link', async () => {
    const res = await request(app)
      .post('/links')
      .send({
        targetUrl: baseUrl,
        slug,
        appendUtm: true,
        utm: { source: 'vitest', medium: 'spec', campaign: 'unit' },
      })
      .expect(201) // 201 Created

    expect(res.body).toBeTruthy()
    expect(res.body.slug).toBe(slug)
    expect(res.body.targetUrl).toBe(baseUrl)
    expect(res.body.appendUtm).toBe(true)
    expect(res.body.utm).toMatchObject({ source: 'vitest', medium: 'spec', campaign: 'unit' })
    expect(typeof res.body.createdAt).toBe('number')
  })

  it('GET /links lista e contém o link criado', async () => {
    const res = await request(app).get('/links').expect(200)
    const items = res.body.items || []
    const found = items.find((i) => i.slug === slug)
    expect(found).toBeTruthy()
    expect(found.targetUrl).toBe(baseUrl)
  })

  it('GET /l/:slug redireciona e registra 3 cliques', async () => {
    // 3 hits na short URL; espera 302 e UTMs na URL final
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .get(`/l/${slug}`)
        .set('Referer', 'https://referrer.example/')
        .expect(302)

      expect(res.headers.location).toMatch(/^https:\/\/example\.com\/pagina-de-teste(\?|#|$)/)
      expect(res.headers.location).toContain('utm_source=')
      expect(res.headers.location).toContain('utm_medium=')
      expect(res.headers.location).toContain('utm_campaign=')
    }
  })

  it('GET /links/:slug/stats total >= 3', async () => {
    const res = await request(app).get(`/links/${slug}/stats`).expect(200)
    expect(res.body).toBeTruthy()
    expect(typeof res.body.total).toBe('number')
    expect(res.body.total).toBeGreaterThanOrEqual(3)
    expect(res.body).toHaveProperty('byDay')
    expect(res.body).toHaveProperty('topReferrers')
  })

  it('DELETE /links/:slug remove link', async () => {
    await request(app).delete(`/links/${slug}`).expect(204) // 204 No Content

    // Confirma remoção na listagem
    const list = await request(app).get('/links').expect(200)
    const items = list.body.items || []
    expect(items.find((i) => i.slug === slug)).toBeUndefined()
  })

  it('POST /links recusa URL inválida', async () => {
    const bad = await request(app)
      .post('/links')
      .send({ targetUrl: 'nao-e-url' })
      .expect(400)

    // Normaliza mensagem de erro (string, .message, issues do Zod, etc.)
    const err = bad.body?.error
    const msg =
      typeof err === 'string' ? err :
      (err && typeof err.message === 'string') ? err.message :
      (Array.isArray(err?.issues) && err.issues[0]?.message) ? err.issues[0].message :
      JSON.stringify(err ?? {})

    expect(String(msg).toLowerCase()).toMatch(/url|inválid|invalid/)
  })
})
