// ============================================================================
// 香港房产数据查询平台 — Frontend App
// ============================================================================

const API = "/api/v1";
const stack = [];          // Navigation stack (page+state pairs)
let currentPage = "home";
let currentTab = "home";

// ============================================================================
// Navigation (WeChat Mini Program style push/pop)
// ============================================================================

function navigateTo(page, state = {}) {
  stack.push({ page: currentPage, state: pageState(currentPage) });
  renderPage(page, state);
  updateNavBar(page);
  document.getElementById("navBack").style.visibility = page === "home" ? "hidden" : "visible";
}

function goBack() {
  if (stack.length === 0) return;
  const prev = stack.pop();
  renderPage(prev.page, prev.state);
  updateNavBar(prev.page);
  document.getElementById("navBack").style.visibility = prev.page === "home" || stack.length === 0 ? "hidden" : "visible";
}

function pageState(page) {
  switch (page) {
    case "transactions":
      return {
        district: document.querySelector("#filterDistrict.option-selected")?.dataset?.value || null,
        sort: document.querySelector(".sort-chip.option-selected")?.dataset?.value || "date_desc",
      };
    default: return {};
  }
}

function renderPage(page, state = {}) {
  currentPage = page;
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const el = document.getElementById("page-" + page);
  if (el) el.classList.add("active");

  switch (page) {
    case "home": renderHome(); break;
    case "transactions": loadTransactions(state); break;
    case "search": initSearch(); break;
    case "market": loadMarketStats(); break;
    case "stamp-duty": break;
  }
}

function updateNavBar(page) {
  const titles = {
    home: "香港房产数据", transactions: "全港成交", detail: "成交详情",
    search: "屋苑搜索", market: "行情统计", "stamp-duty": "税费计算",
  };
  document.getElementById("navTitle").textContent = titles[page] || "";
}

// ============================================================================
// Tab Bar
// ============================================================================

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab-item").forEach(t => t.classList.remove("active"));
  document.querySelector(`.tab-item[data-tab="${tab}"]`).classList.add("active");

  stack.length = 0;
  navigateTo(tab);
  document.getElementById("navBack").style.visibility = "hidden";
}

// ============================================================================
// Home Page
// ============================================================================

async function renderHome() {
  try {
    const r = await fetch(API + "/ai/market-insight");
    const d = await r.json();
    if (d.code === 0) {
      document.getElementById("insightText").textContent = d.data.insight_text;
    }
  } catch (e) {
    document.getElementById("insightText").textContent = "无法加载市场洞察";
  }
}

// ============================================================================
// Transactions Page (Core Feature — 全港成交)
// ============================================================================

let txnFilters = { district: null, areaMin: null, areaMax: null, priceMin: null, priceMax: null, sort: "date_desc" };

