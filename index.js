// Plan SC: F-01~F-06 - localStorage 기반 영업 건 데이터 관리

const STORAGE_KEY = 'salesData';

function loadData() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function addEntry(entry) {
  const data = loadData();
  entry.id = Date.now();
  data.push(entry);
  saveData(data);
}

function updateEntry(id, updated) {
  const data = loadData();
  const idx = data.findIndex(e => e.id === id);
  if (idx !== -1) {
    data[idx] = { ...data[idx], ...updated };
    saveData(data);
  }
}

function formatAmount(amount) {
  return '₩ ' + Number(amount).toLocaleString('ko-KR');
}

function applyAmountComma(input) {
  const raw = input.value.replace(/[^0-9]/g, '');
  input.value = raw ? Number(raw).toLocaleString('ko-KR') : '';
}

function parseAmount(input) {
  return Number(input.value.replace(/,/g, '')) || 0;
}

function formatAmountShort(amount) {
  if (amount === 0) return '0억';
  const eok = amount / 100000000;
  if (eok >= 10) return Math.round(eok) + '억';
  if (eok >= 1) return eok.toFixed(1) + '억';
  const man = amount / 10000;
  if (man >= 1) return man.toFixed(1) + '만';
  return String(amount);
}

// Plan SC: F-05 - 총 매출액 표시
function renderTotal() {
  const el = document.getElementById('total-value');
  if (!el) return;
  const data = loadData();
  const total = data.reduce((sum, e) => sum + Number(e.amount), 0);
  el.textContent = formatAmount(total);
}

// Plan SC: F-06 - 월별 차트 렌더링
function renderChart() {
  const container = document.getElementById('monthly-chart');
  if (!container) return;

  const data = loadData();
  if (data.length === 0) {
    container.innerHTML = '<p class="empty-text">등록된 매출 데이터가 없습니다.</p>';
    return;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 1월 ~ 현재 월 합계 계산
  const monthly = {};
  for (let m = 1; m <= currentMonth; m++) monthly[m] = 0;
  data.forEach(e => {
    const d = new Date(e.date);
    if (d.getFullYear() === currentYear) {
      const m = d.getMonth() + 1;
      if (monthly[m] !== undefined) monthly[m] += Number(e.amount);
    }
  });

  const months = Object.keys(monthly).map(Number);
  const maxAmount = Math.max(...Object.values(monthly), 1);

  container.innerHTML = months.map(m => {
    const amount = monthly[m];
    const heightPct = Math.max(Math.round((amount / maxAmount) * 90), 5);
    return `
      <div class="bar-group">
        <span class="bar-val">${amount > 0 ? formatAmountShort(amount) : '-'}</span>
        <div class="bar${m === currentMonth ? ' bar-current' : ''}" style="height: ${heightPct}%;"></div>
        <span class="bar-label">${m}월</span>
      </div>`;
  }).join('');
}

// Plan SC: F-02 - edit.html 목록 렌더링
function renderList() {
  const tbody = document.getElementById('data-list');
  if (!tbody) return;

  const data = loadData();
  if (data.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">등록된 영업 건이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(e => `
    <tr>
      <td>${e.client}</td>
      <td>${e.type}</td>
      <td>${formatAmount(e.amount)}</td>
      <td>${e.date}</td>
      <td><a href="#edit-form" class="btn-link" onclick="fillEditForm(${e.id})">수정</a></td>
    </tr>`).join('');
}

// Plan SC: F-03 - 수정 폼에 기존 데이터 채우기
function fillEditForm(id) {
  const entry = loadData().find(e => e.id === id);
  if (!entry) return;
  document.getElementById('edit-id').value = entry.id;
  document.getElementById('client').value = entry.client;
  document.getElementById('type').value = entry.type;
  document.getElementById('amount').value = Number(entry.amount).toLocaleString('ko-KR');
  document.getElementById('date').value = entry.date;
  document.getElementById('desc').value = entry.desc || '';
}

document.addEventListener('DOMContentLoaded', () => {
  // index.html 초기화
  renderTotal();
  renderChart();

  // edit.html 목록 초기화
  renderList();

  // 금액 입력 시 콤마 포맷
  const amountInput = document.getElementById('amount');
  if (amountInput) {
    amountInput.addEventListener('input', () => applyAmountComma(amountInput));
  }

  // Plan SC: F-01 - input.html 저장 처리
  const inputForm = document.getElementById('input-form');
  if (inputForm) {
    inputForm.addEventListener('submit', e => {
      e.preventDefault();
      addEntry({
        client: document.getElementById('client').value,
        type:   document.getElementById('type').value,
        amount: parseAmount(document.getElementById('amount')),
        date:   document.getElementById('date').value,
        desc:   document.getElementById('desc').value,
      });
      location.href = 'index.html';
    });
  }

  // Plan SC: F-04 - edit.html 수정 저장 처리
  const editForm = document.getElementById('edit-form-submit');
  if (editForm) {
    editForm.addEventListener('submit', e => {
      e.preventDefault();
      updateEntry(Number(document.getElementById('edit-id').value), {
        client: document.getElementById('client').value,
        type:   document.getElementById('type').value,
        amount: parseAmount(document.getElementById('amount')),
        date:   document.getElementById('date').value,
        desc:   document.getElementById('desc').value,
      });
      location.href = 'index.html';
    });
  }
});
