let DATA = null;
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m],
  );
const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const statusClass = (s) =>
  s === "Healthy"
    ? "healthy"
    : s === "Low"
      ? "low"
      : s === "Critical"
        ? "critical"
        : "out";
const badge = (s) => `<span class="status ${statusClass(s)}">${esc(s)}</span>`;

async function init() {
  DATA = await fetch("mock-data.json").then((r) => r.json());
  bindNav();
  render("dashboard");
}
function bindNav() {
  document
    .querySelectorAll(".nav")
    .forEach((b) => (b.onclick = () => render(b.dataset.page)));
}
function render(page, extra) {
  document
    .querySelectorAll(".nav")
    .forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  const titles = {
    dashboard: "Dashboard",
    inventory: "Inventory",
    movements: "Inventory Movements",
    inbound: "Inbound Shipments",
    rules: "Stock Rules",
    pipelines: "Data Pipelines",
    users: "Users & Roles",
    reports: "Reports",
  };
  $("#page-title").textContent = titles[page] || "Dashboard";
  const views = {
    dashboard: dashboard,
    inventory: inventory,
    movements: movements,
    inbound: inbound,
    rules: rules,
    pipelines: pipelines,
    users: users,
    reports: reports,
  };
  $("#content").innerHTML = views[page](extra);
  afterRender(page);
}
function header(title, sub, actions = "") {
  return `<div class="page-head"><div><h1>${title}</h1><p>${sub}</p></div><div class="actions">${actions}</div></div>`;
}
function totals() {
  return DATA.records.reduce(
    (a, r) => {
      a.factory += r.factory;
      a.esh += r.eshopbox;
      a.fba += r.fba;
      a.transit += r.transit;
      a.total += r.total;
      return a;
    },
    { factory: 0, esh: 0, fba: 0, transit: 0, total: 0 },
  );
}
function dashboard() {
  const t = totals(),
    low = DATA.records.filter((r) => r.status !== "Healthy").length;
  const top = DATA.records.slice(0, 8);
  return (
    header(
      "Inventory Command Center",
      "Network-wide stock position across Factory, Eshopbox, Amazon FBA and inbound inventory.",
      `<button class="btn" onclick="openImport()">＋ Import Excel</button><button class="btn primary" onclick="render('reports')">Export Report</button>`,
    ) +
    `<div class="kpis">
    ${kpi("Total Network", t.total, "Across all physical locations")}
    ${kpi("Factory", t.factory, "Latest factory snapshot")}
    ${kpi("Eshopbox", t.esh, "HYD · GGN · KOL · Mumbai")}
    ${kpi("Amazon FBA", t.fba, "Sellable + network stock")}
    ${kpi("In Transit", t.transit, "Upcoming / moving stock")}
  </div>
  <div class="grid2">
    <div class="card chart-card"><div class="card-title"><h3>Inventory by location</h3><small>Current position</small></div>${bars(t)}</div>
    <div class="card chart-card"><div class="card-title"><h3>Stock health</h3><small>${DATA.records.length} SKUs monitored</small></div><div class="health"><div class="donut-wrap"><div class="donut"></div><div class="donut-text"><b>${DATA.records.length}</b><small>SKUs</small></div></div><div class="legend">${legend("Healthy", DATA.records.filter((r) => r.status === "Healthy").length)}${legend("Low", DATA.records.filter((r) => r.status === "Low").length)}${legend("Critical", DATA.records.filter((r) => r.status === "Critical").length)}${legend("Out of Stock", DATA.records.filter((r) => r.status === "Out of Stock").length)}</div></div></div>
  </div>
  <div class="card table-card"><div class="table-toolbar"><div><b>Attention required</b><div class="muted">SKUs that need inventory action</div></div><button class="btn" onclick="render('inventory')">View all inventory →</button></div>${table(
    top.filter((r) => r.status !== "Healthy"),
    true,
  )}</div>`
  );
}
function kpi(name, val, sub) {
  return `<div class="card kpi"><div class="kpi-top"><span>${name}</span><span class="kpi-icon">▦</span></div><h2>${fmt(val)}</h2><span class="delta">● ${sub}</span></div>`;
}
function legend(n, v) {
  return `<div class="legend-row"><span>${n}</span><b>${v}</b></div>`;
}
function bars(t) {
  const vals = [t.factory, t.esh, t.fba, t.transit],
    names = ["Factory", "Eshopbox", "FBA", "Transit"],
    max = Math.max(...vals, 1);
  return `<div class="bar-chart">${vals.map((v, i) => `<div style="flex:1"><div class="bar-group"><div class="bar" style="height:${Math.max(3, (v / max) * 100)}%"></div><div class="bar alt" style="height:${Math.max(3, (v / max) * 72)}%"></div></div><div class="bar-label">${names[i]}<br>${fmt(v)}</div></div>`).join("")}</div>`;
}
function table(rows, attention = false) {
  if (!rows.length)
    return `<div class="empty">No matching inventory records.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>SKU</th><th>Product</th><th>Category</th><th class="num">Factory</th><th class="num">Eshopbox</th><th class="num">FBA</th><th class="num">Transit</th><th class="num">Total</th><th>Days Cover</th><th>Status</th></tr></thead><tbody>${rows.map((r) => `<tr onclick="openSku('${esc(r.sku)}')" style="cursor:pointer"><td class="sku">${esc(r.sku)}</td><td>${esc(r.product)}</td><td>${esc(r.category)}</td><td class="num">${fmt(r.factory)}</td><td class="num">${fmt(r.eshopbox)}</td><td class="num">${fmt(r.fba)}</td><td class="num">${fmt(r.transit)}</td><td class="num"><b>${fmt(r.total)}</b></td><td>${r.daysCover}d</td><td>${badge(r.status)}</td></tr>`).join("")}</tbody></table></div>`;
}
function inventory() {
  return (
    header(
      "Inventory",
      "Search, filter and inspect current stock across the network.",
      `<button class="btn" onclick="openImport()">＋ Import</button><button class="btn primary" onclick="exportCSV()">Export CSV</button>`,
    ) +
    `<div class="card table-card"><div class="table-toolbar"><input class="search" id="invSearch" placeholder="Search SKU or product…" oninput="filterInventory()"><div class="filters"><select class="select" id="locFilter" onchange="filterInventory()"><option value="">All locations</option><option>Factory</option><option>Eshopbox</option><option>FBA</option><option>In Transit</option></select><select class="select" id="statusFilter" onchange="filterInventory()"><option value="">All statuses</option><option>Healthy</option><option>Low</option><option>Critical</option><option>Out of Stock</option></select></div></div><div id="inventoryTable">${table(DATA.records)}</div></div>`
  );
}
function filterInventory() {
  const q = ($("#invSearch").value || "").toLowerCase(),
    loc = $("#locFilter").value,
    st = $("#statusFilter").value;
  let rows = DATA.records.filter(
    (r) =>
      (r.sku + " " + r.product).toLowerCase().includes(q) &&
      (!st || r.status === st),
  );
  if (loc)
    rows = rows.filter((r) =>
      loc === "Factory"
        ? r.factory > 0
        : loc === "Eshopbox"
          ? r.eshopbox > 0
          : loc === "FBA"
            ? r.fba > 0
            : r.transit > 0,
    );
  $("#inventoryTable").innerHTML = table(rows);
}
function openSku(sku) {
  const r = DATA.records.find((x) => x.sku === sku);
  if (!r) return;
  const max = Math.max(r.factory, r.eshopbox, r.fba, 1);
  $("#modal-content").innerHTML =
    `<div class="modal-head"><div><div class="muted">SKU DETAIL</div><h2>${esc(r.sku)}</h2><p class="muted">${esc(r.product)}</p></div><button class="close" onclick="closeModal()">✕</button></div>
 <div class="detail-grid" style="margin-top:18px">${[
   ["Factory", r.factory],
   ["Eshopbox", r.eshopbox],
   ["Amazon FBA", r.fba],
   ["In Transit", r.transit],
 ]
   .map(
     (x) =>
       `<div class="card detail-kpi"><span>${x[0]}</span><b>${fmt(x[1])}</b></div>`,
   )
   .join("")}</div>
 <div class="info-grid"><div class="card chart-card"><div class="card-title"><h3>Stock position</h3>${badge(r.status)}</div><div class="location-list">${[
   ["Factory", r.factory],
   ["Eshopbox", r.eshopbox],
   ["FBA", r.fba],
 ]
   .map(
     (x) =>
       `<div class="loc-row"><span>${x[0]}</span><div class="track"><i style="width:${Math.max(3, (x[1] / max) * 100)}%"></i></div><b>${fmt(x[1])}</b></div>`,
   )
   .join(
     "",
   )}</div><p class="muted" style="margin-top:18px">Days of cover: <b>${r.daysCover} days</b> · Sales velocity: <b>${r.velocity}/day</b></p></div>
 <div class="card chart-card"><div class="card-title"><h3>Stock rules</h3><small>All rules active</small></div><div class="legend">${legend("Fixed threshold", r.fixedThreshold)}${legend("SKU minimum", r.skuThreshold)}${legend("Sales velocity", r.daysCover + " days cover")}</div><button class="btn" style="margin-top:18px" onclick="closeModal();render('rules')">Edit stock rules →</button></div></div>
 <div class="card table-card"><div class="table-toolbar"><b>Recent movements</b><span class="muted">Last 10 records</span></div>${tableMov(DATA.movements.filter((m) => m.sku === r.sku).slice(0, 10))}</div>`;
  $("#modal").classList.remove("hidden");
}
function tableMov(rows) {
  return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>SKU</th><th>Movement</th><th>Source</th><th>Destination</th><th>Qty</th><th>User</th></tr></thead><tbody>${rows.map((m) => `<tr><td>${m.date}</td><td class="sku">${m.sku}</td><td>${m.type}</td><td>${m.source}</td><td>${m.destination}</td><td><b>${m.qty}</b></td><td>${m.user}</td></tr>`).join("")}</tbody></table></div>`;
}
function movements() {
  return (
    header(
      "Inventory Movements",
      "Auditable history of receipts, shipments, returns, transfers and adjustments.",
      `<button class="btn primary" onclick="exportCSV()">Export CSV</button>`,
    ) +
    `<div class="card table-card"><div class="table-toolbar"><input class="search" placeholder="Search SKU, movement or user…" oninput="movementFilter(this.value)"><select class="select"><option>All movement types</option><option>Customer Shipment</option><option>Receipt</option><option>Adjustment</option></select></div><div id="movementTable">${tableMov(DATA.movements)}</div></div>`
  );
}
function movementFilter(q) {
  q = q.toLowerCase();
  $("#movementTable").innerHTML = tableMov(
    DATA.movements.filter((m) =>
      (m.sku + " " + m.type + " " + m.user).toLowerCase().includes(q),
    ),
  );
}
function inbound() {
  return (
    header(
      "Inbound Shipments",
      "Track ordered, received, accepted, rejected and available inventory.",
      `<button class="btn primary" onclick="openShipment()">＋ Add shipment</button>`,
    ) +
    `<div class="kpis">${kpi("Open shipments", DATA.inbounds.filter((x) => x.status !== "Received").length, "Requires monitoring")}${kpi(
      "Ordered",
      DATA.inbounds.reduce((a, x) => a + x.ordered, 0),
      "Units",
    )}${kpi(
      "Received",
      DATA.inbounds.reduce((a, x) => a + x.received, 0),
      "Units received",
    )}${kpi(
      "Rejected",
      DATA.inbounds.reduce((a, x) => a + x.rejected, 0),
      "Quality exceptions",
    )}${kpi(
      "Available",
      DATA.inbounds.reduce((a, x) => a + x.available, 0),
      "Ready inventory",
    )}</div><div class="card table-card"><div class="table-toolbar"><input class="search" placeholder="Search shipment or SKU…" oninput="inboundFilter(this.value)"><span class="muted">Live pipeline view</span></div><div id="inboundTable">${inboundTable(DATA.inbounds)}</div></div>`
  );
}
function inboundTable(rows) {
  return `<div class="table-wrap"><table><thead><tr><th>Shipment</th><th>SKU</th><th>Ordered</th><th>Received</th><th>Accepted</th><th>Rejected</th><th>Available</th><th>Status</th></tr></thead><tbody>${rows.map((x) => `<tr><td>${esc(x.shipment)}</td><td class="sku">${esc(x.sku)}</td><td>${fmt(x.ordered)}</td><td>${fmt(x.received)}</td><td>${fmt(x.accepted)}</td><td>${fmt(x.rejected)}</td><td>${fmt(x.available)}</td><td>${badge(x.status === "In Transit" ? "Low" : x.status === "Received" ? "Healthy" : "Critical")} <span class="muted">${x.status}</span></td></tr>`).join("")}</tbody></table></div>`;
}
function inboundFilter(q) {
  q = q.toLowerCase();
  $("#inboundTable").innerHTML = inboundTable(
    DATA.inbounds.filter((x) =>
      (x.shipment + " " + x.sku).toLowerCase().includes(q),
    ),
  );
}
function rules() {
  return (
    header(
      "Stock Rules",
      "Configure the three-layer stock health model: fixed, SKU-specific and sales velocity.",
      `<button class="btn primary" onclick="openRule()">＋ New rule</button>`,
    ) +
    `<div class="rule-grid"><div class="card rule-card"><div class="toggle"></div><h3>Fixed Threshold</h3><p>Network-wide baseline for SKUs without a specific minimum.</p><div class="rule-value">20 units</div><small class="muted">Default minimum stock</small></div><div class="card rule-card"><div class="toggle"></div><h3>SKU-specific Threshold</h3><p>Overrides the baseline when a SKU has its own minimum and critical level.</p><div class="rule-value">${DATA.records.length} SKUs</div><small class="muted">With custom rules</small></div><div class="card rule-card"><div class="toggle"></div><h3>Sales Velocity</h3><p>Uses net shipments minus returns to calculate days of inventory cover.</p><div class="rule-value">30 days</div><small class="muted">Demand calculation window</small></div></div><div class="card table-card"><div class="table-toolbar"><b>SKU rule configuration</b><span class="muted">Most restrictive active condition wins</span></div>${ruleTable()}</div>`
  );
}
function ruleTable() {
  return `<div class="table-wrap"><table><thead><tr><th>SKU</th><th>Product</th><th>Fixed</th><th>SKU Minimum</th><th>Critical</th><th>Velocity/day</th><th>Days Cover</th><th>Status</th></tr></thead><tbody>${DATA.records
    .slice(0, 25)
    .map(
      (r) =>
        `<tr><td class="sku">${r.sku}</td><td>${r.product}</td><td>${r.fixedThreshold}</td><td>${r.skuThreshold}</td><td>${Math.max(3, Math.floor(r.skuThreshold / 2))}</td><td>${r.velocity}</td><td>${r.daysCover}</td><td>${badge(r.status)}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
function pipelines() {
  return (
    header(
      "Data Pipelines",
      "Prototype view of the future automated Amazon, Eshopbox and Factory ingestion jobs.",
      `<button class="btn primary" onclick="runSync()">↻ Run sync</button>`,
    ) +
    `<div class="pipeline-grid">${source("Amazon API", "Inventory + FBA movements", "12,430 records", "2 min ago", 98)}${source("Eshopbox API", "HYD · GGN · KOL · Mumbai", "4,820 records", "2 min ago", 96)}${source("Factory Excel", "Latest uploaded snapshot", "1,380 records", "Today, 12:30", 100)}</div><div class="card table-card"><div class="table-toolbar"><b>Pipeline history</b><span class="muted">Latest execution events</span></div>${tablePipe()}</div>`
  );
}
function source(n, desc, count, time, p) {
  return `<div class="card source-card"><div class="source-head"><b>${n}</b><span class="ok">● Healthy</span></div><p class="muted">${desc}</p><div class="big">${count}</div><small class="muted">Last successful run · ${time}</small><div class="progress"><i style="width:${p}%"></i></div></div>`;
}
function tablePipe() {
  return `<div class="table-wrap"><table><thead><tr><th>Time</th><th>Source</th><th>Records</th><th>Duration</th><th>Status</th></tr></thead><tbody>${["Amazon API", "Eshopbox API", "Factory Excel", "Amazon API", "Eshopbox API"].map((s, i) => `<tr><td>23 Sep ${["14:07", "14:05", "12:30", "10:07", "10:05"][i]}</td><td>${s}</td><td>${fmt([12430, 4820, 1380, 12395, 4791][i])}</td><td>${[42, 31, 8, 45, 30][i]} sec</td><td><span class="ok">✓ Success</span></td></tr>`).join("")}</tbody></table></div>`;
}
function users() {
  return (
    header(
      "Users & Roles",
      "Manage access for 15+ users with role-based permissions.",
      `<button class="btn primary" onclick="openUser()">＋ Add user</button>`,
    ) +
    `<div class="user-grid"><div class="card table-card" style="margin-top:0"><div class="table-toolbar"><input class="search" placeholder="Search users…"><span class="muted">${DATA.users.length} demo users</span></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>${DATA.users.map((u) => `<tr><td><b>${u.name}</b></td><td>${u.email}</td><td><span class="status healthy">${u.role}</span></td><td>${u.status}</td></tr>`).join("")}</tbody></table></div></div><div class="card role-card"><h3 style="margin-top:0;font:700 15px Manrope">Role permissions</h3>${["Admin · Everything", "Inventory Manager · Inventory + imports + rules", "Operations · Assigned inventory + shipments", "Viewer · Read-only + reports"].map((x) => `<div class="role"><b>${x.split(" · ")[0]}</b><small>${x.split(" · ")[1]}</small></div>`).join("")}</div></div>`
  );
}
function reports() {
  return (
    header(
      "Reports",
      "Generate operational reports from the current inventory snapshot.",
      `<button class="btn" onclick="exportCSV()">Export CSV</button><button class="btn primary" onclick="downloadPDF()">Generate PDF</button>`,
    ) +
    `<div class="report-grid">${report("Inventory Summary", "Factory, Eshopbox, FBA, transit and stock-health summary.", "PDF + CSV")}${report("Low Stock Report", "SKUs crossing fixed, SKU-specific or velocity-based thresholds.", "PDF + CSV")}${report("Movement Report", "Historical inventory movements with source, destination and user.", "CSV")}${report("Inbound Report", "Shipment quantities, receipts, rejections and availability.", "PDF + CSV")}${report("Pipeline Report", "Source freshness and ingestion execution history.", "PDF")}${report("Audit Report", "Manual changes, imports and user actions.", "CSV")}</div>`
  );
}
function report(t, d, f) {
  return `<div class="card report-card"><h3>${t}</h3><p>${d}</p><button class="btn" onclick="${f.includes("PDF") ? "downloadPDF()" : "exportCSV()"}">Generate ${f}</button></div>`;
}
function afterRender(page) {
  if (page === "inventory") {
  }
}
function closeModal() {
  $("#modal").classList.add("hidden");
}
function openImport() {
  $("#modal-content").innerHTML =
    `<div class="modal-head"><div><div class="muted">FACTORY DATA</div><h2>Import inventory snapshot</h2></div><button class="close" onclick="closeModal()">✕</button></div><div class="drop"><b>Drop Excel file here</b><p>or choose a .xlsx file from your computer</p><input type="file" accept=".xlsx,.xls" onchange="fakeUpload(this)"></div><div class="card" style="padding:14px"><b>Prototype behavior</b><p class="muted">This demo simulates validation and preview. No real backend or database is modified.</p></div>`;
  $("#modal").classList.remove("hidden");
}
function fakeUpload(input) {
  if (!input.files[0]) return;
  const n = input.files[0].name;
  $("#modal-content").innerHTML +=
    `<div style="margin-top:14px;padding:13px;background:#edf5f2;border-radius:8px"><b>✓ ${esc(n)} validated</b><div class="muted">1,380 rows · 0 blocking errors · 14 warnings</div><button class="btn primary" style="margin-top:10px" onclick="alert('Prototype: import completed successfully.');closeModal()">Preview & Import</button></div>`;
}
function openShipment() {
  alert(
    "Prototype: shipment form would open here. Backend integration comes later.",
  );
}
function openRule() {
  alert("Prototype: rule editor would open here.");
}
function openUser() {
  alert("Prototype: user invitation form would open here.");
}
function runSync() {
  alert(
    "Prototype sync started. Amazon, Eshopbox and Factory jobs completed successfully.",
  );
}
function exportCSV() {
  const rows = DATA.records,
    headers = [
      "SKU",
      "Product",
      "Category",
      "Factory",
      "Eshopbox",
      "FBA",
      "In Transit",
      "Total",
      "Sales Velocity",
      "Days Cover",
      "Status",
    ];
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.sku,
        r.product,
        r.category,
        r.factory,
        r.eshopbox,
        r.fba,
        r.transit,
        r.total,
        r.velocity,
        r.daysCover,
        r.status,
      ]
        .map((x) => `"${String(x).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "rama-inventory.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
function downloadPDF() {
  const t = totals(),
    html = `<html><head><title>Rama Inventory Report</title><style>body{font-family:Arial;padding:35px;color:#17221f}h1{color:#173f36}.k{display:inline-block;width:18%;padding:15px;border:1px solid #ddd;margin:4px}.k b{font-size:22px;display:block;margin-top:8px}table{width:100%;border-collapse:collapse;margin-top:25px}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left;font-size:11px}th{background:#eef4f1}</style></head><body><h1>RAMA Inventory Report</h1><p>23 September 2026 · Prototype report</p><div class="k">Total<b>${fmt(t.total)}</b></div><div class="k">Factory<b>${fmt(t.factory)}</b></div><div class="k">Eshopbox<b>${fmt(t.esh)}</b></div><div class="k">FBA<b>${fmt(t.fba)}</b></div><div class="k">Transit<b>${fmt(t.transit)}</b></div><h2>Inventory</h2>${table(DATA.records.slice(0, 25))}</body></html>`;
  const w = window.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 300);
}
$("#modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") closeModal();
});
init();
