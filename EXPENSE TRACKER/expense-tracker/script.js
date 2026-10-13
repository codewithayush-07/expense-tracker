
const STORAGE_KEY = "expenseTrackerTransactions";
const THEME_KEY = "expenseTrackerDarkMode";

const categories = {
    income: ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"],
    expense: ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Education", "Travel", "Other"]
};

const categoryColors = {
    Food: "#f59e0b",
    Transport: "#3b82f6",
    Shopping: "#10b981",
    Bills: "#8b5cf6",
    Entertainment: "#f43f5e",
    Health: "#06b6d4",
    Education: "#a855f7",
    Travel: "#ec4899",
    Salary: "#10b981",
    Freelance: "#0ea5e9",
    Business: "#6366f1",
    Investment: "#14b8a6",
    Gift: "#f97316",
    Other: "#94a3b8"
};

const $ = (selector) => document.querySelector(selector);

const form = $("#transactionForm");
const amountInput = $("#amount");
const categoryInput = $("#category");
const dateInput = $("#date");
const descriptionInput = $("#description");
const editIdInput = $("#editId");
const submitBtn = $("#submitBtn");
const cancelEditBtn = $("#cancelEdit");
const formTitle = $("#formTitle");
const formMessage = $("#formMessage");
const transactionList = $("#transactionList");

let transactions = loadTransactions();

// ---------- Date and currency helpers ----------

function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatShortCurrency(amount) {
    if (amount >= 10000000) {
        return "₹" + (amount / 10000000).toFixed(1) + "Cr";
    }

    if (amount >= 100000) {
        return "₹" + (amount / 100000).toFixed(1) + "L";
    }

    if (amount >= 1000) {
        return "₹" + (amount / 1000).toFixed(1) + "k";
    }

    return "₹" + Math.round(amount);
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);

    return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function getSelectedType() {
    return document.querySelector('input[name="type"]:checked').value;
}

// ---------- Local Storage ----------

function loadTransactions() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(parsed)) return [];

        return parsed.filter((item) =>
            item &&
            typeof item.id === "string" &&
            ["income", "expense"].includes(item.type) &&
            Number.isFinite(item.amount) &&
            item.amount > 0 &&
            typeof item.category === "string" &&
            typeof item.description === "string" &&
            typeof item.date === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(item.date)
        );
    } catch (error) {
        console.error("Could not load saved transactions:", error);
        return [];
    }
}

function saveTransactions() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        return true;
    } catch (error) {
        console.error("Could not save transactions:", error);
        showMessage("Unable to save data. Check your browser storage.", true);
        return false;
    }
}

// ---------- Category dropdowns ----------

function populateCategories() {
    const type = getSelectedType();
    const previousCategory = categoryInput.value;

    categoryInput.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select category";
    categoryInput.appendChild(placeholder);

    categories[type].forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryInput.appendChild(option);
    });

    if (categories[type].includes(previousCategory)) {
        categoryInput.value = previousCategory;
    }
}

function populateCategoryFilter() {
    const select = $("#categoryFilter");
    const selected = select.value;

    select.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All categories";
    select.appendChild(allOption);

    const allCategories = [...new Set(
        transactions.map((transaction) => transaction.category)
    )].sort();

    allCategories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });

    select.value = allCategories.includes(selected) ? selected : "all";
}

// ---------- Form messages ----------

function showMessage(message, isError = false) {
    formMessage.textContent = message;
    formMessage.classList.toggle("error", isError);
}

function resetForm() {
    form.reset();
    editIdInput.value = "";
    dateInput.value = getToday();

    document.querySelector('input[name="type"][value="income"]').checked = true;

    populateCategories();

    formTitle.textContent = "Add New Transaction";
    submitBtn.textContent = "＋ Add Transaction";
    cancelEditBtn.classList.add("hidden");

    showMessage("");
}

// ---------- Add and edit transactions ----------

