import React, { useState, useEffect } from "react";
import {
  Link2, Copy, BarChart3, TrendingUp, MousePointer, Globe, Calendar,
  ExternalLink, Check, Plus, Trash2, Download, QrCode, Settings, Filter,
  BarChart2, Zap
} from "lucide-react";
import { API, SHORT, createLink as apiCreate, listLinks as apiList, getStats as apiStats } from "./lib/api";

function shortHref(slug) {
  return `${SHORT}/l/${slug}`;
}
function displayShort(slug) {
  try { return new URL(shortHref(slug)).host + `/l/${slug}`; } catch { return shortHref(slug); }
}
function cleanUtm(u) {
  const out = {};
  for (const k of ["source", "medium", "campaign", "term", "content"]) {
    if (u?.[k]) out[k] = String(u[k]).trim();
  }
  return Object.keys(out).length ? out : undefined;
}
function statsToAnalytics(stats) {
  const total = stats?.total || 0;
  const days = Math.max(Object.keys(stats?.byDay || {}).length, 1);
  const avgDaily = Math.round(total / days);
  const topSource = stats?.topUtmSources?.[0]?.key || "-";
  return {
    clicks: total,
    avgDaily,
    trend: total === 0 ? "Novo" : "—",
    topSource,
    topCountry: "-",
    devices: { mobile: 0, desktop: 0 },
    dailyData: Object.values(stats?.byDay || {})
  };
}

