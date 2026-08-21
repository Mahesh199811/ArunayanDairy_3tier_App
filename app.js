const defaultFarmers = [
  { name: "Ramesh Patil", village: "Kondhwa", phone: "+91 98765 42108", member: "AD-1042", volume: 428, quality: 4.8 },
  { name: "Sunita More", village: "Manjari", phone: "+91 98231 55872", member: "AD-1038", volume: 391, quality: 4.6 },
  { name: "Ganesh Jadhav", village: "Loni Kalbhor", phone: "+91 97642 11983", member: "AD-1027", volume: 362, quality: 4.4 },
  { name: "Meena Shinde", village: "Uruli Kanchan", phone: "+91 90118 77431", member: "AD-1019", volume: 345, quality: 4.7 },
  { name: "Vijay Pawar", village: "Theur", phone: "+91 98502 33641", member: "AD-1014", volume: 319, quality: 4.3 },
  { name: "Anita Kale", village: "Wagholi", phone: "+91 94235 82019", member: "AD-1008", volume: 296, quality: 4.5 }
];

const defaultCollections = [
  { farmer: "Ramesh Patil", village: "Kondhwa", shift: "Morning", quantity: 42.5, fat: 4.8, snf: 8.7, amount: 1913, status: "Accepted", time: "07:42 AM" },
  { farmer: "Sunita More", village: "Manjari", shift: "Morning", quantity: 38.2, fat: 4.6, snf: 8.5, amount: 1681, status: "Accepted", time: "07:31 AM" },
  { farmer: "Ganesh Jadhav", village: "Loni Kalbhor", shift: "Morning", quantity: 35.8, fat: 4.4, snf: 8.4, amount: 1539, status: "Review", time: "07:18 AM" },
  { farmer: "Meena Shinde", village: "Uruli Kanchan", shift: "Morning", quantity: 31.4, fat: 4.7, snf: 8.8, amount: 1413, status: "Accepted", time: "07:04 AM" },
  { farmer: "Vijay Pawar", village: "Theur", shift: "Morning", quantity: 29.6, fat: 4.3, snf: 8.3, amount: 1243, status: "Accepted", time: "06:52 AM" },
  { farmer: "Anita Kale", village: "Wagholi", shift: "Evening", quantity: 28.1, fat: 4.5, snf: 8.6, amount: 1219, status: "Accepted", time: "05:44 PM" }
];

const weeklyData = [
  { day: "Mon", morning: 72, evening: 50 }, { day: "Tue", morning: 79, evening: 55 },
  { day: "Wed", morning: 67, evening: 47 }, { day: "Thu", morning: 86, evening: 59 },
  { day: "Fri", morning: 82, evening: 57 }, { day: "Sat", morning: 91, evening: 64 },
  { day: "Sun", morning: 75, evening: 51 }
];

const inventory = [
  { name: "Whole milk", detail: "Cold storage tank A", amount: "2,840 L", percent: 71, icon: "milk" },
  { name: "Curd", detail: "Ready for dispatch", amount: "680 kg", percent: 62, icon: "cup-soda" },
  { name: "Ghee", detail: "Finished goods store", amount: "214 kg", percent: 43, icon: "jar" },
  { name: "Paneer", detail: "Chiller rack C", amount: "96 kg", percent: 24, icon: "package", low: true },
  { name: "Buttermilk", detail: "Dispatch bay", amount: "1,180 L", percent: 78, icon: "bottle" },
  { name: "Packaging", detail: "Pouches and cartons", amount: "8,420 units", percent: 56, icon: "boxes" }
];

let farmers = JSON.parse(localStorage.getItem("arunayanFarmers")) || defaultFarmers;
let collections = JSON.parse(localStorage.getItem("arunayanCollections")) || defaultCollections;
let activeShift = "all";

const formatCurrency = value => `₹${Math.round(value).toLocaleString("en-IN")}`;
const initials = name => name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

function collectionRow(item) {
  return `<tr>
    <td><div class="farmer-cell"><span class="initials">${initials(item.farmer)}</span><span><strong>${escapeHtml(item.farmer)}</strong><small>${escapeHtml(item.village)} · ${escapeHtml(item.time)}</small></span></div></td>
    <td>${escapeHtml(item.shift)}</td><td><strong>${item.quantity.toFixed(1)} L</strong></td><td>${item.fat.toFixed(1)}% / ${item.snf.toFixed(1)}%</td><td><strong>${formatCurrency(item.amount)}</strong></td>
    <td><span class="status-pill ${item.status === "Accepted" ? "success" : "pending"}">${escapeHtml(item.status)}</span></td><td><button class="row-action" aria-label="More actions"><i data-lucide="ellipsis"></i></button></td>
  </tr>`;
}

