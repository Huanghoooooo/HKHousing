/**
 * Generate PDF from the architecture document HTML.
 * Uses Playwright headless Chromium to render and print to PDF.
 * Optional: requires `npm install playwright` + `npx playwright install chromium`.
 * For quick usage, open frontend/architecture-doc.html in browser and Ctrl+P → Save as PDF.
 */
const path = require("path");
const fs = require("fs");

const HTML_PATH = path.join(__dirname, "..", "frontend", "architecture-doc.html");
const PDF_PATH = path.join(__dirname, "..", "香港房产数据平台_架构与实现说明.pdf");

(async () => {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    console.log("Playwright not installed. To generate PDF:");
    console.log("  npm install playwright");
    console.log("  npx playwright install chromium");
    console.log("  node generate-pdf.js");
    console.log("Or open frontend/architecture-doc.html in browser → Ctrl+P → Save as PDF.");
    process.exit(0);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const html = fs.readFileSync(HTML_PATH, "utf-8");
  await page.setContent(html, { waitUntil: "networkidle" });

  await page.pdf({
    path: PDF_PATH,
    format: "A4",
    margin: { top: "25mm", bottom: "25mm", left: "18mm", right: "18mm" },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:9px;color:#999;text-align:center;width:100%;padding-top:8px">香港房产数据智能查询平台 — 架构与实现说明</div>',
    footerTemplate: '<div style="font-size:9px;color:#999;text-align:center;width:100%">第 <span class="pageNumber"></span> 页 / 共 <span class="totalPages"></span> 页</div>',
  });

  await browser.close();
  console.log(`PDF generated: ${PDF_PATH}`);
})();
