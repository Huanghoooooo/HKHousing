"""
Class D — Legal Barrier Data (ZERO CRAWLING)
Sources: 土地注册处 IRIS, Bank online valuation systems (e.g., BOCHK)
Strategy: Frontend deep-link only — NO backend crawling, NO data storage
Platform acts purely as a navigation intermediary; legal responsibility stays with the user.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class DeepLink:
    label: str
    url: str
    description: str


class DeepLinkSource:
    """
    Generates deep-links to official/regulated sites.
    These are the ONLY interaction pattern for Class D data:
    - Frontend renders a button/link
    - Click opens the official site in the user's browser
    - Platform NEVER touches the data — no crawling, no proxying, no storage
    """

    LINKS = {
        "land_registry": DeepLink(
            label="土地注册处查册",
            url="https://www.landreg.gov.hk/tc/services/services_b_2.htm",
            description="查阅物业成交记录、产权资料及抵押登记",
        ),
        "land_registry_monthly": DeepLink(
            label="土地注册处月报",
            url="https://www.landreg.gov.hk/tc/monthly/monthly.htm",
            description="每月住宅成交统计数字",
        ),
        "bochk_valuation": DeepLink(
            label="中银香港网上估价",
            url="https://www.bochk.com/mortgage/valuation.html",
            description="免费物业在线估价服务",
        ),
        "hsbc_valuation": DeepLink(
            label="汇丰银行网上估价",
            url="https://www.hsbc.com.hk/mortgages/tools/property-valuation/",
            description="汇丰物业估值服务",
        ),
        "hang_seng_valuation": DeepLink(
            label="恒生银行网上估价",
            url="https://www.hangseng.com/personal/mortgage/property-valuation/",
            description="恒生物业估值",
        ),
        "sold_price_vs_valuation": DeepLink(
            label="成交价与估价对比说明",
            url="https://www.landreg.gov.hk/tc/services/services_b_2.htm",
            description="透过土地查册获取官方成交价后，可到各银行网站获取免费估价以作对比",
        ),
    }

    def get_links(self, category: Optional[str] = None):
        """Get all or filtered deep-links."""
        if category:
            return {k: v for k, v in self.LINKS.items() if k.startswith(category)}
        return self.LINKS

    def get_valuation_links(self):
        """Get bank valuation links specifically for the AI valuation comparison flow."""
        return {k: v for k, v in self.LINKS.items() if "valuation" in k}

    def generate_valuation_compare_section(self, estate_name: str, transaction_price: float) -> dict:
        """
        Generate the "AI估值对比" section for the transaction detail page.
        This is what the user sees — we provide context + deep-links, never scraped valuations.
        """
        return {
            "transaction_price": transaction_price,
            "estate_name": estate_name,
            "note": "银行估价仅供参考，请通过以下链接到各银行官网获取实时估价",
            "disclaimer": "本平台不存储、不爬取银行估价数据。以下均为外部链接，点击后将离开本小程序。",
            "valuation_sources": [
                {
                    "name": "中银香港",
                    "link": self.LINKS["bochk_valuation"].url,
                    "typical_difference": "通常与成交价偏差 ±5% 以内",
                },
                {
                    "name": "汇丰银行",
                    "link": self.LINKS["hsbc_valuation"].url,
                    "typical_difference": "通常与成交价偏差 ±5% 以内",
                },
                {
                    "name": "恒生银行",
                    "link": self.LINKS["hang_seng_valuation"].url,
                    "typical_difference": "通常与成交价偏差 ±5% 以内",
                },
            ],
            "official_record": {
                "name": "土地注册处（官方成交记录）",
                "link": self.LINKS["land_registry"].url,
                "note": "官方注册数据，成交后约一个月可供查阅",
            },
        }