function renderCollections(query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = collections.filter(item => {
    const matchesQuery = `${item.farmer} ${item.village}`.toLowerCase().includes(normalizedQuery);
    const matchesShift = activeShift === "all" || item.shift.toLowerCase() === activeShift;
    return matchesQuery && matchesShift;
  });
  document.querySelector("#recentCollectionsBody").innerHTML = filtered.slice(0, 5).map(collectionRow).join("") || emptyRow("No matching collections", 7);
  document.querySelector("#allCollectionsBody").innerHTML = filtered.map(collectionRow).join("") || emptyRow("No matching collections", 7);
  document.querySelector("#collectionCount").textContent = `${filtered.length} records`;
  refreshIcons();
}

function emptyRow(message, columns) {
  return `<tr><td colspan="${columns}" style="padding:32px;text-align:center;color:var(--muted)">${message}</td></tr>`;
}

function renderFarmers(query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = farmers.filter(farmer => `${farmer.name} ${farmer.village} ${farmer.member}`.toLowerCase().includes(normalizedQuery));
  document.querySelector("#farmerGrid").innerHTML = filtered.map(farmer => `<article class="farmer-card"><div class="farmer-card-head"><span class="initials">${initials(farmer.name)}</span><div><h3>${escapeHtml(farmer.name)}</h3><p>${escapeHtml(farmer.village)} · ${escapeHtml(farmer.member)}</p></div></div><div class="farmer-card-stats"><div><span>Cycle volume</span><strong>${farmer.volume} L</strong></div><div><span>Average fat</span><strong>${farmer.quality}%</strong></div></div></article>`).join("") || `<p>No matching farmers found.</p>`;
}

function renderInventory() {
  document.querySelector("#inventoryGrid").innerHTML = inventory.map(item => `<article class="inventory-card ${item.low ? "low" : ""}">${item.low ? '<span class="low-stock">LOW STOCK</span>' : ""}<span class="inventory-icon"><i data-lucide="${item.icon}"></i></span><h3>${item.name}</h3><p>${item.detail}</p><div class="stock-line"><span>Available stock</span><strong>${item.amount}</strong></div><div class="progress"><span style="width:${item.percent}%"></span></div></article>`).join("");
}

function renderPayments() {
  document.querySelector("#paymentsBody").innerHTML = farmers.slice(0, 5).map((farmer, index) => `<tr><td><div class="farmer-cell"><span class="initials">${initials(farmer.name)}</span><span><strong>${escapeHtml(farmer.name)}</strong><small>${farmer.member}</small></span></div></td><td>01–15 Aug 2026</td><td>${farmer.volume} L</td><td><strong>${formatCurrency(farmer.volume * 43.5)}</strong></td><td><span class="status-pill ${index < 3 ? "success" : "pending"}">${index < 3 ? "Paid" : "Scheduled"}</span></td></tr>`).join("");
}

function renderChart() {
  document.querySelector("#weeklyChart").innerHTML = weeklyData.map(item => `<div class="bar-group"><span class="bar" style="height:${item.morning}%" title="${item.day} morning"></span><span class="bar evening" style="height:${item.evening}%" title="${item.day} evening"></span><span class="bar-label">${item.day}</span></div>`).join("");
}

function populateFarmerSelect() {
  const select = document.querySelector("#farmerName");
  select.innerHTML = '<option value="">Select a farmer</option>' + farmers.map(farmer => `<option value="${escapeHtml(farmer.name)}">${escapeHtml(farmer.name)} · ${escapeHtml(farmer.village)}</option>`).join("");
}

function updateMetrics() {
  const addedQuantity = collections.slice(0, Math.max(0, collections.length - defaultCollections.length)).reduce((sum, item) => sum + item.quantity, 0);
  document.querySelector("#totalMilk").innerHTML = `${(1248.5 + addedQuantity).toLocaleString("en-IN", { maximumFractionDigits: 1 })} <small>L</small>`;
  document.querySelector("#activeFarmers").textContent = 80 + farmers.length;
}

function showView(name) {
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === `${name}View`));
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === name));
  const labels = { overview: "Good morning", collections: "Milk collection", farmers: "Farmer directory", inventory: "Inventory control", payments: "Farmer payments" };
  document.querySelector("#pageTitle").textContent = labels[name];
  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.querySelector("span").textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function calculateAmount() {
  const quantity = Number(document.querySelector("#quantity").value) || 0;
  const fat = Number(document.querySelector("#fat").value) || 0;
  const rate = 30 + fat * 3;
  document.querySelector("#estimatedAmount").textContent = formatCurrency(quantity * rate);
}

