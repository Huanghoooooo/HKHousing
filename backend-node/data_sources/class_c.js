/**
 * Class C — Industry Macro Indices
 * Sources: 中原城市领先指数 (CCL), 美联楼价指数
 * Strategy: Piggybacked on Class B tasks — scraped in parallel, stored in dedicated index tables
 */

const { randFloat, rand, daysAgo } = require("./class_a");

class IndexDataSource {
  /**
   * Generate index time series.
   * In production this queries the price_index PostgreSQL table.
   * Data is scraped alongside Class B tasks — no separate crawl needed.
   */
  getIndices(indexCode = null, weeks = 52) {
    const configs = [
      { name: "中原城市领先指数 (CCL)", code: "CCL", baseYear: 1997, baseValue: 100 },
      { name: "中原城市大型屋苑领先指数", code: "CCL_MASS", baseYear: 1997, baseValue: 100 },
      { name: "美联楼价指数", code: "MIDLAND", baseYear: 1997, baseValue: 100 },
    ].filter(c => !indexCode || c.code === indexCode);

    const results = [];
    for (const cfg of configs) {
      const base = cfg.code === "CCL" ? randFloat(135, 172) :
                   cfg.code === "CCL_MASS" ? randFloat(128, 165) :
                   randFloat(145, 180);

      const points = [];
      for (let w = weeks - 1; w >= 0; w--) {
        const d = new Date();
        d.setDate(d.getDate() - w * 7);
        const noise = randFloat(-2.5, 2.5);
        const weekChange = Math.round(randFloat(-0.8, 0.8) * 100) / 100;
        const value = Math.round(Math.max(80, base + noise + (weeks - w) * randFloat(-0.05, 0.05)) * 100) / 100;
        points.push({
          index_date: d.toISOString().split("T")[0],
          index_value: value,
          change_week: weekChange,
          change_month: Math.round(weekChange * randFloat(1.5, 4.0) * 100) / 100,
          district: null,
        });
      }

      // District-level for CCL
      const districts = [];
      if (cfg.code === "CCL") {
        for (const dist of ["港島", "九龍", "新界東", "新界西"]) {
          const dBase = dist === "港島" ? randFloat(140, 195) :
                        dist === "九龍" ? randFloat(125, 170) :
                        randFloat(110, 155);
          districts.push({
            district: dist,
            latest_value: Math.round(dBase * 100) / 100,
            change_week: Math.round(randFloat(-1.0, 1.0) * 100) / 100,
            change_month: Math.round(randFloat(-2.0, 2.0) * 100) / 100,
          });
        }
      }

      results.push({ index: cfg, time_series: points, district_breakdown: districts });
    }
    return results;
  }

  /**
   * Generate daily market insight text (AI insight banner in prototype).
   * Phase 1: rule-based; Phase 2: LLM-generated.
   */
  getDailyMarketInsight() {
    const cclChange = Math.round(randFloat(-1.2, 1.5) * 100) / 100;
    const txnCount = rand([25, 32, 38, 45, 52, 60, 68, 75, 80]);
    const shuffled = ["港島", "九龍", "新界"].sort(() => Math.random() - 0.5);
    const hotDistricts = shuffled.slice(0, 2);

    let trendText;
    if (cclChange > 0.5) trendText = `CCL 指数本周升 ${Math.abs(cclChange)}%，市场气氛向好`;
    else if (cclChange < -0.5) trendText = `CCL 指数本周跌 ${Math.abs(cclChange)}%，买家议价空间扩大`;
    else trendText = `CCL 指数本周变动 ${cclChange}%，市场走势平稳`;

    const insight = `${trendText}。过去一周全港共录得约 ${txnCount} 宗二手成交，其中 ${hotDistricts.join("、")} 交投较为活跃。建议买家关注 ${hotDistricts.join("、")} 区域的放盘动态。`;

    return {
      date: new Date().toISOString().split("T")[0],
      insight_text: insight,
      ccl_weekly_change: cclChange,
      weekly_txn_count: txnCount,
      hot_districts: hotDistricts,
    };
  }
}

module.exports = { IndexDataSource };
