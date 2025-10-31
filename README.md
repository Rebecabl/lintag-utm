# Lintag — Encurtador de Links com UTM (API + Frontend)

Esse projeto é um **encurtador de links com UTM** (full-stack) que permite criar URLs curtas, **anexar parâmetros de campanha automaticamente** e **acompanhar cliques por dia** para gráficos e relatórios.  


Arquitetura: **API** (Node.js/Express + Firebase Admin/Firestore) e **Frontend** (React/Vite + Tailwind).

> **Para quem é**: creators, blogs, e-commerce, infoprodutores, social media, professores, organizadores de eventos, times de marketing e qualquer pessoa que precisa divulgar links e **saber o que funciona**.
>

---

# Sumário
- [Visão rápida](#visão-rápida)
- [Requisitos](#requisitos)
- [Ambiente](#ambiente)
- [Rodando local](#rodando-local)
- [Endpoints](#endpoints)
- [Fluxo de uso](#fluxo-de-uso)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Dicas e limites](#dicas-e-limites)
- [Testes](#testes)
- [Roadmap curto](#roadmap-curto)
- [Licença](#licença)

---

## Visão rápida
- **Slug opcional:** `/l/meu-link`
- **UTMs anexadas:** no redirect (`utm_source`, `utm_medium`, `utm_campaign`, …)
- **QR Code:** PNG por endpoint
- **Stats em JSON:** total, por dia, principais referrers e UTMs
- **UI simples:** criar, listar, copiar, abrir, QR e ver stats

---

## Requisitos
- **Node.js 18+**
- **Conta Firebase** (Firestore habilitado)
- **Yarn** ou **npm**

---

## Ambiente

### API (`api/.env`) 

#### Tabela de estratégias
| Estratégia                     | Variável                         | Exemplo |
|--------------------------------|----------------------------------|---------|
| Service Account (JSON literal) | `FIREBASE_SERVICE_ACCOUNT_JSON`  | `{"project_id":"...","client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"}` |
| Service Account (base64)       | `FIREBASE_SERVICE_ACCOUNT_BASE64`| `eyJwcm9qZWN0X2lkIjoiLi4uIn0=` |
| Trio separado                  | `FIREBASE_PROJECT_ID`            | `xxx` |
|                                | `FIREBASE_CLIENT_EMAIL`          | `xxx@xxx.iam.gserviceaccount.com` |
|                                | `FIREBASE_PRIVATE_KEY`           | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` |
| Arquivo local (dev)            | `GOOGLE_APPLICATION_CREDENTIALS` | `./firebase-service-account.json` |

#### Outras variáveis de ambiente para a API
```env
PORT=8080
CORS_ORIGIN=http://localhost:5173
HASH_SALT=troque-isto-em-producao
# FIRESTORE_EMULATOR_HOST=127.0.0.1:8081   # opcional (emulador)
# DEV_BYPASS_AUTH=true                     # opcional (ignora auth em dev)

### Frontend (`app/.env`)
```env
VITE_API_BASE_URL=http://localhost:8080
VITE_SHORT_BASE_URL=http://localhost:8080

