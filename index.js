// ▼ Apps Script 배포 후 여기에 URL을 입력하세요
var APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby-Pm4z3xWdQuJXzyeNsc7bQ6UpDHvNJ9A34xrFRiazUH2_fu3o23OvE-_DYoDgXIAw/exec";

// ─── 데이터 API ──────────────────────────────────────────

async function loadData() {
  if (!APPS_SCRIPT_URL) return localLoad();
  try {
    var res = await fetch(APPS_SCRIPT_URL);
    var data = await res.json();
    return data.map(normalizeEntry);
  } catch (e) {
    console.warn("Sheets 연결 실패, localStorage 사용:", e);
    return localLoad();
  }
}

async function addEntry(entry) {
  entry.id = Date.now();
  if (!APPS_SCRIPT_URL) {
    localAdd(entry);
    return;
  }
  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "add", entry }),
  });
}

async function updateEntry(id, updated) {
  updated.id = id;
  if (!APPS_SCRIPT_URL) {
    localUpdate(id, updated);
    return;
  }
  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "update", entry: updated }),
  });
}

// ─── localStorage 폴백 (APPS_SCRIPT_URL 미설정 시) ──────

var STORAGE_KEY = "salesData";

function localLoad() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function localAdd(entry) {
  var data = localLoad();
  data.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function localUpdate(id, updated) {
  var data = localLoad();
  var idx = data.findIndex((e) => e.id === id);
  if (idx !== -1) data[idx] = { ...data[idx], ...updated };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function normalizeEntry(e) {
  return {
    id: Number(e.id),
    client: e.client,
    type: e.type,
    amount: Number(e.amount),
    date: e.date,
    desc: e.desc || "",
  };
}

// ─── 포맷 유틸 ──────────────────────────────────────────

function formatAmount(amount) {
  return "₩ " + Number(amount).toLocaleString("ko-KR");
}

function formatAmountShort(amount) {
  if (amount === 0) return "0억";
  var eok = amount / 100000000;
  if (eok >= 10) return Math.round(eok) + "억";
  if (eok >= 1) return eok.toFixed(1) + "억";
  var man = amount / 10000;
  if (man >= 1) return man.toFixed(1) + "만";
  return String(amount);
}

function applyAmountComma(input) {
  var raw = input.value.replace(/[^0-9]/g, "");
  input.value = raw ? Number(raw).toLocaleString("ko-KR") : "";
}

function parseAmount(input) {
  return Number(input.value.replace(/,/g, "")) || 0;
}

// ─── 렌더링 ─────────────────────────────────────────────

function renderTotal(data) {
  var el = document.getElementById("total-value");
  if (!el) return;
  var total = data.reduce((sum, e) => sum + Number(e.amount), 0);
  el.textContent = formatAmount(total);
}

function renderChart(data) {
  var container = document.getElementById("monthly-chart");
  if (!container) return;

  if (data.length === 0) {
    container.innerHTML =
      '<p class="empty-text">등록된 매출 데이터가 없습니다.</p>';
    return;
  }

  var now = new Date();
  var currentYear = now.getFullYear();
  var currentMonth = now.getMonth() + 1;

  var monthly = {};
  for (var m = 1; m <= currentMonth; m++) monthly[m] = 0;

  data.forEach((e) => {
    var d = new Date(e.date);
    if (d.getFullYear() === currentYear) {
      var month = d.getMonth() + 1;
      if (monthly[month] !== undefined) monthly[month] += Number(e.amount);
    }
  });

  var months = Object.keys(monthly).map(Number);
  var maxAmount = Math.max(...Object.values(monthly), 1);

  container.innerHTML = months
    .map((m) => {
      var amount = monthly[m];
      var heightPct = Math.max(Math.round((amount / maxAmount) * 90), 5);
      return `
      <div class="bar-group">
        <span class="bar-val">${amount > 0 ? formatAmountShort(amount) : "-"}</span>
        <div class="bar${m === currentMonth ? " bar-current" : ""}" style="height: ${heightPct}%;"></div>
        <span class="bar-label">${m}월</span>
      </div>`;
    })
    .join("");
}

function renderList(data) {
  var tbody = document.getElementById("data-list");
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML =
      '<tr class="empty-row"><td colspan="5">등록된 영업 건이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = data
    .map(
      (e) => `
    <tr>
      <td>${e.client}</td>
      <td>${e.type}</td>
      <td>${formatAmount(e.amount)}</td>
      <td>${e.date}</td>
      <td><a href="#edit-form" class="btn-link" onclick="fillEditForm(${e.id}, window._salesData)">수정</a></td>
    </tr>`,
    )
    .join("");
}

function fillEditForm(id, data) {
  var entry = (data || []).find((e) => e.id === id);
  if (!entry) return;
  document.getElementById("edit-id").value = entry.id;
  document.getElementById("client").value = entry.client;
  document.getElementById("type").value = entry.type;
  document.getElementById("amount").value = Number(entry.amount).toLocaleString(
    "ko-KR",
  );
  document.getElementById("date").value = entry.date;
  document.getElementById("desc").value = entry.desc || "";
}

// ─── 로딩 UI ────────────────────────────────────────────

function showLoading(msg) {
  var el = document.getElementById("loading-msg");
  if (el) el.textContent = msg || "불러오는 중...";
}

function hideLoading() {
  var el = document.getElementById("loading-msg");
  if (el) el.textContent = "";
}

// ─── 초기화 ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  // 금액 콤마 포맷
  var amountInput = document.getElementById("amount");
  if (amountInput) {
    amountInput.addEventListener("input", () => applyAmountComma(amountInput));
  }

  // index.html / detail.html: 데이터 로드 후 렌더
  if (
    document.getElementById("total-value") ||
    document.getElementById("detail-list")
  ) {
    showLoading();
    var data = await loadData();
    window._salesData = data;
    hideLoading();
    renderTotal(data);
    renderChart(data);
    renderDetailList(data);
  }

  // edit.html: 목록 로드
  if (document.getElementById("data-list")) {
    showLoading();
    var data = await loadData();
    window._salesData = data;
    hideLoading();
    renderList(data);
  }

  // input.html 저장
  var inputForm = document.getElementById("input-form");
  if (inputForm) {
    inputForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      var btn = inputForm.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.textContent = "저장 중...";
      await addEntry({
        client: document.getElementById("client").value,
        type: document.getElementById("type").value,
        amount: parseAmount(document.getElementById("amount")),
        date: document.getElementById("date").value,
        desc: document.getElementById("desc").value,
      });
      location.href = "index.html";
    });
  }

  // edit.html 수정 저장
  var editForm = document.getElementById("edit-form-submit");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      var btn = editForm.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.textContent = "저장 중...";
      await updateEntry(Number(document.getElementById("edit-id").value), {
        client: document.getElementById("client").value,
        type: document.getElementById("type").value,
        amount: parseAmount(document.getElementById("amount")),
        date: document.getElementById("date").value,
        desc: document.getElementById("desc").value,
      });
      location.href = "index.html";
    });
  }
});

// detail.html 전용 렌더
function renderDetailList(data) {
  var tbody = document.getElementById("detail-list");
  if (!tbody) return;
  if (!data || data.length === 0) return;
  tbody.innerHTML = data
    .map(
      (e) => `
    <tr>
      <td>${e.client}</td>
      <td>${e.type}</td>
      <td>${formatAmount(e.amount)}</td>
      <td>${e.date}</td>
      <td class="desc-cell">${e.desc || "-"}</td>
    </tr>`,
    )
    .join("");
}