document.querySelectorAll('input[name="type"]').forEach((radio) => {
    radio.addEventListener("change", populateCategories);
});

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const amount = Number(amountInput.value);
    const category = categoryInput.value;
    const date = dateInput.value;
    const description = descriptionInput.value.trim();
    const type = getSelectedType();
    const editingId = editIdInput.value;

    if (!Number.isFinite(amount) || amount <= 0) {
        showMessage("Enter an amount greater than zero.", true);
        return;
    }

    if (!category || !categories[type].includes(category)) {
        showMessage("Please select a valid category.", true);
        return;
    }

    if (!date || !description) {
        showMessage("Please complete all required fields.", true);
        return;
    }

    // Prevent unsafe or accidental unrealistic input values.
    if (amount > 1000000000000) {
        showMessage("Please enter a smaller amount.", true);
        return;
    }

    const transaction = {
        id: editingId || (
            window.crypto && typeof window.crypto.randomUUID === "function"
                ? window.crypto.randomUUID()
                : Date.now().toString() + Math.random().toString(36).slice(2)
        ),
        type,
        amount,
        category,
        date,
        description
    };

    const previousTransactions = [...transactions];

    if (editingId) {
        const index = transactions.findIndex((item) => item.id === editingId);

        if (index === -1) {
            showMessage("Transaction not found. Please try again.", true);
            resetForm();
            return;
        }

        transactions[index] = transaction;
    } else {
        transactions.push(transaction);
    }

    if (!saveTransactions()) {
        transactions = previousTransactions;
        return;
    }

    const message = editingId
        ? "Transaction updated successfully!"
        : "Transaction added successfully!";

    resetForm();
    showMessage(message);

    renderApp();
});

// ---------- Edit transactions ----------

function editTransaction(id) {
    const transaction = transactions.find((item) => item.id === id);

    if (!transaction) return;

    editIdInput.value = transaction.id;
    amountInput.value = transaction.amount;
    descriptionInput.value = transaction.description;
    dateInput.value = transaction.date;

    document.querySelector(
        `input[name="type"][value="${transaction.type}"]`
    ).checked = true;

    populateCategories();
    categoryInput.value = transaction.category;

    formTitle.textContent = "Edit Transaction";
    submitBtn.textContent = "Save Changes";
    cancelEditBtn.classList.remove("hidden");

    showMessage("");
    $("#add-transaction").scrollIntoView({ behavior: "smooth" });
}

cancelEditBtn.addEventListener("click", resetForm);

// ---------- Delete transactions ----------

