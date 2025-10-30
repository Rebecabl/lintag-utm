import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import dayjs from 'dayjs'
import { Link2, Copy, Check, Trash2, BarChart3, ExternalLink, Plus, Tag } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip,
} from 'recharts'

type UTM = { source?: string; medium?: string; campaign?: string; term?: string; content?: string }
type LinkItem = {
  slug: string
  targetUrl: string
  utm?: UTM
  appendUtm?: boolean
  createdAt: number
  updatedAt: number
}
type Stats = {
  total: number
  byDay: Record<string, number>
  topReferrers?: any[]
  topUtmSources?: any[]
  topUtmMediums?: any[]
  topUtmCampaigns?: any[]
}

const apiBase = import.meta.env.VITE_API_BASE_URL as string
const mkShortUrl = (slug: string) => new URL(`/l/${slug}`, apiBase).toString()

export default function App() {
  const [activeTab, setActiveTab] = useState<'create'|'links'|'analytics'>('create')

  const [url, setUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [utm, setUtm] = useState<UTM>({})
  const [appendUtm, setAppendUtm] = useState(true)

  const [items, setItems] = useState<LinkItem[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string>('')

  const [selectedSlug, setSelectedSlug] = useState<string>('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const canSubmit = useMemo(() => {
    try { new URL(url); return true } catch { return false }
  }, [url])

  async function load() {
    setLoading(true)
    setMessage(null)
    try {
      const res = await axios.get(`${apiBase}/links`)
      setItems(res.data.items ?? [])
    } catch (e: any) {
      setMessage(`Erro ao listar: ${e?.response?.data?.error ?? e.message}`)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setMessage(null)
    setLoading(true)
    try {
      const body: any = { targetUrl: url, appendUtm }
      const cleanUTM: UTM = {}
      if (utm.source) cleanUTM.source = utm.source
      if (utm.medium) cleanUTM.medium = utm.medium
      if (utm.campaign) cleanUTM.campaign = utm.campaign
      if (utm.term) cleanUTM.term = utm.term
      if (utm.content) cleanUTM.content = utm.content
      if (Object.keys(cleanUTM).length) body.utm = cleanUTM
      if (slug.trim()) body.slug = slug.trim().toLowerCase()

      const res = await axios.post(`${apiBase}/links`, body)
      const created: LinkItem = {
        slug: res.data.slug,
        targetUrl: res.data.targetUrl,
        utm: res.data.utm,
        appendUtm: res.data.appendUtm,
        createdAt: res.data.createdAt,
        updatedAt: res.data.updatedAt,
      }
      setItems(prev => [created, ...prev])
      setMessage(`Criado: ${mkShortUrl(res.data.slug)}`)
      setUrl(''); setSlug(''); setUtm({}); setAppendUtm(true)
      setActiveTab('links')
    } catch (e: any) {
      setMessage(`Erro ao criar: ${e?.response?.data?.error ?? e.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function onDelete(s: string) {
    if (!confirm(`Apagar ${s}?`)) return
    try {
      await axios.delete(`${apiBase}/links/${s}`)
      setItems(prev => prev.filter(i => i.slug !== s))
      setMessage(`Apagado: ${s}`)
      if (selectedSlug === s) {
        setSelectedSlug('')
        setStats(null)
      }
    } catch (e: any) {
      setMessage(`Erro ao apagar: ${e?.response?.data?.error ?? e.message}`)
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 1500)
  }

  async function loadStats(slug: string) {
    if (!slug) return
    setLoadingStats(true)
    try {
      const res = await axios.get<Stats>(`${apiBase}/links/${slug}/stats`)
      setStats(res.data)
    } catch (e: any) {
      setMessage(`Erro ao carregar analytics: ${e?.response?.data?.error ?? e.message}`)
      setStats(null)
    } finally {
      setLoadingStats(false)
    }
  }

  function openAnalytics(s: string) {
    setSelectedSlug(s)
    setActiveTab('analytics')
    loadStats(s)
  }

  const chartData = useMemo(() => {
    if (!stats?.byDay) return []
    return Object.entries(stats.byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, clicks]) => ({
        dateLabel: dayjs(date).format('DD/MM'),
        clicks,
      }))
  }, [stats])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl">
                <Link2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Lintag — Encurtador com UTM</h1>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{items.length}</p>
                <p className="text-gray-500">Links</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-8 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Plus className="w-5 h-5" /> Criar Link
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'links'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Link2 className="w-5 h-5" /> Meus Links
          </button>
          <button
            onClick={() => {
              setActiveTab('analytics')
              if (items.length && !selectedSlug) {
                setSelectedSlug(items[0].slug)
                loadStats(items[0].slug)
              }
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-5 h-5" /> Analytics
          </button>
        </div>

        {activeTab === 'create' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Criar Novo Link</h2>

            <form onSubmit={onCreate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Endereço do site (URL de destino) *</label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://exemplo.com/pagina"
                    className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome curto / Slug (opcional)</label>
                <div className="flex">
                  <span className="px-4 py-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-gray-600">
                    {new URL(apiBase).origin}/l/
                  </span>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))}
                    placeholder="meu-link"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-r-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Seu link final ficará assim: {new URL(`/l/${slug || 'exemplo'}`, apiBase).toString()}</p>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Parâmetros UTM (opcional)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Origem (utm_source)</label>
                    <input
                      value={utm.source || ''}
                      onChange={(e) => setUtm(prev => ({ ...prev, source: e.target.value }))}
                      placeholder="instagram, google, newsletter"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Meio (utm_medium)</label>
                    <input
                      value={utm.medium || ''}
                      onChange={(e) => setUtm(prev => ({ ...prev, medium: e.target.value }))}
                      placeholder="bio, social, cpc, email"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Campanha (utm_campaign)</label>
                    <input
                      value={utm.campaign || ''}
                      onChange={(e) => setUtm(prev => ({ ...prev, campaign: e.target.value }))}
                      placeholder="lancamento, black-friday"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Termo (utm_term)</label>
                      <input
                        value={utm.term || ''}
                        onChange={(e) => setUtm(prev => ({ ...prev, term: e.target.value }))}
                        placeholder="palavra-chave (opcional)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Conteúdo (utm_content)</label>
                      <input
                        value={utm.content || ''}
                        onChange={(e) => setUtm(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="banner-topo (opcional)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>

                <label className="mt-4 inline-flex items-center gap-2">
                  <input type="checkbox" checked={appendUtm} onChange={e => setAppendUtm(e.target.checked)} />
                  <span className="text-sm text-gray-700">Anexar UTM automaticamente no redirect</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={load} className="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50">Atualizar</button>
                <button disabled={!canSubmit || loading} className="px-5 py-2.5 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 disabled:opacity-50">
                  {loading ? 'Criando…' : 'Criar link'}
                </button>
              </div>

              {message && <p className="text-sm text-gray-600">{message}</p>}
            </form>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Meus Links</h2>
            {loading ? <p>Carregando…</p> : (
              <div className="flex flex-col gap-3">
                {items.map(i => (
                  <div key={i.slug} className="flex items-start justify-between gap-4 p-4 rounded-xl border hover:shadow-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <a className="text-indigo-600 font-semibold truncate" href={mkShortUrl(i.slug)} target="_blank" rel="noreferrer">
                          {mkShortUrl(i.slug)}
                        </a>
                        <button onClick={() => copy(mkShortUrl(i.slug), i.slug)} className="p-1.5 rounded hover:bg-gray-100">
                          {copiedKey === i.slug ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                        </button>
                        <a className="p-1.5 rounded hover:bg-gray-100" href={i.targetUrl} target="_blank" rel="noreferrer" title="Abrir original">
                          <ExternalLink className="w-4 h-4 text-gray-500" />
                        </a>
                      </div>
                      <div className="text-sm text-gray-600 truncate">{i.targetUrl}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        criado em {dayjs(i.createdAt).format('YYYY-MM-DD HH:mm')}
                      </div>
                      {i.utm && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {i.utm.source && <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full">source: {i.utm.source}</span>}
                          {i.utm.medium && <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full">medium: {i.utm.medium}</span>}
                          {i.utm.campaign && <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full">campaign: {i.utm.campaign}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 rounded border hover:bg-gray-50 text-sm" onClick={() => openAnalytics(i.slug)}>
                        <BarChart3 className="w-4 h-4 inline mr-1" /> Ver gráfico
                      </button>
                      <a className="px-3 py-1.5 rounded border hover:bg-gray-50 text-sm" href={`${apiBase}/links/${i.slug}/qrcode.png`} target="_blank" rel="noreferrer">QR</a>
                      <a className="px-3 py-1.5 rounded border hover:bg-gray-50 text-sm" href={`${apiBase}/links/${i.slug}/stats`} target="_blank" rel="noreferrer" title="JSON bruto">JSON</a>
                      <button className="px-3 py-1.5 rounded border text-red-600 hover:bg-red-50 text-sm" onClick={() => onDelete(i.slug)}>
                        <Trash2 className="w-4 h-4 inline mr-1" /> Apagar
                      </button>
                    </div>
                  </div>
                ))}
                {!items.length && <p className="text-sm text-gray-600">Sem links ainda.</p>}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
              <div className="flex-1" />
              <select
                className="px-3 py-2 border rounded-lg"
                value={selectedSlug}
                onChange={(e) => { setSelectedSlug(e.target.value); loadStats(e.target.value) }}
              >
                <option value="" disabled>Selecione um link…</option>
                {items.map(i => <option key={i.slug} value={i.slug}>{i.slug}</option>)}
              </select>
              <button
                onClick={() => selectedSlug && loadStats(selectedSlug)}
                className="px-3 py-2 rounded-lg border hover:bg-gray-50"
                disabled={!selectedSlug || loadingStats}
              >
                Atualizar
              </button>
            </div>

            {!selectedSlug && <p className="text-sm text-gray-600">Escolha um link no seletor acima para ver os gráficos.</p>}

            {selectedSlug && (
              <>
                {loadingStats && <p className="text-sm text-gray-600">Carregando dados…</p>}

                {!!stats && (
                  <>
                    <div className="mb-6">
                      <p className="text-sm text-gray-600">Total de cliques: <b>{stats.total}</b></p>
                    </div>

                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="dateLabel" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Area type="monotone" dataKey="clicks" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      Dica: para popular “Top Referrers” e UTMs, os cliques precisam vir de outros sites (com cabeçalho <code>Referer</code>)
                      e/ou com <code>?utm_source=...</code> diretamente na URL curta.
                    </p>
                  </>
                )}

                {!loadingStats && !stats && (
                  <p className="text-sm text-gray-600">Sem dados ainda para este link.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
