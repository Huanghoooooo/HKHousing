/**
 * Class B — Commercial Dynamic Data
 * Sources: 中原地产 (Centaline) / 美联物业 (Midland) / 28Hse / House730 / Spacious
 * Strategy: User-triggered Playwright headless browser → parse → Redis cache (6h TTL)
 */

const { rand, randInt, randFloat, daysAgo, ESTATES } = require("./class_a");

const SOURCES = [
  { name: "中原地产 (Centaline)", url: "https://hk.centanet.com/findproperty/list/transaction" },
  { name: "美联物业 (Midland)", url: "https://www.midland.com.hk/transaction" },
  { name: "28Hse 香港屋网", url: "https://www.28hse.com/tran/" },
  { name: "House730", url: "https://www.house730.com/buy/" },
  { name: "Spacious 千居", url: "https://www.spacious.hk/hong-kong/sale" },
  { name: "SEEHSE 搵楼街", url: "https://seehse.com/transaction" },
];

// Simulated cache — in production this is Redis
const cache = {};
const cacheTtl = {};
const CACHE_TTL_MS = 6 * 3600 * 1000; // 6 hours

class CommercialDataSource {
  crawlListings(estateName, forceRefresh = false) {
    const cacheKey = `listings:${estateName}`;
    const now = Date.now();

    if (!forceRefresh && cache[cacheKey] && (now - (cacheTtl[cacheKey] || 0)) < CACHE_TTL_MS) {
      return { source: "cache", data: cache[cacheKey], cached: true };
    }

    // Simulate crawl delay (Playwright launch + page load + render = ~2-8s in production)
    const startTime = Date.now();
    while (Date.now() - startTime < 50) { /* spin */ }

    const source = rand(SOURCES);
    const listingCount = randInt(3, 12);
    const listings = [];
    for (let i = 0; i < listingCount; i++) {
      const area = randFloat(280, 1200);
      const asking = Math.round(area * randFloat(9000, 22000) / 100) / 10;
      listings.push({
        id: Math.abs(hashCode(`${cacheKey}_${i}`)) % 100000,
        estate_name: estateName,
        block: rand(["A座", "B座", "C座", "D座", "E座", "F座"]),
        floor: `${randInt(1, 45)}楼`,
        unit: rand(["A室", "B室", "C室", "D室", "E室"]),
        room_layout: rand(["开放式", "1房1厅", "2房2厅", "2房2厅1卫", "3房2厅2卫"]),
        saleable_area: area,
        asking_price: asking,
        unit_price: Math.round(asking * 10000 / area),
        listing_date: daysAgo(randInt(1, 90)),
        source_platform: source.name,
        source_url: source.url,
        status: "在售",
      });
    }

    const result = { source: source.name, count: listings.length, listings: listings.sort((a, b) => a.unit_price - b.unit_price) };
    cache[cacheKey] = result;
    cacheTtl[cacheKey] = now;

    return { source: "crawl", data: result, cached: false };
  }

  crawlTransactions({ district, areaMin, areaMax, priceMin, priceMax, sort = "date_desc", page = 1, size = 20 } = {}) {
    const cacheKey = `txn:${district}:${areaMin}:${areaMax}:${priceMin}:${priceMax}:${sort}:${page}`;
    const now = Date.now();

    if (cache[cacheKey] && (now - (cacheTtl[cacheKey] || 0)) < CACHE_TTL_MS) {
      return { source: "cache", data: cache[cacheKey], cached: true };
    }

    // Generate all transactions across all estates
    const { OfficialDataSource } = require("./class_a");
    const ods = new OfficialDataSource();
    let allTxns = [];
    ESTATES.forEach((estate, idx) => {
      const txns = ods.generateTransactions(idx, 3);
      txns.forEach(t => {
        t.estate_name_tc = estate.name_tc;
        t.district = estate.district;
        t.sub_district = estate.sub_district;
      });
      allTxns = allTxns.concat(txns);
    });

    // Filters
    if (district) allTxns = allTxns.filter(t => t.district === district);
    if (areaMin) allTxns = allTxns.filter(t => t.saleable_area >= areaMin);
    if (areaMax) allTxns = allTxns.filter(t => t.saleable_area <= areaMax);
    if (priceMin) allTxns = allTxns.filter(t => t.transaction_price >= priceMin);
    if (priceMax) allTxns = allTxns.filter(t => t.transaction_price <= priceMax);

    // Sort
    const sortFns = {
      date_desc: (a, b) => b.transaction_date.localeCompare(a.transaction_date),
      date_asc: (a, b) => a.transaction_date.localeCompare(b.transaction_date),
      price_desc: (a, b) => b.transaction_price - a.transaction_price,
      price_asc: (a, b) => a.transaction_price - b.transaction_price,
    };
    allTxns.sort(sortFns[sort] || sortFns.date_desc);

    const total = allTxns.length;
    const start = (page - 1) * size;
    const source = rand(SOURCES);
    const result = { source: source.name, items: allTxns.slice(start, start + size), total, page, size };

    cache[cacheKey] = result;
    cacheTtl[cacheKey] = now;

    return { source: "crawl", data: result, cached: false };
  }
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
}

module.exports = { CommercialDataSource };
