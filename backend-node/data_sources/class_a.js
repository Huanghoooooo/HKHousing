/**
 * Class A — Official Static Data
 * Source: 差饷物业估价署 (RVD) — Property Market Statistics
 * Strategy: APScheduler monthly download → Pandas parse Excel → PostgreSQL
 *
 * In production this would:
 * 1. Download Excel from rvd.gov.hk/tc/publications/property_market_statistics.html
 * 2. Parse with xlsx/pandas
 * 3. Clean + standardize, then INSERT into PostgreSQL
 */

const ESTATES = [
  { id: 0, name_tc: "太古城", name_sc: "太古城", name_en: "Taikoo Shing", district: "港島", sub_district: "鲗鱼涌", build_year: 1977, total_units: 12698, estate_type: "大型蓝筹屋苑", lat: 22.2860, lng: 114.2190 },
  { id: 1, name_tc: "海怡半島", name_sc: "海怡半岛", name_en: "South Horizons", district: "港島", sub_district: "鸭脷洲", build_year: 1991, total_units: 9812, estate_type: "大型蓝筹屋苑", lat: 22.2440, lng: 114.1510 },
  { id: 2, name_tc: "美孚新邨", name_sc: "美孚新邨", name_en: "Mei Foo Sun Chuen", district: "九龍", sub_district: "美孚", build_year: 1968, total_units: 13149, estate_type: "大型蓝筹屋苑", lat: 22.3380, lng: 114.1390 },
  { id: 3, name_tc: "黃埔花園", name_sc: "黄埔花园", name_en: "Whampoa Garden", district: "九龍", sub_district: "红磡", build_year: 1985, total_units: 10431, estate_type: "大型蓝筹屋苑", lat: 22.3050, lng: 114.1900 },
  { id: 4, name_tc: "沙田第一城", name_sc: "沙田第一城", name_en: "City One Shatin", district: "新界", sub_district: "沙田", build_year: 1981, total_units: 10642, estate_type: "大型蓝筹屋苑", lat: 22.3870, lng: 114.1990 },
  { id: 5, name_tc: "嘉湖山莊", name_sc: "嘉湖山庄", name_en: "Kingswood Villas", district: "新界", sub_district: "天水围", build_year: 1991, total_units: 15880, estate_type: "大型蓝筹屋苑", lat: 22.4600, lng: 114.0020 },
  { id: 6, name_tc: "日出康城", name_sc: "日出康城", name_en: "LOHAS Park", district: "新界", sub_district: "将军澳", build_year: 2008, total_units: 25500, estate_type: "大型蓝筹屋苑", lat: 22.2930, lng: 114.2700 },
  { id: 7, name_tc: "匯璽", name_sc: "汇玺", name_en: "Cullinan West", district: "九龍", sub_district: "南昌", build_year: 2018, total_units: 3411, estate_type: "大型蓝筹屋苑", lat: 22.3250, lng: 114.1550 },
  { id: 8, name_tc: "寶翠園", name_sc: "宝翠园", name_en: "The Belcher's", district: "港島", sub_district: "坚尼地城", build_year: 2001, total_units: 2213, estate_type: "大型蓝筹屋苑", lat: 22.2830, lng: 114.1320 },
  { id: 9, name_tc: "名城", name_sc: "名城", name_en: "Festival City", district: "新界", sub_district: "大围", build_year: 2011, total_units: 4264, estate_type: "大型蓝筹屋苑", lat: 22.3720, lng: 114.1780 },
  { id: 10, name_tc: "杏花邨", name_sc: "杏花邨", name_en: "Heng Fa Chuen", district: "港島", sub_district: "柴湾", build_year: 1986, total_units: 6504, estate_type: "大型蓝筹屋苑", lat: 22.2750, lng: 114.2410 },
  { id: 11, name_tc: "奧海城", name_sc: "奥海城", name_en: "Olympian City", district: "九龍", sub_district: "大角嘴", build_year: 2000, total_units: 2914, estate_type: "大型蓝筹屋苑", lat: 22.3190, lng: 114.1620 },
  { id: 12, name_tc: "御龍山", name_sc: "御龙山", name_en: "The Palazzo", district: "新界", sub_district: "火炭", build_year: 2008, total_units: 1375, estate_type: "大型蓝筹屋苑", lat: 22.3970, lng: 114.1930 },
  { id: 13, name_tc: "擎天半島", name_sc: "擎天半岛", name_en: "Sorrento", district: "九龍", sub_district: "尖沙咀", build_year: 2003, total_units: 2126, estate_type: "大型蓝筹屋苑", lat: 22.3050, lng: 114.1630 },
  { id: 14, name_tc: "藍灣半島", name_sc: "蓝湾半岛", name_en: "Island Resort", district: "港島", sub_district: "小西湾", build_year: 2001, total_units: 3098, estate_type: "大型蓝筹屋苑", lat: 22.2620, lng: 114.2520 },
];