function deleteTransaction(id) {
    const transaction = transactions.find((item) => item.id === id);

    if (!transaction) return;

    const confirmed = window.confirm(
        `Delete "${transaction.description}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    const previousTransactions = [...transactions];

    transactions = transactions.filter((item) => item.id !== id);

    if (!saveTransactions()) {
        transactions = previousTransactions;
        return;
    }

    if (editIdInput.value === id) {
        resetForm();
    }

    renderApp();
}

// ---------- Transaction history and filtering ----------

function getFilteredTransactions() {
    const search = $("#searchInput").value.trim().toLowerCase();
    const typeFilter = $("#typeFilter").value;
    const categoryFilter = $("#categoryFilter").value;

    return transactions
        .filter((transaction) => {
            const matchesSearch =
                transaction.description.toLowerCase().includes(search) ||
                transaction.category.toLowerCase().includes(search);

            const matchesType =
                typeFilter === "all" || transaction.type === typeFilter;

            const matchesCategory =
                categoryFilter === "all" ||
                transaction.category === categoryFilter;

            return matchesSearch && matchesType && matchesCategory;
        })
        .sort((a, b) => {
            const dateComparison = b.date.localeCompare(a.date);

            if (dateComparison !== 0) return dateComparison;

            return b.id.localeCompare(a.id);
        });
}

function renderTransactions() {
    const filtered = getFilteredTransactions();

    transactionList.replaceChildren();
    $("#emptyMessage").classList.toggle("hidden", filtered.length > 0);

    filtered.forEach((transaction) => {
        const row = document.createElement("tr");

        const dateCell = document.createElement("td");
        dateCell.textContent = formatDate(transaction.date);

        const descriptionCell = document.createElement("td");
        descriptionCell.textContent = transaction.description;

        const categoryCell = document.createElement("td");
        const categoryBadge = document.createElement("span");
        categoryBadge.className = "category-pill";
        categoryBadge.textContent = transaction.category;
        categoryBadge.style.color = categoryColors[transaction.category] || "#64748b";
        categoryCell.appendChild(categoryBadge);

        const typeCell = document.createElement("td");
        const typeBadge = document.createElement("span");
        typeBadge.className = `type-pill ${transaction.type}`;
        typeBadge.textContent = transaction.type === "income" ? "Income" : "Expense";
        typeCell.appendChild(typeBadge);

        const amountCell = document.createElement("td");
        amountCell.className = transaction.type === "income"
            ? "amount-income"
            : "amount-expense";

        const sign = transaction.type === "income" ? "+" : "−";
        amountCell.textContent = sign + formatCurrency(transaction.amount);

        const actionsCell = document.createElement("td");
        const actionGroup = document.createElement("div");
        actionGroup.className = "action-group";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "action-btn";
        editButton.textContent = "✎";
        editButton.title = "Edit transaction";
        editButton.setAttribute("aria-label", "Edit " + transaction.description);
        editButton.addEventListener("click", () => editTransaction(transaction.id));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "action-btn delete-btn";
        deleteButton.textContent = "×";
        deleteButton.title = "Delete transaction";
        deleteButton.setAttribute("aria-label", "Delete " + transaction.description);
        deleteButton.addEventListener("click", () => deleteTransaction(transaction.id));

        actionGroup.append(editButton, deleteButton);
        actionsCell.appendChild(actionGroup);

        row.append(
            dateCell,
            descriptionCell,
            categoryCell,
            typeCell,
            amountCell,
            actionsCell
        );

        transactionList.appendChild(row);
    });

    $("#resultCount").textContent =
        `${filtered.length} transaction${filtered.length === 1 ? "" : "s"}`;
}

// ---------- Financial summary ----------

function getMonthTransactions() {
    const currentMonth = getToday().slice(0, 7);

    return transactions.filter((transaction) =>
        transaction.date.slice(0, 7) === currentMonth
    );
}

function renderSummary() {
    const income = transactions
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0);

    const expenses = transactions
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);

    const balance = income - expenses;

    $("#totalIncome").textContent = formatCurrency(income);
    $("#totalExpenses").textContent = formatCurrency(expenses);
    $("#currentBalance").textContent = formatCurrency(balance);
    $("#totalTransactions").textContent = transactions.length;

    $("#currentMonth").textContent = new Date().toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric"
    });
}

// ---------- Category spending chart ----------

function renderChart() {
    const monthTransactions = getMonthTransactions();

    const expenses = monthTransactions.filter(
        (item) => item.type === "expense"
    );

    const totals = {};

    expenses.forEach((item) => {
        totals[item.category] = (totals[item.category] || 0) + item.amount;
    });

    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const total = expenses.reduce((sum, item) => sum + item.amount, 0);

    $("#chartTotal").textContent = formatShortCurrency(total);

    const chart = $("#expenseChart");
    const legend = $("#categoryLegend");

    legend.replaceChildren();

    if (total === 0) {
        chart.style.background = "conic-gradient(var(--border) 0deg 360deg)";
        const message = document.createElement("p");
        message.className = "muted";
        message.textContent = "No expenses this month.";
        legend.appendChild(message);
        return;
    }

    let currentAngle = 0;
    const gradientParts = [];

    entries.forEach(([category, amount]) => {
        const degrees = (amount / total) * 360;
        const color = categoryColors[category] || "#94a3b8";

        gradientParts.push(
            `${color} ${currentAngle}deg ${currentAngle + degrees}deg`
        );

        currentAngle += degrees;

        const row = document.createElement("div");
        row.className = "legend-row";

        const dot = document.createElement("span");
        dot.className = "legend-dot";
        dot.style.background = color;

        const name = document.createElement("span");
        name.className = "legend-name";
        name.textContent = category;

        const value = document.createElement("span");
        value.className = "legend-value";
        value.textContent = formatCurrency(amount);

        row.append(dot, name, value);
        legend.appendChild(row);
    });

    chart.style.background = `conic-gradient(${gradientParts.join(", ")})`;
}

// ---------- Financial insights ----------

function renderInsights() {
    const monthTransactions = getMonthTransactions();

    const income = monthTransactions
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0);

    const expenses = monthTransactions
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);

    const percent = income > 0
        ? Math.round((expenses / income) * 100)
        : 0;

    $("#spendingPercent").textContent = `${percent}%`;
    $("#spendingProgress").style.width = `${Math.min(percent, 100)}%`;

    const insight = $("#financialInsight");

    if (monthTransactions.length === 0) {
        insight.textContent =
            "Add transactions to receive useful financial insights.";
        return;
    }

    if (income === 0 && expenses > 0) {
        insight.textContent =
            `You recorded ${formatCurrency(expenses)} in expenses this month, but no income. Add your income to get a clearer picture of your finances.`;
        return;
    }

    if (expenses === 0 && income > 0) {
        insight.textContent =
            `Great start! You recorded ${formatCurrency(income)} in income and no expenses this month. Keep tracking your spending.`;
        return;
    }

    const highestCategory = Object.entries(
        monthTransactions
            .filter((item) => item.type === "expense")
            .reduce((result, item) => {
                result[item.category] =
                    (result[item.category] || 0) + item.amount;
                return result;
            }, {})
    ).sort((a, b) => b[1] - a[1])[0];

    let message = "";

    if (expenses > income) {
        message = `You spent ${formatCurrency(expenses - income)} more than your recorded income this month. Review your expenses to help manage your balance.`;
    } else if (percent > 80) {
        message = `You have spent ${percent}% of your recorded income this month. Consider reviewing non-essential expenses.`;
    } else {
        message = `You have ${formatCurrency(income - expenses)} remaining from this month's recorded income. Keep tracking your spending.`;
    }

    if (highestCategory) {
        const categoryShare = Math.round((highestCategory[1] / expenses) * 100);
        message += ` Your highest spending category is ${highestCategory[0]} (${categoryShare}% of expenses).`;
    }

    insight.textContent = message;
}

