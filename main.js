// == CONFIG ==
const BASE_URL = "https://finance-tracker-97jz.onrender.com";

let allTransactions = [];
let filteredTransactions = [];

// == DOM READY ==
document.addEventListener("DOMContentLoaded", () => {
    loadTransactions();

    const form = document.getElementById("transactionForm");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            await handleFormSubmit(form);
        });
    }

    const addSafeListener = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    };

    [
        ["searchText", "input", applyFilters],
        ["startDate", "change", applyFilters],
        ["endDate", "change", applyFilters],
        ["categoryFilter", "change", applyFilters],
        ["paymentMethodFilter", "change", applyFilters],
        ["applyFiltersBtn", "click", applyFilters],
        ["resetFiltersBtn", "click", resetFilters],
        ["exportCSV", "click", exportToCSV],
        ["exportExcel", "click", exportToExcel],
        ["exportPDF", "click", exportToPDF],
    ].forEach(([id, evt, handler]) => addSafeListener(id, evt, handler));
});

function showSpinner() {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) spinner.style.display = "block";
}

function hideSpinner() {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) spinner.style.display = "none";
}

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `fixed top-4 right-4 bg-${type === "success" ? "green" : "red"}-600 text-white px-4 py-2 rounded shadow-md z-50 animate-fade-in`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

async function handleFormSubmit(form) {
    const formData = new FormData(form);
    const newTransaction = {};
    for (const [key, value] of formData.entries()) {
        newTransaction[key] = value.trim();
    }
    newTransaction["Quantity"] = parseFloat(newTransaction["Quantity"]) || 0;
    newTransaction["Price Per Unit"] = parseFloat(newTransaction["Price Per Unit"]) || 0;

    showSpinner();
    try {
        const editingId = form.dataset.editingId;
        const url = editingId ? `${BASE_URL}/api/transaction/${editingId}` : `${BASE_URL}/api/submit`;
        const method = editingId ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTransaction),
        });

        if (!res.ok) throw new Error(`Failed to ${editingId ? "update" : "submit"}: ${res.statusText}`);

        form.reset();
        delete form.dataset.editingId;
        await loadTransactions();
        showToast(`Transaction ${editingId ? "updated" : "added"} successfully!`, "success");
    } catch (err) {
        console.error(err);
        showToast("Error processing transaction. Please try again.", "error");
    } finally {
        hideSpinner();
    }
}

async function loadTransactions() {
    showSpinner();
    try {
        const res = await fetch(`${BASE_URL}/api/data`);
        if (!res.ok) throw new Error("Failed to fetch transactions");
        allTransactions = await res.json();
        filteredTransactions = [...allTransactions];
        updateFiltersOptions();
        renderTransactionsTable(filteredTransactions);
        updateSummaryStats(filteredTransactions);
        renderCharts(filteredTransactions);
    } catch (err) {
        console.error("Error loading transactions:", err);
        showToast("Failed to load transactions", "error");
    } finally {
        hideSpinner();
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
        tbody.innerHTML = "<tr><td colspan='10'>No transactions found.</td></tr>";
        tfoot.innerHTML = "";
        return;
    }

    thead.innerHTML = `
    <tr class="bg-green-100 text-green-900 font-semibold">
      <th class="px-4 py-3">Date</th>
      <th class="px-4 py-3">Item Name</th>
      <th class="px-4 py-3">Category</th>
      <th class="px-4 py-3">Quantity</th>
      <th class="px-4 py-3">Price Per Unit</th>
      <th class="px-4 py-3">Vendor</th>
      <th class="px-4 py-3">Payment Method</th>
      <th class="px-4 py-3">Notes</th>
      <th class="px-4 py-3">Total (Kes)</th>
      <th class="px-4 py-3">Actions</th>
    </tr>
  `;

    tbody.innerHTML = transactions.map(t => {
        const quantity = Number(t.Quantity) || 0;
        const pricePerUnit = Number(t["Price Per Unit"]) || 0;
        const total = quantity * pricePerUnit;

        return `
      <tr class="border-b border-green-200">
        <td class="px-4 py-3">${formatDate(t.Date)}</td>
        <td class="px-4 py-3">${t["Item Name"] || ""}</td>
        <td class="px-4 py-3">${t.Category || ""}</td>
        <td class="px-4 py-3">${quantity}</td>
        <td class="px-4 py-3">Kes ${pricePerUnit.toFixed(2)}</td>
        <td class="px-4 py-3">${t.Vendor || ""}</td>
        <td class="px-4 py-3">${t["Payment Method"] || ""}</td>
        <td class="px-4 py-3">${t.Notes || ""}</td>
        <td class="px-4 py-3">${total.toFixed(2)}</td>
        <td class="px-4 py-3 flex space-x-2">
          <button
            class="edit-btn bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
            data-id="${t.id}" title="Edit"
          >Edit</button>
          <button
            class="delete-btn bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
            data-id="${t.id}" title="Delete"
          >Delete</button>
        </td>
      </tr>
    `;
    }).join("");

    attachEditDeleteListeners(tbody);

    // Update totals footer
    updateTableFooter(transactions, tfoot);
}

function attachEditDeleteListeners(tbody) {
    tbody.querySelectorAll(".edit-btn").forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            populateFormForEdit(id);
        };
    });

    tbody.querySelectorAll(".delete-btn").forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            if (confirm("Are you sure you want to delete this transaction?")) {
                try {
                    const res = await fetch(`${BASE_URL}/api/transaction/${id}`, { method: "DELETE" });
                    if (!res.ok) throw new Error("Failed to delete");
                    await loadTransactions();
                    alert("Transaction deleted successfully");
                } catch (err) {
                    console.error(err);
                    alert("Error deleting transaction");
                }
            }
        };
    });
}

