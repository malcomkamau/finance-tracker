const BASE_URL = "https://finance-tracker-97jz.onrender.com";

let allTransactions = [];
let filteredTransactions = [];

document.addEventListener("DOMContentLoaded", () => {
  loadTransactions();

  const form = document.getElementById("transactionForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const newTransaction = {};
      for (const [key, value] of formData.entries()) {
        newTransaction[key] = value.trim();
      }
      newTransaction["Quantity"] = parseFloat(newTransaction["Quantity"]) || 0;
      newTransaction["Price Per Unit"] = parseFloat(newTransaction["Price Per Unit"]) || 0;

      try {
        const res = await fetch(`${BASE_URL}/api/data`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newTransaction),
        });
        if (!res.ok) throw new Error(`Failed to submit: ${res.statusText}`);

        form.reset();
        await loadTransactions();
        alert("Transaction added successfully!");
      } catch (err) {
        console.error(err);
        alert("Error adding transaction. Please try again.");
      }
    });
  }

  const addSafeListener = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  };

  addSafeListener("searchText", "input", applyFilters);
  addSafeListener("startDate", "change", applyFilters);
  addSafeListener("endDate", "change", applyFilters);
  addSafeListener("categoryFilter", "change", applyFilters);
  addSafeListener("paymentMethodFilter", "change", applyFilters);
  addSafeListener("applyFiltersBtn", "click", applyFilters);
  addSafeListener("resetFiltersBtn", "click", resetFilters);
  addSafeListener("exportCSV", "click", exportToCSV);
  addSafeListener("exportExcel", "click", exportToExcel);
  addSafeListener("exportPDF", "click", exportToPDF);
});

async function loadTransactions() {
  try {
    const res = await fetch(`${BASE_URL}/api/data`);
    allTransactions = await res.json();
    filteredTransactions = [...allTransactions];
    updateFiltersOptions();
    renderTransactionsTable(filteredTransactions);
    updateSummaryStats(filteredTransactions);
    renderCharts(filteredTransactions);
  } catch (err) {
    console.error("Error loading transactions:", err);
    alert("Failed to load transactions");
  }
}

function updateFiltersOptions() {
  const categories = Array.from(new Set(allTransactions.map(t => t.Category).filter(Boolean))).sort();
  const paymentMethods = Array.from(new Set(allTransactions.map(t => t["Payment Method"]).filter(Boolean))).sort();

  const categoryFilter = document.getElementById("categoryFilter");
  const paymentMethodFilter = document.getElementById("paymentMethodFilter");

  if (categoryFilter) {
    categoryFilter.innerHTML = '<option value="">All Categories</option>' +
      categories.map(c => `<option value="${c}">${c}</option>`).join("");
  }

  if (paymentMethodFilter) {
    paymentMethodFilter.innerHTML = '<option value="">All Payment Methods</option>' +
      paymentMethods.map(p => `<option value="${p}">${p}</option>`).join("");
  }
}

function applyFilters() {
  const searchText = document.getElementById("searchText")?.value.toLowerCase() || "";
  const startDate = document.getElementById("startDate")?.value;
  const endDate = document.getElementById("endDate")?.value;
  const category = document.getElementById("categoryFilter")?.value;
  const paymentMethod = document.getElementById("paymentMethodFilter")?.value;

  filteredTransactions = allTransactions.filter(t => {
    const matchSearch =
      (t["Item Name"]?.toLowerCase().includes(searchText) ||
       t.Vendor?.toLowerCase().includes(searchText) ||
       t.Category?.toLowerCase().includes(searchText));

    const date = new Date(t.Date);
    const afterStart = !startDate || date >= new Date(startDate);
    const beforeEnd = !endDate || date <= new Date(endDate);
    const matchCategory = !category || t.Category === category;
    const matchPayment = !paymentMethod || t["Payment Method"] === paymentMethod;

    return matchSearch && afterStart && beforeEnd && matchCategory && matchPayment;
  });

  renderTransactionsTable(filteredTransactions);
  updateSummaryStats(filteredTransactions);
  renderCharts(filteredTransactions);
}

