# Lintag — Encurtador de Links com UTM (API + Frontend)

Esse projeto é um **encurtador de links com UTM** (full-stack) que permite criar URLs curtas, **anexar parâmetros de campanha automaticamente** e **acompanhar cliques por dia** para gráficos e relatórios.  


Arquitetura: **API** (Node.js/Express + Firebase Admin/Firestore) e **Frontend** (React/Vite + Tailwind).

> **Para quem é**: creators, blogs, e-commerce, infoprodutores, social media, professores, organizadores de eventos, times de marketing e qualquer pessoa que precisa divulgar links e **saber o que funciona**.

---

## ✨ O que o Lintag faz

- **Encurta links** grandes e feios em links curtos e fáceis de memorizar.
- Permite **um nome curto** (slug) — ex.: `seusite.com/l/black-friday`.
- Adiciona **UTM** (utm_source, utm_medium, utm_campaign, …) para você identificar de onde veio cada clique.
- Cria **QR Code** do link, perfeito para **stories, cartazes, slides e embalagens**.
- Conta **cliques por dia** e separa **principais origens** (referrers) e **UTMs** mais usados.
- Mostra sua lista de links com **cópia rápida**, **abrir**, **QR** e **Stats**.

---

## 🧭 Como usar 

1. **Criar link**  
   Cole a **URL de destino** (o site para onde você quer levar as pessoas).  
   (Opcional) Dê um **nome curto** (slug) — exemplo: `meu-ebook`, `promo-outubro`.

2. **Adicionar UTM (opcional, porém poderoso)**  
   Preencha “**Origem**” (utm_source), “**Meio**” (utm_medium) e “**Campanha**” (utm_campaign).  
   Ex.: `instagram` / `bio` / `lancamento-ebook`.

3. **Criar**  
   Clique em **Criar link**. Ele aparece na aba **Meus Links** com botões para **Copiar**, **Abrir**, **QR** e **Stats**.

4. **Compartilhar e medir**  
   Use o link curto (ou o **QR Code**) onde quiser.  
   Com o tempo, os **cliques por dia** vão aparecendo em **Stats** (endpoint JSON de estatísticas).

> **Dica prática**: crie um slug por **campanha** e varie o **utm_source** por canal (Instagram, WhatsApp, E-mail, …). Isso te mostra rapidamente **qual canal performa melhor**.

---

## 📚 Dicionário rápido 

- **URL de destino**: para onde o clique vai levar a pessoa (ex.: sua página de vendas).
- **Slug**: o “apelido” do link curto. Ex.: `/l/minha-promo`.
- **UTM**: etiquetas invisíveis na URL que te dizem **de onde veio o clique**.  
  - **utm_source** = Origem (instagram, google, newsletter…)  
  - **utm_medium** = Meio (bio, social, cpc, email…)  
  - **utm_campaign** = Nome da campanha (black-friday, lançamento…)  
- **QR Code**: imagem que, escaneada pela câmera, abre seu link curto.
- **Stats**: contagem de cliques por dia e ranking das principais origens/UTMs.

---

## 🧩 Exemplos de uso que funcionam

- **Promo no Instagram**: slug `promo-nov`, UTM `instagram / bio / novembro-2025`.  
- **Cartaz do evento**: imprime o **QR Code**; no telão, o público escaneia e abre a inscrição.  
- **WhatsApp vs E-mail**: crie duas versões do mesmo destino com UTMs diferentes para ver **quem ganhou**.  
- **Sala de aula**: QR no slide para baixar material ou responder formulário.  
- **Blog**: unifique seus links de afiliado em versões curtas e rastreáveis.

---

## 🖥️ O que você vê na interface

- **Aba “Criar Link”**  
  URL de destino, Slug (opcional), UTM (opcional) e botão “Criar”.

- **Aba “Meus Links”**  
  Lista com cada link curto, data de criação, UTMs aplicadas e ações:
  **Copiar**, **Abrir**, **QR**, **Stats** (estatísticas em JSON).

- **Stats**  
  Mostra **total de cliques**, **cliques por dia** e rankings de **referrers/UTMs**.  
 

---

## 🔮 Roadmap

- **Gráfico** de cliques por dia diretamente na interface.  
-  **Tema claro/escuro** com alternância no topo.  
-  **Busca/filtrar** na lista de links.  
-  **Colaboração** (multiusuário) e permissões.  
-  **Exportar** CSV/Excel de estatísticas.


---


# ⚙️ Visão técnica — Frontend & Backend

## Arquitetura geral

**Frontend (app/)**
- **React + Vite + Tailwind**.
- Telas: **Criar Link** e **Meus Links** (copiar, abrir, QR, stats).


**Backend (api/)**
- **Node + Express + Firestore**.
- Rotas principais:
  - `POST /links` (criar),
  - `GET /links` (listar),
  - `DELETE /links/:slug` (apagar),
  - `GET /links/:slug/qrcode.png` (QR),
  - `GET /links/:slug/stats` (estatísticas em JSON),
  - `GET /l/:slug` (redirect + contagem).
- Segurança básica: `helmet`, `cors`, `rate-limit`, validações.

