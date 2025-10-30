import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Link2, Copy, Check, Trash2, BarChart3, ExternalLink, Plus, Tag
} from "lucide-react";

/** Tipos para UTM e Link */
type UTM = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
};

type LinkItem = {
  slug: string;
  targetUrl: string;
  utm?: UTM;
  appendUtm?: boolean;
  createdAt?: number;
  updatedAt?: number;
  shortUrl?: string;
};

/** Base da API (definida no .env do front) */
const apiBase = import.meta.env.VITE_API_BASE_URL as string;
/** Helper para montar URL curta (fallback se a API não devolver shortUrl) */
const mkShortUrl = (slug: string) => new URL(`/l/${slug}`, apiBase).toString();

/**
 * Componente principal do encurtador (criar/gerenciar/abrir analytics)
 * - Usa a API para criar links
 * - Lista links do usuário
 * - Abre stats/QR no backend
 */
export default function LinkShortener() {
  /** Guia ativa */
  const [activeTab, setActiveTab] = useState<"create" | "manage" | "analytics">("create");

  // ----- Formulário de criação -----
  const [targetUrl, setTargetUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [utm, setUtm] = useState<UTM>({ source: "", medium: "", campaign: "", content: "" });
  const [appendUtm, setAppendUtm] = useState(true);

  // ----- Estado de UI -----
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [createdShortUrl, setCreatedShortUrl] = useState<string>("");

  // ----- Dados -----
  const [items, setItems] = useState<LinkItem[]>([]);
  const [selected, setSelected] = useState<LinkItem | null>(null);

  /** Validação rápida: aceita apenas se targetUrl for uma URL válida */
  const canSubmit = useMemo(() => {
    try { new URL(targetUrl); } catch { return false; }
    return true;
  }, [targetUrl]);

  /** Carrega a listagem de links do usuário */
  async function load() {
    setMessage(null);
    setError(null);
    try {
      const res = await axios.get(`${apiBase}/links`);
      setItems(res.data.items ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || "Falha ao listar");
    }
  }

  // Carrega assim que o componente monta
  useEffect(() => { load(); }, []);

  /** Cria link chamando a API (/links) */
  async function onCreate() {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const body: any = { targetUrl, appendUtm };
      // Limpa UTM (só envia chaves preenchidas)
      const cleanedUtm: any = {};
      if (utm.source) cleanedUtm.source = utm.source;
      if (utm.medium) cleanedUtm.medium = utm.medium;
      if (utm.campaign) cleanedUtm.campaign = utm.campaign;
      if (utm.content) cleanedUtm.content = utm.content;
      if (Object.keys(cleanedUtm).length) body.utm = cleanedUtm;
      if (slug.trim()) body.slug = slug.trim().toLowerCase();

      const res = await axios.post(`${apiBase}/links`, body);
      // A API devolve: { slug, shortUrl, targetUrl, utm, appendUtm, createdAt, updatedAt }
      const created: LinkItem = {
        slug: res.data.slug,
        shortUrl: res.data.shortUrl || mkShortUrl(res.data.slug),
        targetUrl: res.data.targetUrl,
        utm: res.data.utm,
        appendUtm: res.data.appendUtm,
        createdAt: res.data.createdAt,
        updatedAt: res.data.updatedAt,
      };

      setItems(prev => [created, ...prev]);
      setCreatedShortUrl(created.shortUrl!);
      setMessage("Link criado com sucesso!");
      // Reset leve (mantém appendUtm ligado)
      setSlug("");
      setUtm({ source: "", medium: "", campaign: "", content: "" });
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || "Não foi possível criar o link");
    } finally {
      setLoading(false);
    }
  }

  /** Apaga link (confirmação + chamada DELETE /links/:slug) */
  async function onDelete(s: string) {
    if (!confirm(`Apagar ${s}?`)) return;
    try {
      await axios.delete(`${apiBase}/links/${s}`);
      setItems(prev => prev.filter(i => i.slug !== s));
      if (selected?.slug === s) setSelected(null);
      setMessage(`Apagado: ${s}`);
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || "Falha ao apagar");
    }
  }

  /** Copia texto para área de transferência e mostra feedback visual */
  function copy(text: string | undefined, id: string | number) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  }

  /** Limpa campos do formulário e mensagens */
  function resetForm() {
    setTargetUrl("");
    setSlug("");
    setUtm({ source: "", medium: "", campaign: "", content: "" });
    setCreatedShortUrl("");
    setMessage(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-2xl shadow-lg">
              <Link2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Lintag — Encurtador com UTM</h1>
          {/* Mostrar base da API ajuda em dev (você pode ocultar em prod se quiser) */}
          <p className="text-gray-600">API: {apiBase}</p>
        </div>

        {/* Abas: criar / gerenciar / analytics */}
        <div className="flex gap-2 mb-6 bg-white p-2 rounded-2xl shadow-md">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
              activeTab === "create"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Criar Link
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
              activeTab === "manage"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Link2 className="w-5 h-5 inline mr-2" />
            Meus Links ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${
              activeTab === "analytics"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <BarChart3 className="w-5 h-5 inline mr-2" />
            Analytics
          </button>
        </div>

        {/* Criar */}
        {activeTab === "create" && (
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="space-y-6">
              {/* URL de destino */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço do site (URL de destino) *
                </label>
                <div className="relative">
                  <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="url"
                    value={targetUrl}
                    onChange={e => setTargetUrl(e.target.value)}
                    placeholder="https://exemplo.com/pagina"
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Slug (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome curto / Slug (opcional)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="meu-link"
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Seu link final ficará assim: <code>{mkShortUrl(slug || "exemplo")}</code>
                </p>
              </div>

              {/* UTMs (opcionais) */}
              <div className="border-t-2 border-gray-100 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Parâmetros UTM (opcional)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Origem (utm_source)
                    </label>
                    <input
                      type="text"
                      value={utm.source || ""}
                      onChange={e => setUtm(prev => ({ ...prev, source: e.target.value }))}
                      placeholder="instagram, google, newsletter"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meio (utm_medium)
                    </label>
                    <input
                      type="text"
                      value={utm.medium || ""}
                      onChange={e => setUtm(prev => ({ ...prev, medium: e.target.value }))}
                      placeholder="bio, social, cpc, email"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campanha (utm_campaign)
                    </label>
                    <input
                      type="text"
                      value={utm.campaign || ""}
                      onChange={e => setUtm(prev => ({ ...prev, campaign: e.target.value }))}
                      placeholder="lancamento, black-friday"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Conteúdo (utm_content)
                    </label>
                    <input
                      type="text"
                      value={utm.content || ""}
                      onChange={e => setUtm(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="banner-topo, criativo-01"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <label className="mt-4 inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={appendUtm}
                    onChange={e => setAppendUtm(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Anexar UTM automaticamente no redirecionamento
                </label>
              </div>

              {/* Botão criar */}
              <button
                onClick={onCreate}
                disabled={loading || !canSubmit}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? "Encurtando..." : "Encurtar URL"}
              </button>

              {/* Mensagens */}
              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-green-700">{message}</p>}
            </div>

            {/* Resultado de criação (com copiar / novo) */}
            {createdShortUrl && (
              <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-100">
                <p className="text-sm text-gray-600 mb-2">✨ Seu link encurtado:</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white px-4 py-3 rounded-lg font-mono text-indigo-600 font-semibold">
                    {createdShortUrl}
                  </div>
                  <button
                    onClick={() => copy(createdShortUrl, "new")}
                    className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition-colors"
                    title="Copiar"
                  >
                    {copiedId === "new" ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={resetForm}
                    className="bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Novo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gerenciar (lista cartões dos links) */}
        {activeTab === "manage" && (
          <div className="space-y-4">
            {!items.length ? (
              <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
                <Link2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum link criado ainda</h3>
                <p className="text-gray-600 mb-6">Comece criando seu primeiro link encurtado!</p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  Criar Primeiro Link
                </button>
              </div>
            ) : (
              items.map(i => (
                <div key={i.slug} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl font-bold text-indigo-600 break-all">
                          {i.shortUrl || mkShortUrl(i.slug)}
                        </span>
                        <button
                          onClick={() => copy(i.shortUrl || mkShortUrl(i.slug), i.slug)}
                          className="text-indigo-600 hover:text-indigo-700 p-1"
                          title="Copiar"
                        >
                          {copiedId === i.slug ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>

                      <p className="text-gray-600 text-sm truncate mb-2">{i.targetUrl}</p>

                      {i.utm && (i.utm.source || i.utm.medium || i.utm.campaign || i.utm.content) && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {i.utm.source && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              source: {i.utm.source}
                            </span>
                          )}
                          {i.utm.medium && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              medium: {i.utm.medium}
                            </span>
                          )}
                          {i.utm.campaign && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              campaign: {i.utm.campaign}
                            </span>
                          )}
                          {i.utm.content && (
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                              content: {i.utm.content}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <a
                        href={i.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-700 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Abrir URL de destino"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                      <a
                        href={`${apiBase}/links/${i.slug}/qrcode.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-700 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                        title="QR Code"
                      >
                        QR
                      </a>
                      <a
                        href={`${apiBase}/links/${i.slug}/stats`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-700 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Ver estatísticas"
                      >
                        Stats
                      </a>
                      <button
                        onClick={() => onDelete(i.slug)}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Apagar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-4 border-t border-gray-100 text-sm text-gray-600">
                    {i.createdAt && <span>Criado em {new Date(i.createdAt).toLocaleString("pt-BR")}</span>}
                    {i.updatedAt && <span>Atualizado em {new Date(i.updatedAt).toLocaleString("pt-BR")}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Analytics (abre painel do backend /links/:slug/stats) */}
        {activeTab === "analytics" && (
          <div className="bg-white rounded-3xl shadow-xl p-8">
            {!items.length ? (
              <p className="text-gray-600">Crie links para visualizar as estatísticas.</p>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Dica: clique em <b>Stats</b> no cartão do link (aba <b>Meus Links</b>) para abrir o painel do servidor.
                </p>
                <div className="space-y-3">
                  {items.map(i => (
                    <div key={i.slug} className="flex items-center justify-between border-2 border-gray-200 rounded-xl p-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-indigo-600 break-all">
                          {i.shortUrl || mkShortUrl(i.slug)}
                        </div>
                        <div className="text-sm text-gray-600 truncate">{i.targetUrl}</div>
                      </div>
                      <a
                        href={`${apiBase}/links/${i.slug}/stats`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        <BarChart3 className="w-4 h-4" /> Abrir Stats
                      </a>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