function populateFormForEdit(id) {
    const transaction = allTransactions.find(t => String(t.id) === String(id));
    if (!transaction) return;

    const form = document.getElementById("transactionForm");
    if (!form) return;

    for (const key in transaction) {
        if (form.elements[key]) {
            form.elements[key].value = transaction[key];
        }
    }

    form.dataset.editingId = id;
    form.scrollIntoView({ behavior: "smooth" });
}

function updateTableFooter(transactions, tfoot) {
    const totalQuantity = transactions.reduce((acc, t) => acc + (Number(t.Quantity) || 0), 0);
    const totalAmount = transactions.reduce((acc, t) => acc + ((Number(t.Quantity) || 0) * (Number(t["Price Per Unit"]) || 0)), 0);

    tfoot.innerHTML = `
    <tr class="bg-green-100 font-semibold">
      <td colspan="3" class="text-right px-4 py-3">Totals:</td>
      <td class="px-4 py-3">${totalQuantity}</td>
      <td></td>
      <td colspan="3"></td>
      <td class="px-4 py-3">Kes ${totalAmount.toFixed(2)}</td>
      <td></td>
    </tr>
  `;
}

function updateSummaryStats(transactions) {
    // You can expand this to update UI elements showing summary stats
    // Example: total transactions count, total amount spent, etc.
    const totalAmount = transactions.reduce((acc, t) => acc + ((Number(t.Quantity) || 0) * (Number(t["Price Per Unit"]) || 0)), 0);
    const totalCount = transactions.length;

    const statsEl = document.getElementById("summaryStats");
    if (statsEl) {
        statsEl.textContent = `Showing ${totalCount} transactions, Total Amount: Kes ${totalAmount.toFixed(2)}`;
    }
}

function renderCharts(transactions) {
    // Example: Pie chart for category distribution, Bar chart for monthly expenses

    // Clear old charts if any
    if (window.categoryChart && typeof window.categoryChart.destroy === 'function') {
        console.log('categoryChart before destroy:', window.categoryChart);
        window.categoryChart.destroy();
        window.categoryChart = undefined; // reset to avoid stale reference
    }

    if (window.monthlyChart && typeof window.monthlyChart.destroy === 'function') {
        console.log('categoryChart before destroy:', window.categoryChart);
        window.monthlyChart.destroy();
        window.monthlyChart = undefined;
    }


    // Category Pie Chart
    const categoryData = {};
    transactions.forEach(t => {
        const cat = t.Category || "Uncategorized";
        const amount = (Number(t.Quantity) || 0) * (Number(t["Price Per Unit"]) || 0);
        categoryData[cat] = (categoryData[cat] || 0) + amount;
    });

    const categoryCtx = document.getElementById("categoryChart")?.getContext("2d");
    if (categoryCtx) {
        window.categoryChart = new Chart(categoryCtx, {
            type: "pie",
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: generateColors(Object.keys(categoryData).length),
                }],
            },
            options: {
                responsive: true,
                plugins: { legend: { position: "bottom" } },
            },
        });
    }

    // Monthly Bar Chart
    const monthlyData = {};
    transactions.forEach(t => {
        if (!t.Date) return;
        const date = new Date(t.Date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const amount = (Number(t.Quantity) || 0) * (Number(t["Price Per Unit"]) || 0);
        monthlyData[key] = (monthlyData[key] || 0) + amount;
    });

    // Sort keys chronologically
    const sortedMonths = Object.keys(monthlyData).sort();

    const monthlyCtx = document.getElementById("monthlyChart")?.getContext("2d");
    if (monthlyCtx) {
        window.monthlyChart = new Chart(monthlyCtx, {
            type: "bar",
            data: {
                labels: sortedMonths,
                datasets: [{
                    label: "Monthly Expenses (Kes)",
                    data: sortedMonths.map(m => monthlyData[m]),
                    backgroundColor: "rgba(34,197,94,0.7)",
                }],
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true },
                },
                plugins: {
                    legend: { display: false },
                },
            },
        });
    }
}

function generateColors(num) {
    // Generate an array of distinct colors
    const colors = [];
    for (let i = 0; i < num; i++) {
        const hue = Math.round((360 / num) * i);
        colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return isNaN(date) ? "" : date.toLocaleDateString("en-KE", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}


function exportToCSV() {
    if (!filteredTransactions.length) {
        alert("No data to export.");
        return;
    }

    const csvRows = [];
    const headers = Object.keys(filteredTransactions[0]);
    csvRows.push(headers.join(","));

    filteredTransactions.forEach(t => {
        const row = headers.map(h => `"${(t[h] ?? "").toString().replace(/"/g, '""')}"`);
        csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${Date.now()}.csv`;
    a.click();

    URL.revokeObjectURL(url);
}

function exportToExcel() {
    if (!filteredTransactions.length) {
        alert("No data to export.");
        return;
    }
    if (typeof XLSX === "undefined") {
        alert("XLSX library not loaded.");
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(filteredTransactions);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, `transactions_${Date.now()}.xlsx`);
}

function exportToPDF() {
    if (!filteredTransactions.length) {
        alert("No data to export.");
        return;
    }
    if (typeof jsPDF === "undefined") {
        alert("jsPDF library not loaded.");
        return;
    }

    const doc = new jsPDF();
    const columns = Object.keys(filteredTransactions[0]);
    const rows = filteredTransactions.map(t => columns.map(c => t[c] ?? ""));

    doc.autoTable({
        head: [columns],
        body: rows,
        styles: { fontSize: 8 },
        theme: "striped",
    });

    doc.save(`transactions_${Date.now()}.pdf`);
}
