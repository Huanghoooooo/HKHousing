"""
香港房产数据智能查询平台 — API Backend
FastAPI application exposing all REST endpoints for the WeChat Mini Program frontend.
"""

from fastapi import FastAPI, Query, Path, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
import random

from data_sources import OfficialDataSource, CommercialDataSource, IndexDataSource, DeepLinkSource

app = FastAPI(title="香港房产数据查询平台", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Initialize data sources ---
class_a = OfficialDataSource()
class_b = CommercialDataSource()
class_c = IndexDataSource()
class_d = DeepLinkSource()


# ============================================================================
# 5.4.1 屋苑搜索 (Estate Search)
# ============================================================================

@app.get("/api/v1/estates/search")
def search_estates(keyword: str = Query(..., description="Search keyword (supports TC/SC/EN)"),
                   page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=50)):
    result = class_a.get_estates(keyword=keyword, page=page, size=size)
    return {"code": 0, "data": result}


@app.get("/api/v1/estates/{estate_id}")
def get_estate(estate_id: int = Path(..., ge=0)):
    estate = class_a.get_estate_by_id(estate_id)
    if not estate:
        raise HTTPException(status_code=404, detail="屋苑不存在")
    transactions = class_a.generate_transactions(estate_id, count=10)
    return {
        "code": 0,
        "data": {
            "estate": estate,
            "stats": {
                "total_transactions": len(transactions),
                "avg_unit_price": int(sum(t["unit_price"] for t in transactions) / len(transactions)) if transactions else 0,
                "recent_30d_count": sum(1 for t in transactions if t["transaction_date"] >= "2026-03-24"),
            },
            "recent_transactions": transactions[:5],
        },
    }


# ============================================================================
# 5.4.2 成交数据 (Transactions)
# ============================================================================

