"""
Class A — Official Static Data
Source: 差饷物业估价署 (RVD) — Property Market Statistics
Strategy: APScheduler monthly download → Pandas parse Excel → PostgreSQL
"""

import random
from datetime import date, timedelta
from typing import Optional


class OfficialDataSource:
    """
    Simulates RVD data ingestion. In production, this would:
    1. Download Excel from rvd.gov.hk/tc/publications/property_market_statistics.html
    2. Parse with Pandas (read_excel)
    3. Clean + standardize, then INSERT into PostgreSQL
    """

    BASE_URL = "https://www.rvd.gov.hk/tc/publications/property_market_statistics.html"

    # Realistic sample: Hong Kong estate reference data
    ESTATES = [
        {"name_tc": "太古城", "name_sc": "太古城", "name_en": "Taikoo Shing", "district": "港島", "sub_district": "鲗鱼涌", "build_year": 1977, "total_units": 12698, "estate_type": "大型蓝筹屋苑", "lat": 22.2860, "lng": 114.2190},
        {"name_tc": "海怡半島", "name_sc": "海怡半岛", "name_en": "South Horizons", "district": "港島", "sub_district": "鸭脷洲", "build_year": 1991, "total_units": 9812, "estate_type": "大型蓝筹屋苑", "lat": 22.2440, "lng": 114.1510},
        {"name_tc": "美孚新邨", "name_sc": "美孚新邨", "name_en": "Mei Foo Sun Chuen", "district": "九龍", "sub_district": "美孚", "build_year": 1968, "total_units": 13149, "estate_type": "大型蓝筹屋苑", "lat": 22.3380, "lng": 114.1390},
        {"name_tc": "黃埔花園", "name_sc": "黄埔花园", "name_en": "Whampoa Garden", "district": "九龍", "sub_district": "红磡", "build_year": 1985, "total_units": 10431, "estate_type": "大型蓝筹屋苑", "lat": 22.3050, "lng": 114.1900},
        {"name_tc": "沙田第一城", "name_sc": "沙田第一城", "name_en": "City One Shatin", "district": "新界", "sub_district": "沙田", "build_year": 1981, "total_units": 10642, "estate_type": "大型蓝筹屋苑", "lat": 22.3870, "lng": 114.1990},
        {"name_tc": "嘉湖山莊", "name_sc": "嘉湖山庄", "name_en": "Kingswood Villas", "district": "新界", "sub_district": "天水围", "build_year": 1991, "total_units": 15880, "estate_type": "大型蓝筹屋苑", "lat": 22.4600, "lng": 114.0020},
        {"name_tc": "日出康城", "name_sc": "日出康城", "name_en": "LOHAS Park", "district": "新界", "sub_district": "将军澳", "build_year": 2008, "total_units": 25500, "estate_type": "大型蓝筹屋苑", "lat": 22.2930, "lng": 114.2700},
        {"name_tc": "匯璽", "name_sc": "汇玺", "name_en": "Cullinan West", "district": "九龍", "sub_district": "南昌", "build_year": 2018, "total_units": 3411, "estate_type": "大型蓝筹屋苑", "lat": 22.3250, "lng": 114.1550},
        {"name_tc": "寶翠園", "name_sc": "宝翠园", "name_en": "The Belcher's", "district": "港島", "sub_district": "坚尼地城", "build_year": 2001, "total_units": 2213, "estate_type": "大型蓝筹屋苑", "lat": 22.2830, "lng": 114.1320},
        {"name_tc": "名城", "name_sc": "名城", "name_en": "Festival City", "district": "新界", "sub_district": "大围", "build_year": 2011, "total_units": 4264, "estate_type": "大型蓝筹屋苑", "lat": 22.3720, "lng": 114.1780},
        {"name_tc": "杏花邨", "name_sc": "杏花邨", "name_en": "Heng Fa Chuen", "district": "港島", "sub_district": "柴湾", "build_year": 1986, "total_units": 6504, "estate_type": "大型蓝筹屋苑", "lat": 22.2750, "lng": 114.2410},
        {"name_tc": "奧海城", "name_sc": "奥海城", "name_en": "Olympian City", "district": "九龍", "sub_district": "大角嘴", "build_year": 2000, "total_units": 2914, "estate_type": "大型蓝筹屋苑", "lat": 22.3190, "lng": 114.1620},
        {"name_tc": "御龍山", "name_sc": "御龙山", "name_en": "The Palazzo", "district": "新界", "sub_district": "火炭", "build_year": 2008, "total_units": 1375, "estate_type": "大型蓝筹屋苑", "lat": 22.3970, "lng": 114.1930},
        {"name_tc": "擎天半島", "name_sc": "擎天半岛", "name_en": "Sorrento", "district": "九龍", "sub_district": "尖沙咀", "build_year": 2003, "total_units": 2126, "estate_type": "大型蓝筹屋苑", "lat": 22.3050, "lng": 114.1630},
        {"name_tc": "藍灣半島", "name_sc": "蓝湾半岛", "name_en": "Island Resort", "district": "港島", "sub_district": "小西湾", "build_year": 2001, "total_units": 3098, "estate_type": "大型蓝筹屋苑", "lat": 22.2620, "lng": 114.2520},
    ]

    LAYOUTS = [
        {"room_layout": "开放式", "saleable_area_range": (180, 350)},
        {"room_layout": "1房1厅", "saleable_area_range": (280, 500)},
        {"room_layout": "2房2厅", "saleable_area_range": (400, 750)},
        {"room_layout": "2房2厅1卫", "saleable_area_range": (450, 850)},
        {"room_layout": "3房2厅2卫", "saleable_area_range": (650, 1200)},
        {"room_layout": "4房2厅3卫", "saleable_area_range": (1000, 2500)},
    ]

    def get_estates(self, keyword: Optional[str] = None, page: int = 1, size: int = 20):
        """Search estates by name (supports TC/SC/EN fuzzy match)."""
        results = self.ESTATES
        if keyword:
            kw = keyword.lower()
            results = [
                e for e in self.ESTATES
                if kw in e["name_tc"].lower()
                or kw in e["name_sc"].lower()
                or kw in e["name_en"].lower()
            ]
        total = len(results)
        start = (page - 1) * size
        return {"items": results[start:start + size], "total": total, "page": page, "size": size}

    def get_estate_by_id(self, estate_id: int):
        """Get single estate detail."""
        if 0 <= estate_id < len(self.ESTATES):
            return self.ESTATES[estate_id]
        return None

    def generate_transactions(self, estate_id: int, count: int = 30):
        """Generate realistic transaction records for an estate (Class A seed data)."""
        estate = self.get_estate_by_id(estate_id)
        if not estate:
            return []

        transactions = []
        base_date = date.today() - timedelta(days=180)
        for i in range(count):
            layout = random.choice(self.LAYOUTS)
            area = round(random.uniform(*layout["saleable_area_range"]), 1)
            # Price range: older cheaper, newer pricier, plus random
            age_factor = max(0.6, 1.0 - (2026 - estate["build_year"]) * 0.003)
            base_unit_price = random.uniform(8000, 22000) * age_factor
            unit_price = round(base_unit_price, 0)
            total_price = round(area * unit_price / 10000, 1)  # in 万HKD
            txn_date = base_date + timedelta(days=random.randint(0, 179))

            block_names = ["A", "B", "C", "D", "E", "F"]
            transactions.append({
                "id": estate_id * 1000 + i,
                "estate_id": estate_id,
                "block": f"{random.choice(block_names)}座",
                "floor": f"{random.randint(1, 58)}楼",
                "unit": f"{random.choice('ABCDEFGH')}室",
                "room_layout": layout["room_layout"],
                "saleable_area": area,
                "property_usage": random.choice(["私人住宅"] * 8 + ["居屋"]),
                "orientation": random.choice(["东南", "西南", "东北", "西北", "正南", "正东"]),
                "transaction_price": total_price,
                "unit_price": int(unit_price),
                "transaction_date": txn_date.isoformat(),
                "registration_date": (txn_date + timedelta(days=random.randint(20, 60))).isoformat(),
                "last_asking_price": round(total_price * random.uniform(1.02, 1.15), 1),
                "negotiation_rate": round(random.uniform(1.5, 8.0), 1),
                "listing_duration": random.randint(7, 180),
                "data_source": "RVD/土地注册处",
                "source_category": "A",
            })
        return sorted(transactions, key=lambda t: t["transaction_date"], reverse=True)

    def get_market_snapshot(self, district: Optional[str] = None):
        """Generate a market snapshot from official data."""
        today = date.today()
        snapshots = []
        districts = ["港島", "九龍", "新界"] if not district else [district]

        for d in districts:
            estates_in_dist = [e for e in self.ESTATES if e["district"] == d]
            txn_count = random.randint(45, 200)
            avg_price = round(random.uniform(11000, 19500), 0)
            snapshots.append({
                "snapshot_date": today.isoformat(),
                "district": d,
                "txn_count": txn_count,
                "avg_price": round(random.uniform(500, 1200), 1),
                "avg_unit_price": int(avg_price),
                "listing_count": random.randint(300, 2500),
                "price_up_count": random.randint(5, 50),
                "price_down_count": random.randint(10, 80),
            })
        return snapshots