async function loadTransactions(state = {}) {
  if (state.district) txnFilters.district = state.district;
  if (state.sort) txnFilters.sort = state.sort;

  // Reset chips
  resetFilterChips();

  const list = document.getElementById("txnList");
  list.innerHTML = '<div class="loading">⏳ 正在获取最新成交数据...</div>';

  const params = new URLSearchParams();
  if (txnFilters.district) params.set("district", txnFilters.district);
  if (txnFilters.areaMin) params.set("area_min", txnFilters.areaMin);
  if (txnFilters.areaMax) params.set("area_max", txnFilters.areaMax);
  if (txnFilters.priceMin) params.set("price_min", txnFilters.priceMin);
  if (txnFilters.priceMax) params.set("price_max", txnFilters.priceMax);
  params.set("sort", txnFilters.sort);
  params.set("size", "30");

  try {
    const start = Date.now();
    const r = await fetch(API + "/transactions?" + params);
    const d = await r.json();
    const elapsed = Date.now() - start;

    if (d.code !== 0) { list.innerHTML = '<div class="loading">加载失败</div>'; return; }

    // Data source badge
    const badge = document.getElementById("dsBadge");
    if (d.meta) {
      const cacheLabel = d.meta.cached ? "缓存命中" : "实时爬取";
      const sourceLabel = d.meta.source || "综合";
      badge.style.display = "block";
      badge.innerHTML = `📡 数据来源: ${sourceLabel} (${cacheLabel}, ${d.meta.elapsed_ms || elapsed}ms) | B类数据 — Redis TTL=6h`;
    }

    // Render cards
    if (!d.data || !d.data.items || d.data.items.length === 0) {
      list.innerHTML = '<div class="loading">暂无成交数据</div>';
      return;
    }

    list.innerHTML = d.data.items.map(txn => `
      <div class="txn-card" onclick="viewTxnDetail(${txn.id})">
        <div class="txn-card-header">
          <div>
            <div class="txn-estate">${txn.estate_name_tc || "未知屋苑"}</div>
            <div class="txn-district">${txn.district || ""} · ${txn.sub_district || ""}</div>
          </div>
          <div class="txn-date">${txn.transaction_date}</div>
        </div>
        <div class="txn-price-row">
          <span class="txn-price"><label>万</label> ${txn.transaction_price}</span>
          <span class="txn-unit-price">${txn.unit_price.toLocaleString()} HKD/呎</span>
        </div>
        <div class="txn-meta">
          <span>${txn.room_layout}</span>
          <span>${txn.saleable_area} 呎</span>
          <span>${txn.orientation || ""}</span>
          ${txn.negotiation_rate > 0 ? `<span class="txn-change-down">议价 ${txn.negotiation_rate}%</span>` : ""}
          <span>📌 ${txn.block || ""}</span>
        </div>
      </div>
    `).join("");

    list.scrollTop = 0;
  } catch (e) {
    list.innerHTML = '<div class="loading">网络错误，请重试</div>';
  }
}

// ============================================================================
// Transaction Detail Page (成交详情 — includes AI估值对比)
// ============================================================================