@app.get("/api/v1/transactions")
def get_transactions(
    district: Optional[str] = Query(None, description="区域: 港島/九龍/新界"),
    area_min: Optional[float] = Query(None, description="最小实用面积(呎)"),
    area_max: Optional[float] = Query(None, description="最大实用面积(呎)"),
    price_min: Optional[float] = Query(None, description="最低成交价(万)"),
    price_max: Optional[float] = Query(None, description="最高成交价(万)"),
    sort: str = Query("date_desc", description="排序: date_desc/date_asc/price_desc/price_asc"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
):
    result = class_b.crawl_transactions(
        district=district, area_min=area_min, area_max=area_max,
        price_min=price_min, price_max=price_max, sort=sort, page=page, size=size,
    )
    return {
        "code": 0,
        "data": result["data"],
        "meta": {"source": result["source"], "cached": result["cached"]},
    }


@app.get("/api/v1/transactions/{txn_id}")
def get_transaction_detail(txn_id: int = Path(...)):
    # Find transaction across all estates
    txn = None
    for eid in range(len(class_a.ESTATES)):
        txns = class_a.generate_transactions(eid, count=30)
        for t in txns:
            if t["id"] == txn_id:
                txn = t
                estate = class_a.get_estate_by_id(eid)
                txn["estate_name_tc"] = estate["name_tc"]
                txn["district"] = estate["district"]
                txn["sub_district"] = estate["sub_district"]
                break
        if txn:
            break

    if not txn:
        raise HTTPException(status_code=404, detail="成交记录不存在")

    # Generate listing history timeline
    import copy
    history = []
    listing_date_raw = txn.get("transaction_date", "2026-01-01")
    from datetime import date, timedelta
    try:
        ld = date.fromisoformat(listing_date_raw)
    except Exception:
        ld = date.today()
    askings = [
        ("首次挂牌", round(txn["transaction_price"] * 1.08, 1), ld - timedelta(days=txn["listing_duration"])),
        ("调价", round(txn["transaction_price"] * 1.05, 1), ld - timedelta(days=txn["listing_duration"] // 2)),
        ("调价", round(txn["transaction_price"] * 1.02, 1), ld - timedelta(days=txn["listing_duration"] // 4)),
        ("签约成交", txn["transaction_price"], ld),
        ("正式售出", txn["transaction_price"], ld + timedelta(days=random.randint(20, 60))),
    ]
    for evt_type, price, evt_date in askings:
        history.append({
            "event_type": evt_type,
            "event_date": evt_date.isoformat(),
            "price": price,
            "price_change": round(price - askings[0][1], 1) if evt_type != "首次挂牌" else 0,
        })

    # Generate historical reference points for scatter chart
    hist_points = []
    base_price = txn["unit_price"]
    for i in range(30):
        d = ld - timedelta(days=random.randint(0, 365))
        hist_points.append({
            "date": d.isoformat(),
            "area": round(random.uniform(max(180, txn["saleable_area"] - 200), txn["saleable_area"] + 200), 1),
            "unit_price": int(random.uniform(base_price * 0.82, base_price * 1.18)),
        })

    # Class D: Valuation comparison deep-links
    valuation = class_d.generate_valuation_compare_section(
        estate_name=txn.get("estate_name_tc", "未知屋苑"),
        transaction_price=txn["transaction_price"],
    )

    return {
        "code": 0,
        "data": {
            "transaction": txn,
            "listing_history": history,
            "historical_reference": sorted(hist_points, key=lambda p: p["date"]),
            "valuation_compare": valuation,
        },
    }


# ============================================================================
# 5.4.3 在售房源 (Listings)
# ============================================================================

@app.get("/api/v1/estates/{estate_id}/listings")
def get_estate_listings(estate_id: int = Path(...)):
    estate = class_a.get_estate_by_id(estate_id)
    if not estate:
        raise HTTPException(status_code=404, detail="屋苑不存在")
    result = class_b.crawl_listings(estate_name=estate["name_tc"])
    return {"code": 0, "data": result["data"]["listings"], "meta": {"source": result["source"], "cached": result["cached"]}}


# ============================================================================
# 5.4.4 行情统计 (Market Stats)
# ============================================================================

@app.get("/api/v1/market/daily-report")
def get_daily_report():
    snapshots = class_a.get_market_snapshot()
    return {"code": 0, "data": snapshots}


@app.get("/api/v1/market/trend")
def get_market_trend(type: str = Query("second_hand"), period: str = Query("6m"), district: Optional[str] = Query(None)):
    indices = class_c.get_indices(weeks=26)
    return {"code": 0, "data": {"indices": indices, "type": type, "period": period}}


# ============================================================================
# 5.4.5 税费计算 (Stamp Duty Calculator)
# ============================================================================

@app.post("/api/v1/calculator/stamp-duty")
def calc_stamp_duty(price: float, buyer_type: str = "first_time", property_type: str = "residential"):
    """
    Hong Kong stamp duty calculation.
    buyer_type: first_time / non_first / non_permanent
    """
    # From价印花税 (AVD) — progressive rates for residential
    def calc_avd(p):
        if p <= 300: return p * 0.015
        if p <= 450: return p * 0.03
        if p <= 600: return p * 0.045
        if p <= 750: return p * 0.06
        if p <= 900: return p * 0.075
        if p <= 2000: return p * 0.085
        return p * 0.085

    avd = round(calc_avd(price / 10000) * 10000, 0)  # Convert 万→元

    # BSD (非永居买家) 15%
    bsd = round(price * 0.15, 0) if buyer_type == "non_permanent" else 0

    # NRSD (非首置) 15%
    nrsd = round(price * 0.15, 0) if buyer_type == "non_first" else 0

    total_duty = avd + bsd + nrsd

    return {
        "code": 0,
        "data": {
            "price": price,
            "avd": avd,
            "bsd": bsd,
            "nrsd": nrsd,
            "total_stamp_duty": total_duty,
            "effective_rate": round(total_duty / price * 100, 2),
            "note": "此计算仅供参考，实际印花税以税务局评税为准",
        },
    }


# ============================================================================
# 5.4.6 AI 服务 & D类跳转
# ============================================================================

@app.get("/api/v1/ai/market-insight")
def get_market_insight():
    return {"code": 0, "data": class_c.get_daily_market_insight()}


@app.get("/api/v1/ai/valuation-compare/{txn_id}")
def get_valuation_compare(txn_id: int):
    """AI估值对比: return deep-links to bank valuation sites + contextual guidance."""
    # Find the transaction
    for eid in range(len(class_a.ESTATES)):
        txns = class_a.generate_transactions(eid, count=30)
        for t in txns:
            if t["id"] == txn_id:
                estate = class_a.get_estate_by_id(eid)
                return {"code": 0, "data": class_d.generate_valuation_compare_section(
                    estate_name=estate["name_tc"],
                    transaction_price=t["transaction_price"],
                )}
    raise HTTPException(status_code=404, detail="成交记录不存在")


@app.get("/api/v1/deep-links")
def get_deep_links(category: Optional[str] = Query(None)):
    """Return all Class D deep-links for frontend rendering."""
    links = class_d.get_links(category=category)
    return {
        "code": 0,
        "data": [
            {"id": k, "label": v.label, "url": v.url, "description": v.description}
            for k, v in links.items()
        ],
        "note": "Class D 数据 — 零爬取策略，前端直接跳转到官方站点",
    }


# ============================================================================
# Health check
# ============================================================================

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "data_sources": {
            "class_a": "RVD official data (simulated)",
            "class_b": "Commercial crawl — 中原/美联/28Hse/House730/Spacious/SEEHSE",
            "class_c": "CCL / Midland indices (piggybacked on Class B)",
            "class_d": "土地注册处/银行估价 — 零爬取, 仅前端跳转",
        },
    }
