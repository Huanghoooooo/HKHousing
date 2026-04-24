# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**香港房产数据智能查询平台** — a WeChat Mini Program providing one-stop Hong Kong property data query and intelligent analysis. Targets buyers/investors who currently rely on fragmented data sources (Land Registry, RVD, agency sites). Modeled after mature Shenzhen property query mini-apps but adapted for Hong Kong market specifics (sq ft, HKD, HK district structure, HK stamp duty system).

## Tech Stack (Planned)

| Layer | Choice |
|---|---|
| Frontend | WeChat native / Taro / UniApp (mini-program only, no H5) |
| Charts | ECharts for WeChat |
| API Gateway | Nginx / Kong |
| Backend | Python FastAPI (async) |
| Scheduler | APScheduler |
| Crawler | Playwright (headless), Pandas (Excel), Camelot (PDF) |
| Database | PostgreSQL (with PostGIS for spatial queries) |
| Search | Elasticsearch (fuzzy estate name search, trad/simplified Chinese) |
| Cache | Redis (6h TTL for Class B data) |
| Object Storage | MinIO / cloud OSS (for raw PDF/Excel files) |

## Architecture

**Microservices**: Frontend → API Gateway → Backend Services (Estate Search, Transaction, Market Stats, Stamp Duty Calculator, AI Analysis, Crawler Scheduler, New Developments) → Data Layer (PostgreSQL, Redis, Elasticsearch, OSS)

**Data source classification** (critical for compliance):
- **Class A** — Official static data (RVD, SRPA, Housing Authority): monthly scheduled download via APScheduler
- **Class B** — Commercial dynamic data (Centaline, Midland, 28Hse, House730, Spacious, SEEHSE): user-triggered Playwright crawl, cached 6h
- **Class C** — Industry indices (CCL, Midland Index): piggybacked on Class B tasks
- **Class D** — Legal-barrier data (Land Registry IRIS, bank valuations): **ZERO crawling** — frontend deep-links only, no backend interaction

## Key Files

- `项目介绍文档.md` — Complete system design doc: architecture, data models, API specs, implementation plan, compliance rules. The authoritative reference for this project.
- `香港房产数据接入方案V1.0.pdf` — Data sourcing strategy and compliance framework
- `原型图片1.jpg` / `原型图片2.jpg` — UI prototype reference images
- `深圳房价查询小程序图片/` — Reference screenshots from the Shenzhen property mini-app that this project is modeled after

## Compliance (non-negotiable)

- **Class D sources must never be crawled or stored.** Land Registry and bank valuation data are only accessible via frontend deep-links that open the official website in the user's browser.
- Check `robots.txt` before crawling Class B sites.
- Use identifiable User-Agent headers on all crawlers.
- PDPO compliance required for user data (Hong Kong Personal Data (Privacy) Ordinance).
- API auth: JWT + API Key dual layer.

## Database Models

Core tables defined in the design doc (Section 5.2):
- `estate` — Estate/building info (Chinese/English names, district, build year, lat/lng, type)
- `transaction` — Deal records (price, unit price in HKD/sq ft, saleable area, room layout, data source tracking)
- `listing_history` — Price change timeline for each property
- `listing` — Active listings from commercial platforms
- `price_index` — CCL, Midland index time series
- `market_snapshot` — Aggregated daily/weekly/monthly stats by district
- `new_development` (Phase 2) — New project sales data from SRPA

## MVP Scope (Phase 1, ~12 weeks)

Core pages: Home (search + tool grid) → Estate Search → Estate Detail (transactions/listings/stats tabs) → All-HK Transactions (with filters) → Transaction Detail (property info + AI valuation compare + listing history timeline + historical scatter plot) → Market Stats → Stamp Duty Calculator → Full Cost & ROI Calculator

## Phase 2 Scope (+10 weeks)

New developments module, AI chat advisor, market news feed, user center (saved estates, alerts), expert consultation (paid service).

## Open Decisions (TBD)

See Section 9 of the design doc for 15 items awaiting confirmation, including: LLM model selection, deployment (cloud vs on-prem), proxy pool necessity, WeChat Mini Program category/audit strategy, multi-language support (TC/EN), and payment channel for paid services.
