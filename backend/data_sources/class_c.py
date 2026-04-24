"""
Class C — Industry Macro Indices
Sources: 中原城市领先指数 (CCL), 美联楼价指数
Strategy: Piggybacked on Class B tasks — scraped in parallel, stored in dedicated index tables
"""

import random
from datetime import date, timedelta
from typing import Optional


class IndexDataSource:
    """
    Simulates CCL and Midland index data collection.
    In production, these are scraped alongside Class B tasks:
    - CCL: extracted from Centaline's index page during regular crawls
    - Midland index: extracted from Midland's research section
    """

    INDEX_CONFIGS = [
        {"name": "中原城市领先指数 (CCL)", "code": "CCL", "base_year": 1997, "base_value": 100},
        {"name": "中原城市大型屋苑领先指数", "code": "CCL_MASS", "base_year": 1997, "base_value": 100},
        {"name": "美联楼价指数", "code": "MIDLAND", "base_year": 1997, "base_value": 100},
    ]

    def get_indices(self, index_code: Optional[str] = None, weeks: int = 52):
        """
        Generate index time series. In production, this queries the price_index table.
        Piggyback strategy: index data is scraped in parallel with Class B tasks
        and stored in the same PostgreSQL — no separate crawl required.
        """
        results = []
        configs = [c for c in self.INDEX_CONFIGS if not index_code or c["code"] == index_code]

        for cfg in configs:
            # Simulate realistic CCL-style weekly values
            base = random.uniform(135, 172) if cfg["code"] == "CCL" else random.uniform(128, 165) if cfg["code"] == "CCL_MASS" else random.uniform(145, 180)
            points = []
            for w in range(weeks - 1, -1, -1):
                d = date.today() - timedelta(weeks=w)
                # add noise to create realistic zigzag
                noise = random.uniform(-2.5, 2.5)
                week_change = round(random.uniform(-0.8, 0.8), 2)
                value = round(base + noise + (weeks - w) * random.uniform(-0.05, 0.05), 2)
                points.append({
                    "index_date": d.isoformat(),
                    "index_value": max(80, value),
                    "change_week": week_change,
                    "change_month": round(week_change * random.uniform(1.5, 4.0), 2),
                    "district": None,  # All-HK level
                })

            # District-level for CCL
            districts = []
            if cfg["code"] == "CCL":
                for dist in ["港島", "九龍", "新界東", "新界西"]:
                    d_base = random.uniform(140, 195) if dist == "港島" else random.uniform(125, 170) if dist == "九龍" else random.uniform(110, 155)
                    districts.append({
                        "district": dist,
                        "latest_value": round(d_base, 2),
                        "change_week": round(random.uniform(-1.0, 1.0), 2),
                        "change_month": round(random.uniform(-2.0, 2.0), 2),
                    })

            results.append({"index": cfg, "time_series": points, "district_breakdown": districts})

        return results

    def get_daily_market_insight(self) -> dict:
        """
        Generate a natural-language market insight (like the AI insight banner in the prototype).
        In Phase 1, this uses rule-based text generation; in Phase 2 it uses LLM.
        """
        ccl_change = round(random.uniform(-1.2, 1.5), 2)
        txn_count = random.randint(25, 80)
        hot_districts = random.sample(["港島", "九龍", "新界"], 2)

        if ccl_change > 0.5:
            trend_text = f"CCL 指数本周升 {abs(ccl_change)}%，市场气氛向好"
        elif ccl_change < -0.5:
            trend_text = f"CCL 指数本周跌 {abs(ccl_change)}%，买家议价空间扩大"
        else:
            trend_text = f"CCL 指数本周变动 {ccl_change}%，市场走势平稳"

        insight = (
            f"{trend_text}。过去一周全港共录得约 {txn_count} 宗二手成交，"
            f"其中 {'、'.join(hot_districts)} 交投较为活跃。"
            f"建议买家关注 {'、'.join(hot_districts)} 区域的放盘动态。"
        )
        return {
            "date": date.today().isoformat(),
            "insight_text": insight,
            "ccl_weekly_change": ccl_change,
            "weekly_txn_count": txn_count,
            "hot_districts": hot_districts,
        }