function closeSidebar() {
  document.querySelector("#sidebar").classList.remove("open");
  document.querySelector("#sidebarBackdrop").classList.remove("open");
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function exportCollections() {
  const rows = [["Farmer", "Village", "Shift", "Quantity (L)", "Fat (%)", "SNF (%)", "Amount", "Status"], ...collections.map(item => [item.farmer, item.village, item.shift, item.quantity, item.fat, item.snf, item.amount, item.status])];
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "arunayan-dairy-collections.csv";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Collection report exported");
}

document.addEventListener("DOMContentLoaded", () => {
  const date = new Date();
  document.querySelector("#todayLabel").textContent = date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  renderChart(); renderCollections(); renderFarmers(); renderInventory(); renderPayments(); populateFarmerSelect(); updateMetrics(); refreshIcons();

  document.querySelectorAll(".nav-item").forEach(item => item.addEventListener("click", () => showView(item.dataset.view)));
  document.querySelectorAll("[data-view-link]").forEach(item => item.addEventListener("click", () => showView(item.dataset.viewLink)));
  document.querySelectorAll(".duplicate-add").forEach(button => button.addEventListener("click", () => document.querySelector("#collectionDialog").showModal()));
  document.querySelector("#addCollectionButton").addEventListener("click", () => document.querySelector("#collectionDialog").showModal());
  document.querySelectorAll("[data-close-dialog]").forEach(button => button.addEventListener("click", () => document.querySelector("#collectionDialog").close()));
  document.querySelector("#addFarmerButton").addEventListener("click", () => document.querySelector("#farmerDialog").showModal());
  document.querySelectorAll("[data-close-farmer]").forEach(button => button.addEventListener("click", () => document.querySelector("#farmerDialog").close()));
  document.querySelector("#exportButton").addEventListener("click", exportCollections);
  document.querySelector("#settleButton").addEventListener("click", () => showToast("Payout batch prepared for review"));
  document.querySelector("#notificationButton").addEventListener("click", () => showToast("2 quality reports need review"));

  document.querySelector("#menuButton").addEventListener("click", () => { document.querySelector("#sidebar").classList.add("open"); document.querySelector("#sidebarBackdrop").classList.add("open"); });
  document.querySelector("#sidebarBackdrop").addEventListener("click", closeSidebar);
  document.querySelector("#globalSearch").addEventListener("input", event => { renderCollections(event.target.value); renderFarmers(event.target.value); });
  document.querySelectorAll(".shift-switch button").forEach(button => button.addEventListener("click", () => { document.querySelectorAll(".shift-switch button").forEach(item => item.classList.remove("active")); button.classList.add("active"); activeShift = button.dataset.shift; renderCollections(document.querySelector("#globalSearch").value); }));
  ["quantity", "fat"].forEach(id => document.querySelector(`#${id}`).addEventListener("input", calculateAmount));

  document.querySelector("#collectionForm").addEventListener("submit", event => {
    event.preventDefault();
    const farmer = farmers.find(item => item.name === document.querySelector("#farmerName").value);
    const quantity = Number(document.querySelector("#quantity").value);
    const fat = Number(document.querySelector("#fat").value);
    const newCollection = { farmer: farmer.name, village: farmer.village, shift: document.querySelector("#shift").value, quantity, fat, snf: Number(document.querySelector("#snf").value), amount: quantity * (30 + fat * 3), status: "Accepted", time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) };
    collections.unshift(newCollection);
    localStorage.setItem("arunayanCollections", JSON.stringify(collections));
    renderCollections(); updateMetrics(); event.target.reset(); calculateAmount(); document.querySelector("#collectionDialog").close(); showToast("Milk collection saved successfully");
  });

  document.querySelector("#farmerForm").addEventListener("submit", event => {
    event.preventDefault();
    farmers.push({ name: document.querySelector("#newFarmerName").value.trim(), village: document.querySelector("#newFarmerVillage").value.trim(), phone: document.querySelector("#newFarmerPhone").value.trim(), member: `AD-${1000 + farmers.length + 1}`, volume: 0, quality: 0 });
    localStorage.setItem("arunayanFarmers", JSON.stringify(farmers));
    renderFarmers(); populateFarmerSelect(); updateMetrics(); event.target.reset(); document.querySelector("#farmerDialog").close(); showToast("Farmer profile created");
  });
});