const LAYOUTS = [
  { room_layout: "开放式", saleable_area_range: [180, 350] },
  { room_layout: "1房1厅", saleable_area_range: [280, 500] },
  { room_layout: "2房2厅", saleable_area_range: [400, 750] },
  { room_layout: "2房2厅1卫", saleable_area_range: [450, 850] },
  { room_layout: "3房2厅2卫", saleable_area_range: [650, 1200] },
  { room_layout: "4房2厅3卫", saleable_area_range: [1000, 2500] },
];

const BLOCKS = ["A座", "B座", "C座", "D座", "E座", "F座", "G座", "H座"];
const UNITS = ["A室", "B室", "C室", "D室", "E室", "F室", "G室", "H室"];
const ORIENTATIONS = ["东南", "西南", "东北", "西北", "正南", "正东"];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randFloat(min, max) { return Math.round((min + Math.random() * (max - min)) * 10) / 10; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; }

class OfficialDataSource {
  searchEstates(keyword, page = 1, size = 20) {
    let results = ESTATES;
    if (keyword) {
      const kw = keyword.toLowerCase();
      results = ESTATES.filter(e =>
        e.name_tc.toLowerCase().includes(kw) ||
        e.name_sc.toLowerCase().includes(kw) ||
        e.name_en.toLowerCase().includes(kw)
      );
    }
    const total = results.length;
    const start = (page - 1) * size;
    return { items: results.slice(start, start + size), total, page, size };
  }

  getEstateById(id) {
    return ESTATES.find(e => e.id === id) || null;
  }

  getMarketSnapshot(district = null) {
    const today = new Date().toISOString().split("T")[0];
    const districts = district ? [district] : ["港島", "九龍", "新界"];
    return districts.map(d => {
      const estatesInDist = ESTATES.filter(e => e.district === d);
      return {
        snapshot_date: today,
        district: d,
        txn_count: randInt(45, 200),
        avg_price: Math.round(randFloat(500, 1200) * 10) / 10,
        avg_unit_price: randInt(11000, 19500),
        listing_count: randInt(300, 2500),
        price_up_count: randInt(5, 50),
        price_down_count: randInt(10, 80),
        period_type: "daily",
      };
    });
  }

  generateTransactions(estateId, count = 30) {
    const estate = this.getEstateById(estateId);
    if (!estate) return [];

    const transactions = [];
    for (let i = 0; i < count; i++) {
      const layout = rand(LAYOUTS);
      const area = randFloat(layout.saleable_area_range[0], layout.saleable_area_range[1]);
      const ageFactor = Math.max(0.6, 1.0 - (2026 - estate.build_year) * 0.003);
      const baseUnitPrice = randFloat(8000, 22000) * ageFactor;
      const unitPrice = Math.round(baseUnitPrice);
      const totalPrice = Math.round(area * unitPrice / 100) / 10;  // 万HKD
      const txnDate = daysAgo(randInt(1, 180));

      transactions.push({
        id: estateId * 1000 + i,
        estate_id: estateId,
        block: rand(BLOCKS),
        floor: `${randInt(1, 58)}楼`,
        unit: rand(UNITS),
        room_layout: layout.room_layout,
        saleable_area: area,
        property_usage: Math.random() > 0.1 ? "私人住宅" : "居屋",
        orientation: rand(ORIENTATIONS),
        transaction_price: totalPrice,
        unit_price: unitPrice,
        transaction_date: txnDate,
        registration_date: daysAgo(-randInt(20, 60)),
        last_asking_price: Math.round(totalPrice * randFloat(1.02, 1.15) * 10) / 10,
        negotiation_rate: Math.round((Math.random() * 6.5 + 1.5) * 10) / 10,
        listing_duration: randInt(7, 180),
        data_source: "RVD/土地注册处",
        source_category: "A",
      });
    }
    return transactions.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  }
}

module.exports = { OfficialDataSource, ESTATES, LAYOUTS, BLOCKS, UNITS, ORIENTATIONS, rand, randFloat, randInt, daysAgo };