export default function LinkShortener() {
  const [activeTab, setActiveTab] = useState("create");
  const [longUrl, setLongUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [utmParams, setUtmParams] = useState({ source: "", medium: "", campaign: "", term: "", content: "" });
  const [expiresAt, setExpiresAt] = useState("");
  const [links, setLinks] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const resp = await apiList({ limit: 50 });
        const items = (resp.items || []).map(doc => ({
          id: doc.slug,
          slug: doc.slug,
          shortUrl: displayShort(doc.slug),
          longUrl: doc.targetUrl,
          utm: doc.utm || {},
          clicks: 0,
          created: new Date(doc.createdAt || Date.now()).toISOString().split("T")[0],
          analytics: {
            trend: "—",
            avgDaily: 0,
            topSource: "-",
            topCountry: "-",
            devices: { mobile: 0, desktop: 0 },
            dailyData: []
          }
        }));
        setLinks(items);
      } catch (e) {
        console.error("listLinks error", e);
      }
    })();
  }, []);

  async function createLink() {
    if (!longUrl) return;
    try {
      const payload = {
        slug: customSlug || undefined,
        targetUrl: longUrl,
        utm: cleanUtm(utmParams)
      };
      const created = await apiCreate(payload);
      const ui = {
        id: created.slug,
        slug: created.slug,
        shortUrl: displayShort(created.slug),
        longUrl: created.targetUrl,
        utm: created.utm || {},
        clicks: 0,
        created: new Date(created.createdAt || Date.now()).toISOString().split("T")[0],
        analytics: {
          trend: "Novo",
          avgDaily: 0,
          topSource: "-",
          topCountry: "-",
          devices: { mobile: 0, desktop: 0 },
          dailyData: []
        }
      };
      setLinks(prev => [ui, ...prev]);
      setLongUrl("");
      setCustomSlug("");
      setUtmParams({ source: "", medium: "", campaign: "", term: "", content: "" });
      setExpiresAt("");
      setActiveTab("links");
    } catch (e) {
      alert(`Erro ao criar link: ${e.message}`);
    }
  }

  async function openAnalytics(link) {
    setSelectedLink(link);
    setActiveTab("analytics");
    try {
      const stats = await apiStats(link.slug);
      const analytics = statsToAnalytics(stats);
      setSelectedLink(prev => prev ? { ...prev, analytics, clicks: analytics.clicks } : prev);
      setLinks(prev => prev.map(l => l.slug === link.slug ? { ...l, clicks: analytics.clicks, analytics } : l));
    } catch (e) {
      console.error("getStats error", e);
      alert("Não foi possível carregar as métricas agora.");
    }
  }

  function deleteLink(id) {
    setLinks(links.filter(link => link.id !== id));
    if (selectedLink?.id === id) setSelectedLink(null);
  }

  function copyToClipboard(text) {
    const full = `https://${text.replace(/^https?:\/\//, "")}`;
    navigator.clipboard.writeText(full);
    setCopied(text);
    setTimeout(() => setCopied(false), 2000);
  }

  function getTotalClicks() {
    return links.reduce((sum, link) => sum + (Number(link.clicks) || 0), 0);
  }

  function getFilteredLinks() {
    if (!filter) return links;
    return links.filter(link =>
      link.shortUrl.toLowerCase().includes(filter.toLowerCase()) ||
      link.longUrl.toLowerCase().includes(filter.toLowerCase())
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="fixed inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10">
        <header className="backdrop-blur-xl bg-white/10 border-b border-white/10 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-sky-500 rounded-2xl blur opacity-75"></div>
                  <div className="relative bg-gradient-to-r from-blue-600 to-sky-500 p-3 rounded-2xl">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white">Lintag</h1>
                  <p className="text-sm text-sky-300">Link + Tag = Analytics</p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="hidden md:flex items-center space-x-8">
                  <div className="text-center">
                    <p className="text-3xl font-black text-white">{links.length}</p>
                    <p className="text-xs text-sky-300 uppercase">Links</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-400">
                      {getTotalClicks().toLocaleString()}
                    </p>
                    <p className="text-xs text-sky-300 uppercase">Cliques</p>
                  </div>
                </div>
                <button className="p-3 hover:bg-white/10 rounded-xl transition-all">
                  <Settings className="w-6 h-6 text-sky-300" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex space-x-2 mb-8 backdrop-blur-xl bg-white/5 p-2 rounded-2xl border border-white/10">
            {[
              { id: "create", icon: Plus, label: "Criar" },
              { id: "links", icon: Link2, label: "Links" },
              { id: "analytics", icon: BarChart3, label: "Analytics" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 rounded-xl font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg"
                    : "text-sky-200 hover:bg-white/10"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === "create" && (
            <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-8 shadow-2xl">
              <h2 className="text-3xl font-black text-white mb-8">Criar Link</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-sky-200 mb-3 uppercase">
                    URL de Destino
                  </label>
                  <input
                    type="url"
                    value={longUrl}
                    onChange={(e) => setLongUrl(e.target.value)}
                    placeholder="https://seusite.com/pagina"
                    className="w-full px-6 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder-sky-300/50 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-sky-200 mb-3 uppercase">
                      Slug
                    </label>
                    <div className="flex items-center bg-white/5 border-2 border-white/10 rounded-2xl overflow-hidden">
                      <span className="px-4 text-sky-300 text-sm">{new URL(SHORT).host}/l/</span>
                      <input
                        type="text"
                        value={customSlug}
                        onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        placeholder="meu-link"
                        className="flex-1 px-4 py-4 bg-transparent text-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-sky-200 mb-3 uppercase">
                      Expira em
                    </label>
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full px-6 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white outline-none"
                    />
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h3 className="text-xl font-black text-white mb-6">Parâmetros UTM</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: "source", placeholder: "instagram" },
                      { key: "medium", placeholder: "social" },
                      { key: "campaign", placeholder: "black-friday" },
                      { key: "content", placeholder: "banner" }
                    ].map(field => (
                      <div key={field.key}>
                        <label className="block text-xs font-bold text-sky-200 mb-2 uppercase">
                          {field.key}
                        </label>
                        <input
                          type="text"
                          value={utmParams[field.key]}
                          onChange={(e) => setUtmParams({ ...utmParams, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-sky-300/30 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={createLink} disabled={!longUrl} className="w-full relative group disabled:opacity-50">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-sky-500 rounded-2xl blur opacity-75"></div>
                  <div className="relative bg-gradient-to-r from-blue-600 to-sky-500 py-5 rounded-2xl font-black text-white text-lg flex items-center justify-center space-x-3">
                    <Zap className="w-6 h-6" />
                    <span>ENCURTAR AGORA</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {activeTab === "links" && (
            <div className="space-y-6">
              <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-4">
                <div className="flex items-center space-x-3">
                  <Filter className="w-5 h-5 text-sky-300" />
                  <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Buscar..."
                    className="flex-1 bg-transparent text-white placeholder-sky-300/50 outline-none"
                  />
                </div>
              </div>

              {getFilteredLinks().map((link) => (
                <div key={link.id} className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-6 hover:bg-white/15 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-gradient-to-r from-blue-600 to-sky-500 rounded-xl">
                          <Link2 className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl font-black text-white">{link.shortUrl}</span>
                            <button
                              onClick={() => copyToClipboard(link.shortUrl)}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              {copied === link.shortUrl ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4 text-sky-300" />
                              )}
                            </button>
                            <a href={shortHref(link.slug)} target="_blank" rel="noreferrer" className="p-2 hover:bg-white/10 rounded-lg">
                              <ExternalLink className="w-4 h-4 text-sky-300" />
                            </a>
                            <a href={`${API}/links/${link.slug}/qrcode.png`} target="_blank" rel="noreferrer" className="p-2 hover:bg-white/10 rounded-lg">
                              <QrCode className="w-4 h-4 text-sky-300" />
                            </a>
                          </div>
                          <p className="text-sm text-sky-300 truncate">{link.longUrl}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full">
                          <MousePointer className="w-4 h-4 text-sky-300" />
                          <span className="font-black text-white">{(link.clicks || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sky-300">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(link.created).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>

                      {link.utm?.campaign && (
                        <div className="mt-3 flex gap-2">
                          {link.utm?.source && (
                            <span className="px-3 py-1 bg-sky-500/30 text-sky-200 rounded-full text-xs font-bold">
                              {link.utm.source}
                            </span>
                          )}
                          <span className="px-3 py-1 bg-blue-500/30 text-blue-200 rounded-full text-xs font-bold">
                            {link.utm.campaign}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openAnalytics(link)}
                        className="p-3 hover:bg-white/10 rounded-xl transition-colors"
                      >
                        <BarChart3 className="w-5 h-5 text-sky-400" />
                      </button>
                      <button onClick={() => deleteLink(link.id)} className="p-3 hover:bg-white/10 rounded-xl transition-colors">
                        <Trash2 className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 pt-4 border-t border-white/10">
                    <div className="text-center">
                      <p className="text-2xl font-black text-white">{link.analytics.avgDaily}</p>
                      <p className="text-xs text-sky-300">média/dia</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-green-400">{link.analytics.trend}</p>
                      <p className="text-xs text-sky-300">tendência</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-white">{link.analytics.devices.mobile}%</p>
                      <p className="text-xs text-sky-300">mobile</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-white">{link.analytics.topSource}</p>
                      <p className="text-xs text-sky-300">origem</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              {!selectedLink ? (
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-12 text-center">
                  <BarChart3 className="w-20 h-20 text-sky-300 mx-auto mb-4" />
                  <h3 className="text-2xl font-black text-white mb-2">Selecione um link</h3>
                  <p className="text-sky-300">Clique em analytics em qualquer link</p>
                </div>
              ) : (
                <>
                  <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-black text-white mb-2">{selectedLink.shortUrl}</h3>
                        <p className="text-sky-300 text-sm">{selectedLink.longUrl}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const data = `Link,Cliques,Origem\n${selectedLink.slug},${selectedLink.analytics.clicks || 0},${selectedLink.analytics.topSource || "-"}`;
                            const blob = new Blob([data], { type: "text/csv" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `analytics-${selectedLink.slug}.csv`;
                            a.click();
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                        >
                          <Download className="w-4 h-4 text-sky-300" />
                          <span className="text-sm font-bold text-white">CSV</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                      <TrendingUp className="w-10 h-10 text-sky-300 mb-3" />
                      <p className="text-4xl font-black text-white mb-1">{(selectedLink.analytics.clicks || 0).toLocaleString()}</p>
                      <p className="text-sm text-sky-300 uppercase">Total</p>
                    </div>

                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                      <BarChart2 className="w-10 h-10 text-blue-300 mb-3" />
                      <p className="text-4xl font-black text-white mb-1">{selectedLink.analytics.avgDaily || 0}</p>
                      <p className="text-sm text-blue-300 uppercase">Média Diária</p>
                    </div>

                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                      <Globe className="w-10 h-10 text-emerald-300 mb-3" />
                      <p className="text-4xl font-black text-white mb-1">{selectedLink.analytics.topCountry || "-"}</p>
                      <p className="text-sm text-emerald-300 uppercase">Top País</p>
                    </div>

                    <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-6">
                      <TrendingUp className="w-10 h-10 text-green-300 mb-3" />
                      <p className="text-4xl font-black text-green-300 mb-1">{selectedLink.analytics.trend || "—"}</p>
                      <p className="text-sm text-green-300 uppercase">Tendência</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
