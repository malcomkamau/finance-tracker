// Elements
const form = document.getElementById('transactionForm');
const toastContainer = document.getElementById('toastContainer');
const tbody = document.querySelector('#transactionTable tbody');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const balanceEl = document.getElementById('balance');
const totalAmountEl = document.getElementById('totalAmount');

let transactions = [];

// Helper to format date nicely
function formatDate(dateStr) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString(undefined, options);
}

// Toast notification function
function showToast(message, type = 'success', duration = 3000) {
  const toast = document.createElement('div');
  toast.classList.add('toast');
  if (type === 'error') toast.classList.add('error');
  else if (type === 'loading') toast.classList.add('loading');

  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Remove toast on click
  toast.addEventListener('click', () => {
    toastContainer.removeChild(toast);
  });

  if (type !== 'loading') {
    setTimeout(() => {
      if (toastContainer.contains(toast)) {
        toast.classList.add('fade-out');
        toast.addEventListener('transitionend', () => {
          toastContainer.removeChild(toast);
        });
      }
    }, duration);
  }

  return toast;
}

// Render transactions in table
function renderTransactions() {
  tbody.innerHTML = '';
  transactions.forEach(({ description, amount, type, date }) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${description}</td>
      <td>${amount.toFixed(2)}</td>
      <td>${type}</td>
      <td>${formatDate(date)}</td>
    `;
    tbody.appendChild(tr);
  });
  updateTotals();
}

// Update totals and balance
function updateTotals() {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach(({ amount, type }) => {
    if (type === 'income') totalIncome += amount;
    else totalExpense += amount;
  });

  totalIncomeEl.textContent = totalIncome.toFixed(2);
  totalExpenseEl.textContent = totalExpense.toFixed(2);
  const balance = totalIncome - totalExpense;
  balanceEl.textContent = balance.toFixed(2);
  totalAmountEl.textContent = (totalIncome + totalExpense).toFixed(2);
}

// Form submission handler
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const description = form.description.value.trim();
  const amount = parseFloat(form.amount.value);
  const type = form.type.value;
  const date = form.date.value;

  // Basic validation
  if (!description || isNaN(amount) || !type || !date) {
    showToast('Please fill in all fields correctly.', 'error');
    return;
  }

  // Show loading toast
  const loadingToast = showToast('Adding transaction...', 'loading', 0);

  // Simulate async operation (e.g., saving data)
  setTimeout(() => {
    transactions.push({ description, amount, type, date });
    renderTransactions();

    // Remove loading toast
    if (loadingToast && loadingToast.parentNode) {
      toastContainer.removeChild(loadingToast);
    }

    showToast('Transaction added successfully!', 'success');

    // Reset form
    form.reset();
  }, 1000);
});

// Initial render
renderTransactions();