async function viewTxnDetail(txnId) {
  const page = document.getElementById("page-detail");
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  page.classList.add("active");
  document.getElementById("navBar").querySelector("#navBack").style.visibility = "visible";
  document.getElementById("navTitle").textContent = "成交详情";
  currentPage = "detail";
  stack.push({ page: "transactions", state: pageState("transactions") });

  const content = document.getElementById("detailContent");
  content.innerHTML = '<div class="loading">⏳ 加载中...</div>';

  try {
    const r = await fetch(API + "/transactions/" + txnId);
    const d = await r.json();
    if (d.code !== 0) { content.innerHTML = '<div class="loading">加载失败</div>'; return; }

    const txn = d.data.transaction;
    const hist = d.data.listing_history;
    const refPoints = d.data.historical_reference;
    const valuation = d.data.valuation_compare;

    const priceChange = txn.last_asking_price - txn.transaction_price;
    const changePct = Math.round(priceChange / txn.last_asking_price * 1000) / 10;

    content.innerHTML = `
      <!-- Property Header -->
      <div class="detail-header">
        <div class="detail-estate">${txn.estate_name_tc}</div>
        <div class="detail-addr">${txn.district} · ${txn.sub_district} · ${txn.block} ${txn.floor} ${txn.unit}</div>
        <div class="detail-price-big">${txn.transaction_price} <span>万</span></div>
        <div class="detail-rate ${priceChange > 0 ? 'rate-down' : 'rate-up'}">
          较叫价 ${priceChange > 0 ? '低' : '高'} ${Math.abs(priceChange)} 万 (${Math.abs(changePct)}%)
        </div>
      </div>

      <!-- Property Attributes Grid -->
      <div class="section-card">
        <div class="section-title">物业属性</div>
        <div class="property-grid">
          <div class="property-item">
            <div class="property-label">实用面积</div>
            <div class="property-value">${txn.saleable_area} 呎</div>
          </div>
          <div class="property-item">
            <div class="property-label">成交呎价</div>
            <div class="property-value">${txn.unit_price.toLocaleString()}/呎</div>
          </div>
          <div class="property-item">
            <div class="property-label">间隔</div>
            <div class="property-value">${txn.room_layout}</div>
          </div>
          <div class="property-item">
            <div class="property-label">朝向</div>
            <div class="property-value">${txn.orientation}</div>
          </div>
          <div class="property-item">
            <div class="property-label">物业用途</div>
            <div class="property-value">${txn.property_usage}</div>
          </div>
          <div class="property-item">
            <div class="property-label">成交日期</div>
            <div class="property-value">${txn.transaction_date}</div>
          </div>
        </div>
      </div>

      <!-- AI Valuation Compare (Class D deep-links) -->
      <div class="valuation-card">
        <div class="valuation-title">🔗 AI 估值对比</div>
        <div class="valuation-note">${valuation.note}</div>
        ${valuation.valuation_sources.map(s => `
          <a class="valuation-link" href="${s.link}" target="_blank" rel="noopener">
            🏦 ${s.name} — ${s.typical_difference} →
          </a>
        `).join("")}
        <a class="valuation-link" href="${valuation.official_record.link}" target="_blank" rel="noopener">
          📋 ${valuation.official_record.name} →
        </a>
        <div class="valuation-disclaimer">
          ⚠️ ${valuation.disclaimer}
        </div>
      </div>

      <!-- Listing History Timeline -->
      <div class="section-card">
        <div class="section-title">放盘及交易历程</div>
        <div class="timeline">
          ${hist.map(h => `
            <div class="timeline-item">
              <div class="timeline-type">${h.event_type}</div>
              <div class="timeline-date">${h.event_date}</div>
              <div class="timeline-price">${h.price} 万</div>
              ${h.price_change !== 0 ? `<div class="timeline-change ${h.price_change > 0 ? 'rate-up' : 'rate-down'}">${h.price_change > 0 ? '+' : ''}${h.price_change} 万</div>` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    `;

  } catch (e) {
    content.innerHTML = '<div class="loading">网络错误</div>';
  }
}

// ============================================================================
// Filter Logic
// ============================================================================

function resetFilterChips() {
  const distChip = document.getElementById("filterDistrict");
  if (txnFilters.district) {
    distChip.textContent = txnFilters.district + " ▾";
    distChip.classList.add("active");
  } else {
    distChip.textContent = "区域 ▾";
    distChip.classList.remove("active");
  }

  const sortLabels = { date_desc: "最新", date_asc: "最早", price_desc: "最贵", price_asc: "最便" };
  const sortChip = document.getElementById("filterSort");
  sortChip.textContent = (sortLabels[txnFilters.sort] || "最新") + " ▾";
}

function toggleFilterPanel(type) {
  const panel = document.getElementById("filterPanel");
  const isOpen = panel.style.display !== "none" && panel.dataset.type === type;

  if (isOpen) {
    panel.style.display = "none";
    return;
  }

  panel.dataset.type = type;
  panel.style.display = "block";

  switch (type) {
    case "district":
      panel.innerHTML = `
        <div class="filter-options">
          ${["港島", "九龍", "新界"].map(d => `
            <div class="filter-option ${txnFilters.district === d ? 'selected' : ''}" data-value="${d}" onclick="selectFilter(this, 'district')">${d}</div>
          `).join("")}
          <div class="filter-option ${!txnFilters.district ? 'selected' : ''}" data-value="" onclick="selectFilter(this, 'district')">全部</div>
        </div>
        <button class="filter-apply" onclick="applyFilters()">应用筛选</button>
      `;
      break;
    case "sort":
      panel.innerHTML = `
        <div class="filter-options">
          ${[
            { v: "date_desc", l: "最新成交" },
            { v: "date_asc", l: "最早成交" },
            { v: "price_desc", l: "楼价从高到低" },
            { v: "price_asc", l: "楼价从低到高" },
          ].map(s => `
            <div class="filter-option ${txnFilters.sort === s.v ? 'selected' : ''}" data-value="${s.v}" onclick="selectFilter(this, 'sort')">${s.l}</div>
          `).join("")}
        </div>
        <button class="filter-apply" onclick="applyFilters()">应用排序</button>
      `;
      break;
    case "area":
      panel.innerHTML = `
        <div class="filter-options">
          ${[
            { v: "", l: "不限" },
            { v: "0,400", l: "400呎 以下" },
            { v: "400,600", l: "400-600呎" },
            { v: "600,800", l: "600-800呎" },
            { v: "800,0", l: "800呎 以上" },
          ].map(a => {
            const sel = txnFilters.areaMin === (a.v ? parseFloat(a.v.split(",")[0]) : null);
            return `<div class="filter-option ${sel ? 'selected' : ''}" data-value="${a.v}" onclick="selectFilter(this, 'area')">${a.l}</div>`;
          }).join("")}
        </div>
        <button class="filter-apply" onclick="applyFilters()">应用筛选</button>
      `;
      break;
    case "price":
      panel.innerHTML = `
        <div class="filter-options">
          ${[
            { v: "", l: "不限" },
            { v: "0,500", l: "500万 以下" },
            { v: "500,800", l: "500-800万" },
            { v: "800,1500", l: "800-1500万" },
            { v: "1500,0", l: "1500万 以上" },
          ].map(p => {
            const sel = txnFilters.priceMin === (p.v ? parseFloat(p.v.split(",")[0]) : null);
            return `<div class="filter-option ${sel ? 'selected' : ''}" data-value="${p.v}" onclick="selectFilter(this, 'price')">${p.l}</div>`;
          }).join("")}
        </div>
        <button class="filter-apply" onclick="applyFilters()">应用筛选</button>
      `;
      break;
  }
}

function selectFilter(el, type) {
  el.parentElement.querySelectorAll(".filter-option").forEach(o => o.classList.remove("selected"));
  el.classList.add("selected");

  if (type === "sort") {
    txnFilters.sort = el.dataset.value;
    document.getElementById("filterPanel").style.display = "none";
    applyFilters();
    return;
  }
}

function applyFilters() {
  // Read selected values from open panel
  const panel = document.getElementById("filterPanel");
  const type = panel.dataset.type;

  if (type === "district") {
    const sel = panel.querySelector(".filter-option.selected");
    txnFilters.district = sel ? sel.dataset.value || null : null;
  } else if (type === "area") {
    const sel = panel.querySelector(".filter-option.selected");
    if (sel && sel.dataset.value) {
      const [min, max] = sel.dataset.value.split(",").map(Number);
      txnFilters.areaMin = min || null;
      txnFilters.areaMax = max || null;
    } else {
      txnFilters.areaMin = null;
      txnFilters.areaMax = null;
    }
  } else if (type === "price") {
    const sel = panel.querySelector(".filter-option.selected");
    if (sel && sel.dataset.value) {
      const [min, max] = sel.dataset.value.split(",").map(Number);
      txnFilters.priceMin = min || null;
      txnFilters.priceMax = max || null;
    } else {
      txnFilters.priceMin = null;
      txnFilters.priceMax = null;
    }
  }

  panel.style.display = "none";
  resetFilterChips();
  loadTransactions();
}

// ============================================================================
// Estate Search
// ============================================================================

let searchTimeout;

function initSearch() {
  document.getElementById("searchInput").focus();
}

function handleSearchKey(e) {
  if (e.key === "Enter") {
    const kw = e.target.value.trim();
    if (kw) doSearch(kw);
    return;
  }

  clearTimeout(searchTimeout);
  const kw = e.target.value.trim();
  const clearBtn = document.getElementById("searchClear");
  clearBtn.style.display = kw ? "block" : "none";

  if (kw.length < 1) {
    document.getElementById("searchResults").innerHTML = '<div class="search-hint">输入关键字开始搜索</div>';
    return;
  }
  searchTimeout = setTimeout(() => doSearch(kw), 300);
}

async function doSearch(keyword) {
  const container = document.getElementById("searchResults");
  container.innerHTML = '<div class="loading">搜索中...</div>';

  try {
    const r = await fetch(API + `/estates/search?keyword=${encodeURIComponent(keyword)}`);
    const d = await r.json();
    if (d.code !== 0 || !d.data.items || d.data.items.length === 0) {
      container.innerHTML = '<div class="search-hint">未找到匹配的屋苑</div>';
      return;
    }

    container.innerHTML = d.data.items.map(e => `
      <div class="estate-card" onclick="showEstateDetail(${e.id})">
        <div class="estate-card-name">${e.name_tc} <span style="color:#666;font-size:12px;font-weight:400">${e.name_en}</span></div>
        <div class="estate-card-meta">${e.district} · ${e.sub_district} · ${e.build_year}年建成 · ${e.total_units}户</div>
        <div class="estate-card-stats">
          <div class="estate-card-stat">查看详情 <label>→</label></div>
        </div>
      </div>
    `).join("");
  } catch (e) {
    container.innerHTML = '<div class="loading">搜索失败</div>';
  }
}

function clearSearch() {
  document.getElementById("searchInput").value = "";
  document.getElementById("searchClear").style.display = "none";
  document.getElementById("searchResults").innerHTML = '<div class="search-hint">输入关键字开始搜索</div>';
}

async function showEstateDetail(estateId) {
  navigateTo("search"); // keep search page open, show results inline
  try {
    const r = await fetch(API + "/estates/" + estateId);
    const d = await r.json();
    if (d.code !== 0) return;

    const e = d.data.estate;
    const s = d.data.stats;
    const txns = d.data.recent_transactions;

    document.getElementById("searchResults").innerHTML = `
      <div class="section-card">
        <div class="section-title">${e.name_tc} <span style="color:#666;font-size:12px;font-weight:400">${e.name_en}</span></div>
        <div style="color:#888;font-size:11px;margin-top:4px">${e.district} · ${e.sub_district} · ${e.build_year}年建成 · ${e.total_units}户</div>
        <div style="display:flex;gap:16px;margin-top:10px">
          <div><span style="color:#1989fa;font-weight:700">${s.total_transactions}</span> <span style="color:#666;font-size:11px">宗成交</span></div>
          <div><span style="color:#1989fa;font-weight:700">${s.avg_unit_price.toLocaleString()}</span> <span style="color:#666;font-size:11px">均呎价</span></div>
          <div><span style="color:#1989fa;font-weight:700">${s.recent_30d_count}</span> <span style="color:#666;font-size:11px">近30日</span></div>
        </div>
      </div>
      <div style="color:#222;font-size:15px;font-weight:600;margin:14px 0 8px">最近成交记录</div>
      ${txns.map(t => `
        <div class="txn-card" onclick="viewTxnDetail(${t.id})" style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between">
            <div class="txn-estate">${t.room_layout}</div>
            <div class="txn-price" style="font-size:16px">${t.transaction_price} <label>万</label></div>
          </div>
          <div class="txn-meta" style="margin-top:4px">
            <span>${t.saleable_area}呎</span>
            <span>${t.unit_price.toLocaleString()}/呎</span>
            <span>${t.transaction_date}</span>
          </div>
        </div>
      `).join("")}
    `;
  } catch (e) { }
}

// ============================================================================
// Market Stats
// ============================================================================

async function loadMarketStats() {
  try {
    const [snapR, idxR] = await Promise.all([
      fetch(API + "/market/daily-report"),
      fetch(API + "/market/trend"),
    ]);
    const snap = await snapR.json();
    const idx = await idxR.json();

    // Daily report cards
    const grid = document.getElementById("statsGrid");
    if (snap.code === 0 && snap.data) {
      grid.innerHTML = snap.data.map(s => `
        <div class="stat-card">
          <div class="stat-card-district">${s.district}</div>
          <div class="stat-card-value">${s.txn_count}</div>
          <div class="stat-card-label">今日成交(宗)</div>
          <div class="stat-card-value" style="font-size:14px;margin-top:4px">${s.avg_unit_price.toLocaleString()}</div>
          <div class="stat-card-label">均呎价 (HKD)</div>
          <div style="color:#07c160;font-size:10px;margin-top:4px">↑${s.price_up_count}降 ${s.price_down_count}</div>
        </div>
      `).join("");
    }

    // Index data
    const idxList = document.getElementById("indexList");
    if (idx.code === 0 && idx.data.indices) {
      idxList.innerHTML = idx.data.indices.map(idxObj => {
        const latest = idxObj.time_series[idxObj.time_series.length - 1];
        const weekChange = latest?.change_week || 0;
        const changeClass = weekChange >= 0 ? "rate-up" : "rate-down";
        const changeSymbol = weekChange >= 0 ? "+" : "";
        return `
          <div class="index-item">
            <div class="index-name">${idxObj.index.name}</div>
            <div class="index-value">${latest ? latest.index_value : "-"}</div>
            <div class="index-change ${changeClass}">${changeSymbol}${weekChange}% 本周</div>
            ${idxObj.district_breakdown ? idxObj.district_breakdown.map(dd => `
              <div style="display:inline-block;margin-right:12px;margin-top:6px">
                <span style="color:#666;font-size:10px">${dd.district}</span>
                <span style="color:#333;font-size:13px;font-weight:600">${dd.latest_value}</span>
              </div>
            `).join("") : ""}
          </div>
        `;
      }).join("");
    }
  } catch (e) {
    document.getElementById("statsGrid").innerHTML = '<div class="loading">加载失败</div>';
  }
}

// ============================================================================
// Stamp Duty Calculator
// ============================================================================

async function calcStampDuty() {
  const price = parseFloat(document.getElementById("calcPrice").value);
  const buyerType = document.getElementById("calcBuyerType").value;

  if (!price || price <= 0) {
    showToast("请输入有效的物业价格");
    return;
  }

  try {
    const r = await fetch(API + "/calculator/stamp-duty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: price * 10000, buyer_type: buyerType }),
    });
    const d = await r.json();
    if (d.code !== 0) return;

    const data = d.data;
    document.getElementById("calcResult").style.display = "block";
    document.getElementById("calcResult").innerHTML = `
      <div class="calc-row">
        <span class="calc-row-label">从价印花税 (AVD)</span>
        <span class="calc-row-value">${(data.avd / 10000).toFixed(2)} 万</span>
      </div>
      <div class="calc-row">
        <span class="calc-row-label">买家印花税 (BSD)</span>
        <span class="calc-row-value">${(data.bsd / 10000).toFixed(2)} 万</span>
      </div>
      <div class="calc-row">
        <span class="calc-row-label">新住宅印花税 (NRSD)</span>
        <span class="calc-row-value">${(data.nrsd / 10000).toFixed(2)} 万</span>
      </div>
      <div class="calc-row total">
        <span class="calc-row-label">合计应缴印花税</span>
        <span class="calc-row-value">${(data.total_stamp_duty / 10000).toFixed(2)} 万</span>
      </div>
      <div class="calc-row">
        <span class="calc-row-label">有效税率</span>
        <span class="calc-row-value">${data.effective_rate}%</span>
      </div>
      <div style="color:#888;font-size:10px;margin-top:8px">${data.note}</div>
    `;
  } catch (e) {
    showToast("计算失败，请重试");
  }
}

// ============================================================================
// Utility
// ============================================================================

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

// ============================================================================
// Init
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  renderHome();
});