function resetFilters() {
  ["searchText", "startDate", "endDate", "categoryFilter", "paymentMethodFilter"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  filteredTransactions = [...allTransactions];
  renderTransactionsTable(filteredTransactions);
  updateSummaryStats(filteredTransactions);
  renderCharts(filteredTransactions);
}

function renderTransactionsTable(transactions) {
  const table = document.getElementById("transactionTable");
  if (!table) return;

  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  const tfoot = table.querySelector("tfoot");

  if (!thead || !tbody || !tfoot) return;

  if (transactions.length === 0) {
    tbody.innerHTML = "<tr><td colspan='8'>No transactions found.</td></tr>";
    tfoot.innerHTML = "";
    return;
  }

  thead.innerHTML = `
    <tr>
      <th>Date</th>
      <th>Item Name</th>
      <th>Category</th>
      <th>Quantity</th>
      <th>Price Per Unit</th>
      <th>Vendor</th>
      <th>Payment Method</th>
      <th>Notes</th>
    </tr>
  `;

  tbody.innerHTML = transactions.map(t => `
    <tr>
      <td>${formatDate(t.Date)}</td>
      <td>${t["Item Name"] || ""}</td>
      <td>${t.Category || ""}</td>
      <td>${t.Quantity}</td>
      <td>$${t["Price Per Unit"].toFixed(2)}</td>
      <td>${t.Vendor || ""}</td>
      <td>${t["Payment Method"] || ""}</td>
      <td>${t.Notes || ""}</td>
    </tr>
  `).join("");

  const totalQuantity = transactions.reduce((sum, t) => sum + t.Quantity, 0);
  const totalSpending = transactions.reduce((sum, t) => sum + t.Quantity * t["Price Per Unit"], 0);
  tfoot.innerHTML = `
    <tr>
      <td colspan="3"><strong>Totals</strong></td>
      <td><strong>${totalQuantity}</strong></td>
      <td><strong>$${totalSpending.toFixed(2)}</strong></td>
      <td colspan="3"></td>
    </tr>
  `;
}

function updateSummaryStats(transactions) {
  const totalTransactionsEl = document.getElementById("totalTransactions");
  const totalQuantityEl = document.getElementById("totalQuantity");
  const totalSpendingEl = document.getElementById("totalSpending");

  if (!totalTransactionsEl || !totalQuantityEl || !totalSpendingEl) return;

  totalTransactionsEl.textContent = transactions.length;
  const totalQuantity = transactions.reduce((sum, t) => sum + t.Quantity, 0);
  const totalSpending = transactions.reduce((sum, t) => sum + t.Quantity * t["Price Per Unit"], 0);

  totalQuantityEl.textContent = totalQuantity;
  totalSpendingEl.textContent = totalSpending.toFixed(2);
}

function renderCharts(transactions) {
  const categoryData = {};
  transactions.forEach(t => {
    if (t.Category) {
      categoryData[t.Category] = (categoryData[t.Category] || 0) + t.Quantity * t["Price Per Unit"];
    }
  });
  const categoryLabels = Object.keys(categoryData);
  const categoryValues = Object.values(categoryData);

  renderChart("categoryChart", categoryLabels, categoryValues, "Spending by Category");
  renderChart("dashboardCategoryChart", categoryLabels, categoryValues, "Spending by Category");

  const timeData = {};
  transactions.forEach(t => {
    if (t.Date) {
      const month = formatMonthYear(t.Date);
      timeData[month] = (timeData[month] || 0) + t.Quantity * t["Price Per Unit"];
    }
  });
  const timeLabels = Object.keys(timeData).sort((a,b) => new Date(a) - new Date(b));
  const timeValues = timeLabels.map(label => timeData[label]);

  renderChart("timeChart", timeLabels, timeValues, "Spending Over Time", "line");
  renderChart("dashboardTimeChart", timeLabels, timeValues, "Spending Over Time", "line");
}

let chartInstances = {};
function renderChart(canvasId, labels, data, label, type = "bar") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  chartInstances[canvasId] = new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: [{
        label,
        data,
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
        fill: type === "line",
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}
function formatMonthYear(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('default', { month: 'short', year: 'numeric' });
}

function exportToCSV() {
  const data = getExportData();
  const csv = convertToCSV(data);
  downloadFile(csv, "transactions.csv", "text/csv");
}

function exportToExcel() {
  const data = getExportData();
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  XLSX.writeFile(wb, "transactions.xlsx");
}

function exportToPDF() {
  const data = getExportData();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.text("Transaction Report", 14, 15);
  const columns = [
    "Date", "Item Name", "Category", "Quantity",
    "Price Per Unit", "Vendor", "Payment Method", "Notes"
  ];
  const rows = data.map(t => [
    formatDate(t.Date),
    t["Item Name"] || "",
    t.Category || "",
    t.Quantity,
    `Kes ${t["Price Per Unit"].toFixed(2)}`,
    t.Vendor || "",
    t["Payment Method"] || "",
    t.Notes || ""
  ]);

  doc.autoTable({
    head: [columns],
    body: rows,
    startY: 20,
  });
  doc.save("transactions.pdf");
}

function getExportData() {
  const checkbox = document.getElementById("exportFiltered");
  return checkbox && checkbox.checked ? filteredTransactions : allTransactions;
}

function convertToCSV(arr) {
  if (arr.length === 0) return "";
  const keys = Object.keys(arr[0]);
  const csvRows = [];
  csvRows.push(keys.join(","));
  for (const row of arr) {
    csvRows.push(keys.map(k => `"${(row[k] ?? "").toString().replace(/"/g, '""')}"`).join(","));
  }
  return csvRows.join("\n");
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}