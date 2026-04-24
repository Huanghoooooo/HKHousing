# HK Housing Property Intelligence Platform

A one-stop Hong Kong property data query platform — WeChat Mini Program that aggregates fragmented real estate data across government, commercial, and banking sources, with AI-powered valuation comparison.

**Status: MVP Demo** | **Stack: Node.js + Express (demo), Python FastAPI (production)**

---

## Quick Start

```bash
cd backend-node
npm install
node server.js
# Open http://localhost:8080
```

---

## Core Architecture: ABCD Data Source Classification

All property data sources are classified by **legal risk** and **update frequency** into four tiers:

| Class | Risk | Strategy | Example Sources |
|-------|------|----------|-----------------|
| **A** | Low (gov public) | Scheduled download → Parse → PostgreSQL | RVD (Rating & Valuation Dept) |
| **B** | Medium (commercial) | User-triggered Playwright crawl + Redis 6h cache | Centaline, Midland, 28Hse, House730, Spacious, SEEHSE |
| **C** | Low (piggyback) | Scraped in parallel with Class B | CCL Index, Midland Price Index |
| **D** | **High (legally protected)** | **Zero crawling — frontend deep-link only** | Land Registry IRIS, Bank valuations (BOCHK, HSBC, Hang Seng) |

The **key innovation**: Class D data (Land Registry + bank valuations) is never crawled, stored, or proxied. The platform only provides deep-links that open official sites in the user's browser — zero legal liability.

---

## Project Structure

```
backend-node/
  server.js              # Express API server
  data_sources/
    class_a.js           # A: Official data (RVD) — scheduled download
    class_b.js           # B: Commercial crawl — Playwright + Redis cache
    class_c.js           # C: CCL/Midland indices — piggyback collection
    class_d.js           # D: Deep links only — zero crawling
frontend/
  index.html             # WeChat-style mobile web app (375×812)
  css/style.css          # Light theme UI
  js/app.js              # Navigation, filters, API integration
项目介绍文档.md           # Full system design document (Chinese)
香港房产数据平台_架构与实现说明.pdf  # Architecture & implementation overview
```

---

## Features (MVP)

- **Estate Search** — Fuzzy search with TC/SC/EN support across 15 Hong Kong estates
- **All-HK Transactions** — Browse + filter (district × area × price × sort) with real-time data source indicator
- **Transaction Detail** — Property attributes + AI valuation comparison (Class D deep-links) + listing history timeline
- **Market Stats** — Daily snapshots by district + CCL/Midland index tracking
- **Stamp Duty Calculator** — AVD + BSD + NRSD progressive rate computation
- **Bottom Tab Navigation** — WeChat Mini Program push/pop navigation model

---

## Important Documents

- [项目介绍文档.md](项目介绍文档.md) — Complete system design: architecture, data models, API specs, compliance, implementation plan
- [架构与实现说明.pdf](香港房产数据平台_架构与实现说明.pdf) — Architecture deep-dive with decision rationale
- [CLAUDE.md](CLAUDE.md) — Claude Code guidance for working in this repo

---

## Compliance (Non-Negotiable)

- **Class D sources must never be crawled or stored.** Land Registry and bank valuation data are only accessible via frontend deep-links.
- Check `robots.txt` before crawling Class B sites.
- Use identifiable User-Agent headers on all crawlers.
- PDPO compliance required for user data.

---

## License

This project is for demonstration purposes.
