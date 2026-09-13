/* =========================================================
   EXPENSE TRACKER
   Excel-based personal accounting / bank reconciliation
========================================================= */


/* =========================================================
   DATA
========================================================= */

let db = {
    ledgers: [],
    transactions: [],
    daily: []
};

let currentDate = today();


/* =========================================================
   STARTUP
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("selectedDate").value = currentDate;

    document.getElementById("txDate").value = currentDate;

    document
        .getElementById("fileInput")
        .addEventListener("change", importExcel);

    loadLocal();

    renderAll();

});


/* =========================================================
   BASIC HELPERS
========================================================= */

function today() {

    const d = new Date();

    return d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0");
}


function money(value) {

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2
    }).format(Number(value) || 0);

}


function id() {

    return crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) +
          Math.random().toString(36).slice(2);

}


function saveLocal() {

    localStorage.setItem(
        "expenseTrackerDB",
        JSON.stringify(db)
    );

}


function loadLocal() {

    const saved = localStorage.getItem(
        "expenseTrackerDB"
    );

    if (!saved) return;

    try {

        db = JSON.parse(saved);

    } catch {

        console.log("Could not load saved data.");

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function showPage(pageId, button) {

    document
        .querySelectorAll(".page")
        .forEach(page =>
            page.classList.remove("active-page")
        );

    document
        .getElementById(pageId)
        .classList.add("active-page");

    document
        .querySelectorAll(".tab")
        .forEach(tab =>
            tab.classList.remove("active")
        );

    button.classList.add("active");

    renderAll();

}


/* =========================================================
   FILE IMPORT
========================================================= */

function openFile() {

    document
        .getElementById("fileInput")
        .click();

}


async function importExcel(event) {

    const file = event.target.files[0];

    if (!file) return;

    try {

        const buffer = await file.arrayBuffer();

        const workbook = XLSX.read(buffer, {
            type: "array"
        });

        const imported = {
            ledgers: [],
            transactions: [],
            daily: []
        };


        /* -------------------------
           LEDGERS
        ------------------------- */

        if (workbook.SheetNames.includes("Ledgers")) {

            const sheet =
                workbook.Sheets["Ledgers"];

            const rows =
                XLSX.utils.sheet_to_json(sheet);

            imported.ledgers = rows.map(row => ({
                id: row.ID || id(),
                name: row.Ledger || "",
                type: row.Type || "Expense",
                opening: Number(row["Opening Balance"] || 0)
            }));

        }


        /* -------------------------
           TRANSACTIONS
        ------------------------- */

        if (workbook.SheetNames.includes("Transactions")) {

            const sheet =
                workbook.Sheets["Transactions"];

            const rows =
                XLSX.utils.sheet_to_json(sheet);

            imported.transactions =
                rows.map(row => ({
                    id: row.ID || id(),
                    date: normalizeDate(row.Date),
                    ledger: row.Ledger || "",
                    description: row.Description || "",
                    debit: Number(row.Debit || 0),
                    credit: Number(row.Credit || 0)
                }));

        }


        /* -------------------------
           DAILY
        ------------------------- */

        if (workbook.SheetNames.includes("Daily")) {

            const sheet =
                workbook.Sheets["Daily"];

            const rows =
                XLSX.utils.sheet_to_json(sheet);

            imported.daily =
                rows.map(row => ({
                    date: normalizeDate(row.Date),
                    actualClosing:
                        Number(row["Actual Closing"] || 0)
                }));

        }


        db = imported;

        saveLocal();

        document.getElementById("fileStatus")
            .textContent = file.name;

        renderAll();

        alert("Excel loaded successfully.");

    } catch (error) {

        console.error(error);

        alert(
            "Could not read this Excel file."
        );

    }

}


function normalizeDate(value) {

    if (!value) return today();

    if (typeof value === "string") {

        if (value.includes("T")) {
            return value.split("T")[0];
        }

        return value;
    }

    if (value instanceof Date) {

        return value.toISOString().split("T")[0];

    }

    return today();

}


/* =========================================================
   EXPORT EXCEL
========================================================= */

function exportExcel() {

    const workbook = XLSX.utils.book_new();


    /* -------------------------
       LEDGERS
    ------------------------- */

    const ledgerRows = db.ledgers.map(l => ({
        ID: l.id,
        Ledger: l.name,
        Type: l.type,
        "Opening Balance": l.opening
    }));


    const ledgerSheet =
        XLSX.utils.json_to_sheet(ledgerRows);

    XLSX.utils.book_append_sheet(
        workbook,
        ledgerSheet,
        "Ledgers"
    );


    /* -------------------------
       TRANSACTIONS
    ------------------------- */

    const transactionRows =
        db.transactions.map(t => ({
            ID: t.id,
            Date: t.date,
            Ledger: t.ledger,
            Description: t.description,
            Debit: t.debit,
            Credit: t.credit
        }));


    const transactionSheet =
        XLSX.utils.json_to_sheet(transactionRows);

    XLSX.utils.book_append_sheet(
        workbook,
        transactionSheet,
        "Transactions"
    );


    /* -------------------------
       DAILY
    ------------------------- */

    const dates = getAllDates();

    const dailyRows = dates.map(date => {

        const calc = calculateDay(date);

        return {
            Date: date,
            "Opening Balance": calc.opening,
            Receipts: calc.receipts,
            Payments: calc.payments,
            "Expected Closing": calc.expected,
            "Actual Closing":
                calc.actual === null
                    ? ""
                    : calc.actual,
            Difference:
                calc.actual === null
                    ? ""
                    : calc.difference,
            Status:
                calc.actual === null
                    ? "Pending"
                    : Math.abs(calc.difference) < 0.01
                        ? "Reconciled"
                        : "Difference"
        };

    });


    const dailySheet =
        XLSX.utils.json_to_sheet(dailyRows);

    XLSX.utils.book_append_sheet(
        workbook,
        dailySheet,
        "Daily"
    );


    /* -------------------------
       DOWNLOAD
    ------------------------- */

    XLSX.writeFile(
        workbook,
        "Expense_Tracker.xlsx",
        {
            compression: true
        }
    );

}


/* =========================================================
   LEDGERS
========================================================= */

function openLedgerModal() {

    document
        .getElementById("ledgerModal")
        .classList.add("show");

}


function saveLedger() {

    const name =
        document
            .getElementById("ledgerName")
            .value
            .trim();

    const type =
        document
            .getElementById("ledgerType")
            .value;

    const opening =
        Number(
            document
                .getElementById("ledgerOpening")
                .value
        ) || 0;


    if (!name) {

        alert("Enter a ledger name.");

        return;

    }


    const exists =
        db.ledgers.some(
            l =>
                l.name.toLowerCase() ===
                name.toLowerCase()
        );


    if (exists) {

        alert("This ledger already exists.");

        return;

    }


    db.ledgers.push({
        id: id(),
        name,
        type,
        opening
    });


    saveLocal();

    closeModal("ledgerModal");

    document
        .getElementById("ledgerName")
        .value = "";

    renderAll();

}


function renderLedgers() {

    const grid =
        document.getElementById("ledgerGrid");

    if (!db.ledgers.length) {

        grid.innerHTML =
            `<div class="empty">
                No ledgers yet.
             </div>`;

        return;
    }


    grid.innerHTML =
        db.ledgers.map(l => {

            return `
                <div class="ledger">

                    <div class="ledger-name">
                        ${escapeHtml(l.name)}
                    </div>

                    <div class="ledger-type">
                        ${escapeHtml(l.type)}
                    </div>

                    <div class="ledger-opening">
                        ${money(l.opening)}
                    </div>

                </div>
            `;

        }).join("");

}


/* =========================================================
   TRANSACTIONS
========================================================= */

function openTransactionModal() {

    populateLedgerSelect();

    document
        .getElementById("txDate")
        .value = currentDate;

    document
        .getElementById("txDescription")
        .value = "";

    document
        .getElementById("txDebit")
        .value = "";

    document
        .getElementById("txCredit")
        .value = "";

    document
        .getElementById("transactionModal")
        .classList.add("show");

}


function populateLedgerSelect() {

    const select =
        document.getElementById("txLedger");

    select.innerHTML =
        db.ledgers.map(l => {

            return `
                <option value="${escapeAttr(l.name)}">
                    ${escapeHtml(l.name)}
                </option>
            `;

        }).join("");

}


function saveTransaction() {

    const date =
        document.getElementById("txDate").value;

    const ledger =
        document.getElementById("txLedger").value;

    const description =
        document
            .getElementById("txDescription")
            .value
            .trim();

    const debit =
        Number(
            document.getElementById("txDebit").value
        ) || 0;

    const credit =
        Number(
            document.getElementById("txCredit").value
        ) || 0;


    if (!date || !ledger) {

        alert("Date and ledger are required.");

        return;

    }


    if (debit > 0 && credit > 0) {

        alert(
            "Enter either Debit or Credit, not both."
        );

        return;

    }


    if (debit === 0 && credit === 0) {

        alert("Enter an amount.");

        return;

    }


    db.transactions.push({

        id: id(),
        date,
        ledger,
        description,
        debit,
        credit

    });


    saveLocal();

    closeModal("transactionModal");

    currentDate = date;

    document
        .getElementById("selectedDate")
        .value = date;

    renderAll();

}


function renderTransactions() {

    const tbody =
        document.getElementById(
            "transactionsTable"
        );


    const transactions =
        [...db.transactions]
            .sort((a, b) =>
                b.date.localeCompare(a.date)
            );


    if (!transactions.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6"
                    class="empty">
                    No transactions.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        transactions.map(t => {

            return `
                <tr>

                    <td>${escapeHtml(t.date)}</td>

                    <td>${escapeHtml(t.ledger)}</td>

                    <td>${escapeHtml(t.description)}</td>

                    <td>
                        ${t.debit
                            ? money(t.debit)
                            : ""}
                    </td>

                    <td>
                        ${t.credit
                            ? money(t.credit)
                            : ""}
                    </td>

                    <td>
                        <button
                            onclick="deleteTransaction('${t.id}')">
                            Delete
                        </button>
                    </td>

                </tr>
            `;

        }).join("");

}


function deleteTransaction(transactionId) {

    if (!confirm("Delete this transaction?")) {
        return;
    }


    db.transactions =
        db.transactions.filter(
            t => t.id !== transactionId
        );


    saveLocal();

    renderAll();

}


/* =========================================================
   DAILY CALCULATION
========================================================= */

function getOpeningBalance(date) {

    const sorted =
        [...getAllDates()]
            .sort();


    const previousDates =
        sorted.filter(d => d < date);


    if (!previousDates.length) {

        const bank =
            db.ledgers.find(
                l =>
                    l.type === "Asset" &&
                    /bank/i.test(l.name)
            );

        return bank
            ? Number(bank.opening || 0)
            : 0;

    }


    const previousDate =
        previousDates[previousDates.length - 1];

    const previous =
        calculateDay(previousDate);


    if (previous.actual !== null) {

        return previous.actual;

    }


    return previous.expected;

}


function calculateDay(date) {

    const transactions =
        db.transactions.filter(
            t => t.date === date
        );


    const receipts =
        transactions.reduce(
            (sum, t) =>
                sum + Number(t.credit || 0),
            0
        );


    const payments =
        transactions.reduce(
            (sum, t) =>
                sum + Number(t.debit || 0),
            0
        );


    const opening =
        getOpeningBalanceWithoutRecursion(date);


    const expected =
        opening +
        receipts -
        payments;


    const daily =
        db.daily.find(
            d => d.date === date
        );


    const actual =
        daily &&
        daily.actualClosing !== undefined
            ? Number(daily.actualClosing)
            : null;


    const difference =
        actual === null
            ? null
            : actual - expected;


    return {
        opening,
        receipts,
        payments,
        expected,
        actual,
        difference
    };

}


/*
    This calculates opening balance by walking
    backwards to the last known actual closing.
*/

function getOpeningBalanceWithoutRecursion(date) {

    const dates =
        getAllDates()
            .filter(d => d < date)
            .sort()
            .reverse();


    for (const previousDate of dates) {

        const daily =
            db.daily.find(
                d => d.date === previousDate
            );


        if (
            daily &&
            daily.actualClosing !== undefined &&
            daily.actualClosing !== ""
        ) {

            return Number(
                daily.actualClosing
            );

        }

    }


    const bank =
        db.ledgers.find(
            l =>
                l.type === "Asset" &&
                /bank/i.test(l.name)
        );


    return bank
        ? Number(bank.opening || 0)
        : 0;

}


/* =========================================================
   DAILY UI
========================================================= */

function loadDay() {

    currentDate =
        document.getElementById(
            "selectedDate"
        ).value;

    renderDaily();

}


function renderDaily() {

    const calc =
        calculateDay(currentDate);


    document.getElementById(
        "openingBalance"
    ).textContent = money(calc.opening);


    document.getElementById(
        "dayReceipts"
    ).textContent = money(calc.receipts);


    document.getElementById(
        "dayPayments"
    ).textContent = money(calc.payments);


    document.getElementById(
        "expectedClosing"
    ).textContent = money(calc.expected);


    const actualInput =
        document.getElementById(
            "actualClosing"
        );


    actualInput.value =
        calc.actual === null
            ? ""
            : calc.actual;


    document.getElementById(
        "dayDifference"
    ).textContent =
        calc.difference === null
            ? "—"
            : money(calc.difference);


    renderDailyTransactions();

}


function renderDailyTransactions() {

    const container =
        document.getElementById(
            "dailyTransactions"
        );


    const transactions =
        db.transactions.filter(
            t => t.date === currentDate
        );


    if (!transactions.length) {

        container.innerHTML =
            `<div class="empty">
                No transactions.
             </div>`;

        return;

    }


    container.innerHTML =
        transactions.map(t => {

            const amount =
                t.debit > 0
                    ? t.debit
                    : t.credit;

            const type =
                t.debit > 0
                    ? "debit"
                    : "credit";

            const sign =
                t.debit > 0
                    ? "-"
                    : "+";


            return `
                <div class="transaction-item">

                    <div class="tx-info">

                        <strong>
                            ${escapeHtml(
                                t.description ||
                                t.ledger
                            )}
                        </strong>

                        <span>
                            ${escapeHtml(t.ledger)}
                        </span>

                    </div>

                    <div class="amount ${type}">
                        ${sign}${money(amount)}
                    </div>

                </div>
            `;

        }).join("");

}


/* =========================================================
   ACTUAL CLOSING
========================================================= */

function saveActualClosing() {

    const value =
        document.getElementById(
            "actualClosing"
        ).value;


    if (value === "") {

        db.daily =
            db.daily.filter(
                d => d.date !== currentDate
            );

        saveLocal();

        renderAll();

        return;

    }


    const amount = Number(value);


    const existing =
        db.daily.find(
            d => d.date === currentDate
        );


    if (existing) {

        existing.actualClosing = amount;

    } else {

        db.daily.push({

            date: currentDate,
            actualClosing: amount

        });

    }


    saveLocal();

    renderAll();

}


function reconcileDay() {

    const calc =
        calculateDay(currentDate);


    if (calc.actual === null) {

        alert(
            "Enter the actual bank closing balance first."
        );

        return;

    }


    if (
        Math.abs(calc.difference) < 0.01
    ) {

        alert(
            "✓ Day reconciled successfully."
        );

    } else {

        alert(
            "There is a difference of " +
            money(calc.difference) +
            "."
        );

    }

}


/* =========================================================
   RECONCILIATION TABLE
========================================================= */

function renderReconciliation() {

    const tbody =
        document.getElementById(
            "reconciliationTable"
        );


    const dates =
        getAllDates().sort().reverse();


    if (!dates.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8"
                    class="empty">
                    No reconciliation data.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        dates.map(date => {

            const c =
                calculateDay(date);


            const status =
                c.actual === null
                    ? "Pending"
                    : Math.abs(c.difference) < 0.01
                        ? "Reconciled"
                        : "Difference";


            return `
                <tr>

                    <td>${date}</td>

                    <td>${money(c.opening)}</td>

                    <td>${money(c.receipts)}</td>

                    <td>${money(c.payments)}</td>

                    <td>${money(c.expected)}</td>

                    <td>
                        ${c.actual === null
                            ? "—"
                            : money(c.actual)}
                    </td>

                    <td>
                        ${c.difference === null
                            ? "—"
                            : money(c.difference)}
                    </td>

                    <td>${status}</td>

                </tr>
            `;

        }).join("");

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

    const calc =
        calculateDay(currentDate);


    document.getElementById(
        "bankBalance"
    ).textContent =
        money(
            calc.actual === null
                ? calc.expected
                : calc.actual
        );


    document.getElementById(
        "todayDate"
    ).textContent =
        currentDate;


    document.getElementById(
        "difference"
    ).textContent =
        calc.difference === null
            ? "—"
            : money(calc.difference);


    document.getElementById(
        "reconStatus"
    ).textContent =
        calc.actual === null
            ? "Pending"
            : Math.abs(calc.difference) < 0.01
                ? "Reconciled"
                : "Difference";

}


/* =========================================================
   DATE LIST
========================================================= */

function getAllDates() {

    const dates = new Set();


    db.transactions.forEach(
        t => dates.add(t.date)
    );


    db.daily.forEach(
        d => dates.add(d.date)
    );


    return [...dates];

}


/* =========================================================
   MODALS
========================================================= */

function closeModal(id) {

    document
        .getElementById(id)
        .classList.remove("show");

}


/* =========================================================
   SECURITY / HTML HELPERS
========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function escapeAttr(value) {

    return escapeHtml(value);

}


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderAll() {

    renderDashboard();

    renderDaily();

    renderTransactions();

    renderLedgers();

    renderReconciliation();

}
