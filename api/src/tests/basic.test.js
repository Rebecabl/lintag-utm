// Testes básicos da API:
// - /health e /debug/firebase
// - Mock de firebase.js para não acessar Firestore real

import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'

// 1) Mock do firebase.js (deve vir antes do import do app)
vi.mock('../firebase.js', () => {
  // Armazenamento em memória para simular doc/coleção
  const store = new Map()

  // API mínima de doc(): set/get
  const makeDoc = (id) => ({
    set: async (data, opts = {}) => {
      const prev = store.get(id) || {}
      store.set(id, opts.merge ? { ...prev, ...data } : data)
    },
    get: async () => ({
      exists: store.has(id),
      data: () => store.get(id)
    })
  })

  return {
    db: {
      // Simula db.collection('x').doc(id)
      collection: (_name) => ({
        doc: (id) => makeDoc(id)
        // Pode ser estendido com add()/get() se necessário
      })
    },
    auth: {},     // não utilizado nestes testes
    default: {}   // compatibilidade com default export
  }
})

// 2) Import do app após o mock
import app from '../server.js'

describe('API básica', () => {
  it('GET /health → { ok: true }', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('GET /debug/firebase → ok:true', async () => {
    const res = await request(app).get('/debug/firebase')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    // A rota retorna { ok:true, exists:<bool> }; aqui validamos apenas ok:true
  })
})
