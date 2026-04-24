/**
 * Class D — Legal Barrier Data (ZERO CRAWLING)
 * Sources: 土地注册处 IRIS, Bank online valuation systems (e.g., BOCHK)
 * Strategy: Frontend deep-link only — NO backend crawling, NO data storage
 *
 * Platform acts purely as a navigation intermediary.
 * Legal responsibility stays with the user.
 */

const LINKS = {
  land_registry: {
    label: "土地注册处查册",
    url: "https://www.landreg.gov.hk/tc/services/services_b_2.htm",
    description: "查阅物业成交记录、产权资料及抵押登记",
  },
  land_registry_monthly: {
    label: "土地注册处月报",
    url: "https://www.landreg.gov.hk/tc/monthly/monthly.htm",
    description: "每月住宅成交统计数字",
  },
  bochk_valuation: {
    label: "中银香港网上估价",
    url: "https://www.bochk.com/mortgage/valuation.html",
    description: "免费物业在线估价服务",
  },
  hsbc_valuation: {
    label: "汇丰银行网上估价",
    url: "https://www.hsbc.com.hk/mortgages/tools/property-valuation/",
    description: "汇丰物业估值服务",
  },
  hang_seng_valuation: {
    label: "恒生银行网上估价",
    url: "https://www.hangseng.com/personal/mortgage/property-valuation/",
    description: "恒生物业估值",
  },
};

class DeepLinkSource {
  getLinks(category = null) {
    if (category) {
      return Object.fromEntries(
        Object.entries(LINKS).filter(([k]) => k.startsWith(category))
      );
    }
    return LINKS;
  }

  getValuationLinks() {
    return Object.fromEntries(
      Object.entries(LINKS).filter(([k]) => k.includes("valuation"))
    );
  }

  /**
   * Generate the "AI估值对比" section for transaction detail page.
   * We provide context + deep-links, never scraped valuations.
   */
  generateValuationCompareSection(estateName, transactionPrice) {
    return {
      transaction_price: transactionPrice,
      estate_name: estateName,
      note: "银行估价仅供参考，请通过以下链接到各银行官网获取实时估价",
      disclaimer: "本平台不存储、不爬取银行估价数据。以下均为外部链接，点击后将离开本小程序。",
      valuation_sources: [
        { name: "中银香港", link: LINKS.bochk_valuation.url, typical_difference: "通常与成交价偏差 ±5% 以内" },
        { name: "汇丰银行", link: LINKS.hsbc_valuation.url, typical_difference: "通常与成交价偏差 ±5% 以内" },
        { name: "恒生银行", link: LINKS.hang_seng_valuation.url, typical_difference: "通常与成交价偏差 ±5% 以内" },
      ],
      official_record: {
        name: "土地注册处（官方成交记录）",
        link: LINKS.land_registry.url,
        note: "官方注册数据，成交后约一个月可供查阅",
      },
    };
  }
}

module.exports = { DeepLinkSource, LINKS };