// ---------- Render everything ----------

function renderApp() {
    renderSummary();
    populateCategoryFilter();
    renderTransactions();
    renderChart();
    renderInsights();
}

// ---------- Filters ----------

$("#searchInput").addEventListener("input", renderTransactions);
$("#typeFilter").addEventListener("change", renderTransactions);
$("#categoryFilter").addEventListener("change", renderTransactions);

$("#clearFilters").addEventListener("click", () => {
    $("#searchInput").value = "";
    $("#typeFilter").value = "all";
    $("#categoryFilter").value = "all";
    renderTransactions();
});

// ---------- Dark mode ----------

function applyTheme(isDark) {
    document.body.classList.toggle("dark", isDark);
    $("#themeToggle").textContent = isDark ? "☀️" : "🌙";
    $("#themeToggle").setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
    );
}

try {
    applyTheme(localStorage.getItem(THEME_KEY) === "true");
} catch {
    applyTheme(false);
}

$("#themeToggle").addEventListener("click", () => {
    const isDark = !document.body.classList.contains("dark");
    applyTheme(isDark);

    try {
        localStorage.setItem(THEME_KEY, String(isDark));
    } catch (error) {
        console.error("Could not save theme preference:", error);
    }
});

// ---------- Initialize application ----------

dateInput.value = getToday();
populateCategories();
renderApp();
