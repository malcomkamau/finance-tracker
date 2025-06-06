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
                const editingId = form.dataset.editingId;
                const res = await fetch(`${BASE_URL}/api/${editingId ? "transaction/" + editingId : "submit"}`, {
                    method: editingId ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newTransaction),
                });

                if (!res.ok) throw new Error(`Failed to ${editingId ? "update" : "submit"}: ${res.statusText}`);

                form.reset();
                delete form.dataset.editingId; // Clear edit mode
                await loadTransactions();
                alert(`Transaction ${editingId ? "updated" : "added"} successfully!`);
            } catch (err) {
                console.error(err);
                alert(`Error ${form.dataset.editingId ? "updating" : "adding"} transaction. Please try again.`);
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

    // Attach event listeners after rendering
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.onclick = e => {
            const id = e.currentTarget.getAttribute("data-id");
            handleEditTransaction(id);
        };
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.onclick = e => {
            const id = e.currentTarget.getAttribute("data-id");
            handleDeleteTransaction(id);
        };
    });
}

// Helper functions (add these below or in your JS file)
function handleEditTransaction(id) {
    const transaction = transactions.find(t => String(t.id) === String(id));
    if (!transaction) {
        alert("Transaction not found");
        return;
    }
    const newName = prompt("Edit Item Name:", transaction["Item Name"]);
    if (newName !== null) {
        transaction["Item Name"] = newName.trim();
        renderTransactionsTable(transactions);
    }
}

function handleDeleteTransaction(id) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    transactions = transactions.filter(t => String(t.id) !== String(id));
    renderTransactionsTable(transactions);
}


// Attach Edit/Delete button listeners after rendering table rows
tbody.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const transaction = allTransactions.find(t => t.id == id);
        if (transaction) {
            // Fill the form for editing
            const form = document.getElementById("transactionForm");
            if (form) {
                for (const key in transaction) {
                    if (form.elements[key]) {
                        form.elements[key].value = transaction[key];
                    }
                }
                form.dataset.editingId = id; // mark as editing
            }
        }
    });
});

tbody.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
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
    });
});

// Update totals footer
const totalQuantity = transactions.reduce((acc, t) => acc + (t.Quantity || 0), 0);
const totalAmount = transactions.reduce((acc, t) => acc + ((t.Quantity || 0) * (t["Price Per Unit"] || 0)), 0);

tfoot.innerHTML = `
      <tr class="bg-green-100 font-semibold">
        <td colspan="3" class="px-4 py-3 text-right">Totals:</td>
        <td class="px-4 py-3">${totalQuantity}</td>
        <td></td>
        <td colspan="3"></td>
        <td class="px-4 py-3">Kes ${totalAmount.toFixed(2)}</td>
        <td></td>
      </tr>
    `;


function formatDate(dateString) {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d)) return dateString;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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
    const timeLabels = Object.keys(timeData).sort((a, b) => new Date(a) - new Date(b));
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

function createActionButtons(id, transaction) {
    const actionCell = document.createElement("td");

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.classList.add("edit-btn");
    editBtn.dataset.id = id;
    editBtn.addEventListener("click", () => populateFormForEdit(transaction, id));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.classList.add("delete-btn");
    deleteBtn.dataset.id = id;
    deleteBtn.addEventListener("click", () => handleDeleteTransaction(id));

    actionCell.appendChild(editBtn);
    actionCell.appendChild(deleteBtn);

    return actionCell;
}
