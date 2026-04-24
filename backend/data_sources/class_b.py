"""
Class B — Commercial Dynamic Data
Source: 中原地产 (Centaline) / 美联物业 (Midland) / 28Hse / House730 / Spacious
Strategy: User-triggered Playwright headless browser → parse → Redis cache (6h TTL)
"""

import random
import time
from datetime import date, timedelta
from typing import Optional

# Simulated in-memory "cache" — in production this is Redis
_cache: dict = {}
_cache_ttl: dict = {}
CACHE_TTL_SECONDS = 6 * 3600  # 6 hours


class CommercialDataSource:
    """
    Simulates Playwright-based crawling of Hong Kong property listing platforms.
    In production:
    1. Launch Playwright headless Chromium
    2. Navigate to target site (e.g., 28hse.com)
    3. Wait for JS render
    4. Extract listing cards via DOM selectors
    5. Clean + structure data
    6. Cache in Redis with 6h TTL
    """

    SOURCES = [
        {"name": "中原地产", "url": "https://hk.centanet.com/findproperty/list/transaction", "robots_ok": True},
        {"name": "美联物业", "url": "https://www.midland.com.hk/transaction", "robots_ok": True},
        {"name": "28Hse", "url": "https://www.28hse.com/tran/", "robots_ok": True},
        {"name": "House730", "url": "https://www.house730.com/buy/", "robots_ok": True},
        {"name": "Spacious", "url": "https://www.spacious.hk/hong-kong/sale", "robots_ok": True},
        {"name": "SEEHSE", "url": "https://seehse.com/transaction", "robots_ok": True},
    ]

    def crawl_listings(self, estate_name: str, district: Optional[str] = None, force_refresh: bool = False):
        """
        Simulate user-triggered crawl for a specific estate.
        Checks cache before crawling.
        """
        cache_key = f"listings:{estate_name}"
        now = time.time()

        # Check cache
        if not force_refresh and cache_key in _cache:
            if now - _cache_ttl.get(cache_key, 0) < CACHE_TTL_SECONDS:
                return {"source": "cache", "data": _cache[cache_key], "cached": True}

        # Simulate crawl delay (Playwright launch + page load + render)
        time.sleep(0.05)  # In real: 2-8 seconds

        # Pick a random source for variety
        source = random.choice(self.SOURCES)

        # Generate realistic listing data
        listing_count = random.randint(3, 12)
        listings = []
        for i in range(listing_count):
            area = round(random.uniform(280, 1200), 1)
            asking = round(area * random.uniform(9000, 22000) / 10000, 1)
            listings.append({
                "id": hash(f"{cache_key}_{i}") % 100000,
                "estate_name": estate_name,
                "block": f"{random.choice('ABCDEFGH')}座",
                "floor": f"{random.randint(1, 45)}楼",
                "unit": f"{random.choice('ABCDEFGH')}室",
                "room_layout": random.choice(["开放式", "1房1厅", "2房2厅", "2房2厅1卫", "3房2厅2卫"]),
                "saleable_area": area,
                "asking_price": asking,
                "unit_price": int(round(asking * 10000 / area, 0)),
                "listing_date": (date.today() - timedelta(days=random.randint(1, 90))).isoformat(),
                "source_platform": source["name"],
                "source_url": source["url"],
                "status": "在售",
            })

        result = {"source": source["name"], "count": len(listings), "listings": sorted(listings, key=lambda l: l["unit_price"])}

        # Store in cache
        _cache[cache_key] = result
        _cache_ttl[cache_key] = now

        return {"source": "crawl", "data": result, "cached": False}

    def crawl_transactions(self, district: Optional[str] = None, area_min: Optional[float] = None,
                           area_max: Optional[float] = None, price_min: Optional[float] = None,
                           price_max: Optional[float] = None, sort: str = "date_desc",
                           page: int = 1, size: int = 20):
        """
        Simulate crawling the latest transaction records from commercial platforms.
        In production, each platform has different selectors — we use a unified extraction layer.
        """
        cache_key = f"txn:{district}:{area_min}:{area_max}:{price_min}:{price_max}:{sort}:{page}"
        now = time.time()

        if cache_key in _cache and now - _cache_ttl.get(cache_key, 0) < CACHE_TTL_SECONDS:
            return {"source": "cache", "data": _cache[cache_key], "cached": True}

        time.sleep(0.05)  # Simulated crawl

        # Import here to avoid circular
        from .class_a import OfficialDataSource
        ods = OfficialDataSource()

        all_txns = []
        for eid in range(len(ods.ESTATES)):
            all_txns.extend(ods.generate_transactions(eid, count=3))

        # Apply filters
        if district:
            estates_in_dist = [e for e in ods.ESTATES if e["district"] == district]
            dist_ids = {i for i, e in enumerate(ods.ESTATES) if e in estates_in_dist}
            all_txns = [t for t in all_txns if t["estate_id"] in dist_ids]
        if area_min:
            all_txns = [t for t in all_txns if t["saleable_area"] >= area_min]
        if area_max:
            all_txns = [t for t in all_txns if t["saleable_area"] <= area_max]
        if price_min:
            all_txns = [t for t in all_txns if t["transaction_price"] >= price_min]
        if price_max:
            all_txns = [t for t in all_txns if t["transaction_price"] <= price_max]

        # Sort
        if sort == "date_desc":
            all_txns.sort(key=lambda t: t["transaction_date"], reverse=True)
        elif sort == "date_asc":
            all_txns.sort(key=lambda t: t["transaction_date"])
        elif sort == "price_desc":
            all_txns.sort(key=lambda t: t["transaction_price"], reverse=True)
        elif sort == "price_asc":
            all_txns.sort(key=lambda t: t["transaction_price"])
        elif sort == "area_desc":
            all_txns.sort(key=lambda t: t["saleable_area"], reverse=True)
        elif sort == "area_asc":
            all_txns.sort(key=lambda t: t["saleable_area"])

        total = len(all_txns)
        start = (page - 1) * size
        page_data = all_txns[start:start + size]

        # Enrich with estate info
        for txn in page_data:
            estate = ods.get_estate_by_id(txn["estate_id"])
            if estate:
                txn["estate_name_tc"] = estate["name_tc"]
                txn["district"] = estate["district"]
                txn["sub_district"] = estate["sub_district"]

        source = random.choice(self.SOURCES)
        result = {"source": source["name"], "items": page_data, "total": total, "page": page, "size": size}

        _cache[cache_key] = result
        _cache_ttl[cache_key] = now

        return {"source": "crawl", "data": result, "cached": False}
