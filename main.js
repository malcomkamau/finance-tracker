const BASE_URL = "https://finance-tracker-97jz.onrender.com";

// Submit form
document.getElementById("transactionForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    data["Quantity"] = parseFloat(data["Quantity"]);
    data["Price Per Unit"] = parseFloat(data["Price Per Unit"]);

    await fetch(`${BASE_URL}/api/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    form.reset();
    loadTransactions();
});

let fullData = []; // Global data
let filteredData = []; // Filtered data

async function loadTransactions() {
    try {
        const res = await fetch(`${BASE_URL}/api/data`);
        const data = await res.json();

        fullData = data;
        filteredData = data;

        populateCategoryFilter(data);
        populatePaymentMethodFilter(data);
        displayTable(data);
        updateCharts(data);
    } catch (err) {
        console.error("Failed to fetch data:", err);
    }
}

function displayTable(data) {
    const thead = document.querySelector("#transactionTable thead");
    const tbody = document.querySelector("#transactionTable tbody");
    const tfoot = document.querySelector("#transactionTable tfoot");
    thead.innerHTML = "";
    tbody.innerHTML = "";
    tfoot.innerHTML = "";

    if (data.length === 0) return;

    // Add a 'Total' column header at the end
    const keys = Object.keys(data[0]);
    const headerRow = document.createElement("tr");
    keys.forEach((key) => {
        const th = document.createElement("th");
        th.textContent = key;
        headerRow.appendChild(th);
    });
    const totalHeader = document.createElement("th");
    totalHeader.textContent = "Total";
    headerRow.appendChild(totalHeader);
    thead.appendChild(headerRow);

    let totalQuantity = 0;
    let totalAmount = 0;

    data.forEach((row) => {
        const tr = document.createElement("tr");

        keys.forEach((key) => {
            const td = document.createElement("td");
            let value = row[key];
            // Format date nicely: YYYY-MM-DD to MMM DD, YYYY
            if (key === "Date" && value) {
                const d = new Date(value);
                value = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
            }
            td.textContent = value ?? "";
            tr.appendChild(td);
        });

        // Add Total = Quantity * Price Per Unit
        const total = (parseFloat(row["Quantity"]) || 0) * (parseFloat(row["Price Per Unit"]) || 0);
        const totalTd = document.createElement("td");
        totalTd.textContent = total.toFixed(2);
        tr.appendChild(totalTd);

        tbody.appendChild(tr);

        totalQuantity += parseFloat(row["Quantity"]) || 0;
        totalAmount += total;
    });

    // Footer with totals
    const totalRow = document.createElement("tr");
    keys.forEach((key) => {
        const td = document.createElement("td");
        if (key === "Quantity") {
            td.textContent = totalQuantity.toFixed(2);
        } else if (key === "Price Per Unit") {
            td.textContent = "";
        } else {
            td.textContent = "";
        }
        totalRow.appendChild(td);
    });
    // Total footer cell for "Total" column
    const totalFooterTd = document.createElement("td");
    totalFooterTd.textContent = totalAmount.toFixed(2);
    totalRow.appendChild(totalFooterTd);

    tfoot.appendChild(totalRow);
}

function applyFilters() {
    const searchText = document.getElementById("searchText").value.toLowerCase();
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    const category = document.getElementById("categoryFilter").value;
    const paymentMethod = document.getElementById("paymentMethodFilter").value;

    filteredData = fullData.filter((tx) => {
        const date = tx.Date || "";
        const item = tx["Item Name"]?.toLowerCase() || "";
        const vendor = tx["Vendor"]?.toLowerCase() || "";
        const cat = tx["Category"]?.toLowerCase() || "";
        const payMethod = tx["Payment Method"]?.toLowerCase() || "";

        const matchesSearch =
            item.includes(searchText) ||
            vendor.includes(searchText) ||
            cat.includes(searchText);

        const matchesCategory = !category || tx["Category"] === category;
        const matchesPaymentMethod = !paymentMethod || tx["Payment Method"] === paymentMethod;
        const matchesStart = !startDate || date >= startDate;
        const matchesEnd = !endDate || date <= endDate;

        return matchesSearch && matchesCategory && matchesPaymentMethod && matchesStart && matchesEnd;
    });

    displayTable(filteredData);
    updateCharts(filteredData);
}

function resetFilters() {
    document.getElementById("searchText").value = "";
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    document.getElementById("categoryFilter").value = "";
    document.getElementById("paymentMethodFilter").value = "";
    filteredData = fullData;
    displayTable(fullData);
    updateCharts(fullData);
}

function populateCategoryFilter(data) {
    const select = document.getElementById("categoryFilter");
    const categories = [...new Set(data.map((tx) => tx.Category))];
    select.innerHTML = '<option value="">All Categories</option>';
    categories.forEach((cat) => {
        if (cat) {
            const option = document.createElement("option");
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        }
    });
}

function populatePaymentMethodFilter(data) {
    const select = document.getElementById("paymentMethodFilter");
    const methods = [...new Set(data.map((tx) => tx["Payment Method"]))];
    select.innerHTML = '<option value="">All Payment Methods</option>';
    methods.forEach((method) => {
        if (method) {
            const option = document.createElement("option");
            option.value = method;
            option.textContent = method;
            select.appendChild(option);
        }
    });
}

let categoryChart, timeChart;

function updateCharts(data) {
    // Group by category for spending
    const categoryTotals = {};
    data.forEach((tx) => {
        const cat = tx.Category || "Uncategorized";
        const total = (parseFloat(tx["Quantity"]) || 0) * (parseFloat(tx["Price Per Unit"]) || 0);
        categoryTotals[cat] = (categoryTotals[cat] || 0) + total;
    });

    // Prepare data for category chart
    const categoryLabels = Object.keys(categoryTotals);
    const categoryData = categoryLabels.map((cat) => categoryTotals[cat]);

    if (categoryChart) categoryChart.destroy();
    const ctxCategory = document.getElementById("categoryChart").getContext("2d");
    categoryChart = new Chart(ctxCategory, {
        type: "pie",
        data: {
            labels: categoryLabels,
            datasets: [{
                data: categoryData,
                backgroundColor: categoryLabels.map(() => getRandomColor()),
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "bottom" },
                title: {
                    display: true,
                    text: "Spending by Category",
                },
            },
        },
    });

    // Group spending over time (monthly)
    const monthlyTotals = {};
    data.forEach((tx) => {
        let date = tx.Date;
        if (!date) return;
        const ym = date.slice(0, 7); // "YYYY-MM"
        const total = (parseFloat(tx["Quantity"]) || 0) * (parseFloat(tx["Price Per Unit"]) || 0);
        monthlyTotals[ym] = (monthlyTotals[ym] || 0) + total;
    });

    const timeLabels = Object.keys(monthlyTotals).sort();
    const timeData = timeLabels.map((m) => monthlyTotals[m]);

    if (timeChart) timeChart.destroy();
    const ctxTime = document.getElementById("timeChart").getContext("2d");
    timeChart = new Chart(ctxTime, {
        type: "line",
        data: {
            labels: timeLabels,
            datasets: [{
                label: "Total Spending",
                data: timeData,
                fill: false,
                borderColor: "blue",
                tension: 0.1,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
                title: { display: true, text: "Spending Over Time (Monthly)" },
            },
            scales: {
                x: { title: { display: true, text: "Month" } },
                y: { title: { display: true, text: "Amount ($)" }, beginAtZero: true },
            },
        },
    });
}

function getRandomColor() {
    const r = Math.floor(150 + Math.random() * 105);
    const g = Math.floor(150 + Math.random() * 105);
    const b = Math.floor(150 + Math.random() * 105);
    return `rgb(${r},${g},${b})`;
}

// Export CSV
function exportToCSV() {
    const dataToExport = document.getElementById("exportFiltered").checked ? filteredData : fullData;
    if (!dataToExport.length) {
        alert("No data to export!");
        return;
    }

    const keys = Object.keys(dataToExport[0]);
    const rows = dataToExport.map((row) =>
        keys.map((k) => `"${(row[k] ?? "").toString().replace(/"/g, '""')}"`).join(",")
    );

    const csvContent = [keys.join(","), ...rows].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "finance_data.csv";
    a.click();
    URL.revokeObjectURL(url);
}

// Export Excel
function exportToExcel() {
    const dataToExport = document.getElementById("exportFiltered").checked ? filteredData : fullData;
    if (!dataToExport.length) {
        alert("No data to export!");
        return;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "FinanceData");

    XLSX.writeFile(wb, "finance_data.xlsx");
}

// Export PDF with charts and table
async function exportToPDF() {
    const dataToExport = document.getElementById("exportFiltered").checked ? filteredData : fullData;
    if (!dataToExport.length) {
        alert("No data to export!");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.text("Finance Tracker Report", pageWidth / 2, 40, { align: "center" });

    // Add charts
    // We will convert canvas to image and embed

    const addChartImage = (canvasId, yPosition, title) => {
        const canvas = document.getElementById(canvasId);
        const imgData = canvas.toDataURL("image/png");
        doc.setFontSize(14);
        doc.text(title, 40, yPosition - 10);
        doc.addImage(imgData, "PNG", 40, yPosition, pageWidth - 80, 150);
        return yPosition + 160;
    };

    let y = 60;
    y = addChartImage("categoryChart", y, "Spending by Category");
    y = addChartImage("timeChart", y, "Spending Over Time");

    // Add table (only key columns and total)
    const keys = Object.keys(dataToExport[0]);
    const headers = [...keys, "Total"];

    // Prepare body rows
    const body = dataToExport.map((row) => {
        const total = (parseFloat(row["Quantity"]) || 0) * (parseFloat(row["Price Per Unit"]) || 0);
        return [...keys.map((k) => row[k] ?? ""), total.toFixed(2)];
    });

    // AutoTable
    doc.autoTable({
        head: [headers],
        body,
        startY: y + 20,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [220, 220, 220] },
        theme: "striped",
        margin: { left: 20, right: 20 },
        didDrawPage: (data) => {
            if (data.pageNumber > 1) {
                doc.setFontSize(10);
                doc.text(`Page ${data.pageNumber}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, {
                    align: "center",
                });
            }
        },
    });

    doc.save("finance_report.pdf");
}

// Load data on page load
loadTransactions();