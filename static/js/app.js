const API = '/api', $ = id => document.getElementById(id);
let chart = null, currencies = { fiat: {} }, pair = { base: '', quote: '', name: '' }, comparisons = [];
const KEYS = { THEME: 'kurtakip_theme', FAVS: 'kurtakip_favorites', HIST: 'kurtakip_history' };
const EMOJIS = { 'USD': '🇺🇸', 'EUR': '🇪🇺', 'TRY': '🇹🇷', 'GBP': '🇬🇧', 'JPY': '🇯🇵', 'CHF': '🇨🇭', 'CAD': '🇨🇦', 'AUD': '🇦🇺', 'CNY': '🇨🇳', 'INR': '🇮🇳', 'RUB': '🇷🇺', 'BRL': '🇧🇷', 'ZAR': '🇿🇦', 'KRW': '🇰🇷', 'MXN': '🇲🇽', 'SAR': '🇸🇦', 'AED': '🇦🇪', 'SEK': '🇸🇪', 'NOK': '🇳🇴', 'DKK': '🇩🇰', 'PLN': '🇵🇱', 'SGD': '🇸🇬', 'NZD': '🇳🇿' };

document.addEventListener('DOMContentLoaded', async () => {
    localStorage.getItem(KEYS.THEME) === 'dark' && document.documentElement.classList.add('dark');
    $('currentDate').textContent = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
    const today = new Date(), ago = new Date(today); ago.setDate(today.getDate() - 30);
    const max = today.toISOString().split('T')[0], min = ago.toISOString().split('T')[0];
    if ($('queryDate')) Object.assign($('queryDate'), { value: min, max });
    if ($('compareStartDate')) Object.assign($('compareStartDate'), { value: min, max });
    if ($('compareEndDate')) Object.assign($('compareEndDate'), { value: max, max });
    try { currencies = await (await fetch(`${API}/currencies`)).json(); } catch (e) { notify('Para birimleri yüklenemedi', 'error'); }
    await loadPopularPairs();
    const dfs = { fromCurrency: 'TRY', toCurrency: 'USD', multiFromCurrency: 'TRY', dateFromCurrency: 'USD', dateToCurrency: 'TRY', compareFromCurrency: 'USD', compareToCurrency: 'TRY' };
    ['fromCurrency', 'toCurrency', 'multiFromCurrency', 'dateFromCurrency', 'dateToCurrency', 'compareFromCurrency', 'compareToCurrency', 'addCompareChart'].forEach(id => {
        const sel = $(id); if (!sel) return; sel.innerHTML = id === 'addCompareChart' ? '<option value="">+ Ekle</option>' : '';
        Object.entries(currencies.fiat).forEach(([code, info]) => {
            const opt = document.createElement('option'); opt.value = code; opt.textContent = `${EMOJIS[code] || info.symbol} ${code} - ${info.name}`; sel.appendChild(opt);
        });
        if (dfs[id] && !sel.value) sel.value = dfs[id];
    });
    loadFavorites(); loadHistory();
    $('convertBtn').addEventListener('click', convert); $('multiConvertBtn').addEventListener('click', multiConvert);
    $('currencySearch').addEventListener('input', searchCurrencies); $('amount').addEventListener('keypress', e => e.key === 'Enter' && convert());
    $('themeToggle').addEventListener('click', () => { const dark = document.documentElement.classList.toggle('dark'); localStorage.setItem(KEYS.THEME, dark ? 'dark' : 'light'); notify(dark ? 'Karanlık mod aktif' : 'Aydınlık mod aktif', 'success'); });
    $('queryDateBtn').addEventListener('click', queryRateOnDate); $('compareDatesBtn').addEventListener('click', compareDates);
    $('clearHistoryBtn').addEventListener('click', () => { localStorage.removeItem(KEYS.HIST); loadHistory(); notify('Geçmiş temizlendi', 'success'); });
    $('addCompareChart').addEventListener('change', addComparison); $('removeCompareBtn').addEventListener('click', removeComparison);
    document.querySelectorAll('.chart-period-btn').forEach(btn => btn.addEventListener('click', async e => {
        const d = parseInt(e.target.dataset.days); if (!pair.base || !pair.quote) return notify('Parite seçin', 'error');
        if (!pair.name) pair.name = `${currencies.fiat[pair.base]?.name || pair.base}/${currencies.fiat[pair.quote]?.name || pair.quote}`;
        document.querySelectorAll('.chart-period-btn').forEach(b => { b.classList.remove('bg-accent-light', 'text-accent'); b.classList.add('bg-transparent', 'text-muted', 'border-default'); });
        e.target.classList.remove('bg-transparent', 'text-muted', 'border-default'); e.target.classList.add('bg-accent-light', 'text-accent');
        $('chartTitle').textContent = `${pair.name} - Son ${d} Gün`; await loadChartData(pair.base, pair.quote, d);
    }));
});

const getFavs = () => JSON.parse(localStorage.getItem(KEYS.FAVS) || '[]');
const saveFavs = f => localStorage.setItem(KEYS.FAVS, JSON.stringify(f));
const isFav = (b, q) => getFavs().some(f => f.base === b && f.quote === q);

function loadFavorites() {
    const fv = getFavs(), sec = $('favoritesSection'), box = $('favoritePairs');
    if (!fv.length) return sec.classList.add('hidden');
    sec.classList.remove('hidden'); box.innerHTML = '';
    fv.forEach(async f => {
        const c = document.createElement('div'); c.className = 'card p-5 cursor-pointer relative group';
        try {
            const r = await (await fetch(`${API}/rates/${f.base}`)).json(), rt = r.rates?.[f.quote] || '-';
            c.innerHTML = `<button class="star-btn active absolute top-3 right-3" onclick="event.stopPropagation(); removeFav('${f.base}','${f.quote}')"><i class="fas fa-star"></i></button><h3 class="font-semibold">${f.name}</h3><p class="stat-value text-2xl mt-2">${fmt(rt)}</p><p class="text-sm text-muted mt-1">${f.base}/${f.quote}</p>`;
            c.addEventListener('click', () => showChart(f.base, f.quote, f.name));
        } catch { c.innerHTML = `<h3 class="font-semibold">${f.name}</h3><p class="text-sm text-muted">Veri yüklenemedi</p>`; }
        box.appendChild(c);
    });
}
window.removeFav = (b, q) => { saveFavs(getFavs().filter(f => !(f.base === b && f.quote === q))); loadFavorites(); notify('Kaldırıldı', 'success'); };
window.toggleFav = (b, q, n) => {
    let fv = getFavs(); if (fv.find(f => f.base === b && f.quote === q)) fv = fv.filter(f => !(f.base === b && f.quote === q)); else fv.push({ base: b, quote: q, name: n });
    saveFavs(fv); loadFavorites(); loadPopularPairs(); notify('Favoriler güncellendi', 'success');
};

const getHist = () => JSON.parse(localStorage.getItem(KEYS.HIST) || '[]');
function loadHistory() {
    const hs = getHist(), sec = $('historySection'), bx = $('conversionHistory');
    if (!hs.length) return sec.classList.add('hidden');
    sec.classList.remove('hidden'); bx.innerHTML = '';
    hs.forEach(i => {
        const r = document.createElement('div'); r.className = 'flex items-center justify-between p-4 rounded-xl bg-accent-light';
        const tm = new Date(i.timestamp).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        r.innerHTML = `<div class="flex items-center gap-4 flex-wrap"><span class="text-sm text-muted">${tm}</span><span class="font-medium">${fmt(i.amount)} ${i.from}</span><i class="fas fa-arrow-right text-accent"></i><span class="font-bold text-accent">${fmt(i.result)} ${i.to}</span></div><span class="text-xs text-muted">Kur: ${fmt(i.rate)}</span>`;
        bx.appendChild(r);
    });
}
const saveHist = cv => { let h = getHist(); h.unshift({ ...cv, timestamp: new Date().toISOString() }); localStorage.setItem(KEYS.HIST, JSON.stringify(h.slice(0, 10))); loadHistory(); };

async function loadPopularPairs() {
    try {
        const ps = await (await fetch(`${API}/popular-pairs`)).json(), bx = $('popularPairs'); bx.innerHTML = '';
        ps.forEach(p => {
            if (!p?.rate) return;
            const c = document.createElement('div'), cls = p.change_24h >= 0 ? 'positive' : 'negative', icon = p.change_24h >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            c.className = 'card p-5 cursor-pointer relative group';
            c.innerHTML = `<button class="star-btn absolute top-4 right-4 ${isFav(p.base, p.quote) ? 'active' : ''}" onclick="event.stopPropagation(); toggleFav('${p.base}','${p.quote}','${p.name}')"><i class="fas fa-star"></i></button><div class="flex justify-between items-start mb-3 pr-8"><h3 class="font-semibold">${p.name}</h3><span class="text-xs ${cls} flex items-center"><i class="fas ${icon} mr-1"></i>${Math.abs(p.change_24h).toFixed(2)}%</span></div><p class="stat-value text-2xl">${fmt(p.rate)}</p><p class="text-sm text-muted mt-2">${p.base}/${p.quote}</p>`;
            c.addEventListener('click', () => showChart(p.base, p.quote, p.name)); bx.appendChild(c);
        });
    } catch { notify('Popüler pariteler alınamadı', 'error'); }
}

async function convert() {
    const a = parseFloat($('amount').value), f = $('fromCurrency').value, t = $('toCurrency').value, b = $('convertBtn');
    if (!a || a <= 0) return notify('Geçerli miktar girin', 'error'); if (f === t) return notify('Aynı kur olamaz', 'error');
    b.disabled = true; b.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Dönüştürülüyor...';
    try {
        const r = await fetch(`${API}/convert?from_currency=${f}&to_currency=${t}&amount=${a}`), d = await r.json();
        if (r.ok) {
            $('resultAmount').textContent = fmt(d.result); $('resultCurrency').textContent = d.to; $('exchangeRate').textContent = `Kur: 1 ${d.from} = ${fmt(d.rate)} ${d.to}`;
            $('conversionResult').classList.remove('hidden'); saveHist({ from: d.from, to: d.to, amount: d.amount, result: d.result, rate: d.rate });
        } else throw new Error(d.detail);
    } catch { notify('Dönüştürme başarısız', 'error'); } finally { b.disabled = false; b.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Dönüştür'; }
}

async function multiConvert() {
    const f = $('multiFromCurrency').value, a = parseFloat($('multiAmount').value), b = $('multiConvertBtn');
    if (!a || a <= 0) return notify('Geçerli miktar girin', 'error');
    b.disabled = true; b.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Dönüştürülüyor...';
    try {
        const r = await fetch(`${API}/multi-convert?from_currency=${f}&amount=${a}`), d = await r.json();
        if (r.ok) {
            const bx = $('multiConversionResults'); bx.innerHTML = ''; bx.classList.remove('hidden');
            d.conversions.forEach(c => {
                const cd = document.createElement('div'); cd.className = 'card p-5';
                cd.innerHTML = `<div class="flex justify-between items-center mb-3"><span class="text-2xl">${c.symbol}</span><span class="text-sm font-semibold text-success px-2 py-1 bg-success-light rounded-lg">${c.currency}</span></div><p class="stat-value text-xl">${fmt(c.amount)}</p><p class="text-sm text-secondary mt-2">${c.name}</p><p class="text-xs text-muted mt-3 pt-3" style="border-top:1px solid var(--border)">Kur: ${fmt(c.rate)}</p>`;
                bx.appendChild(cd);
            });
        } else throw new Error(d.detail);
    } catch { notify('Çoklu dönüşüm başarısız', 'error'); } finally { b.disabled = false; b.innerHTML = '<i class="fas fa-calculator mr-2"></i>Tüm Para Birimlerine Dönüştür'; }
}

async function queryRateOnDate() {
    const b = $('dateFromCurrency').value, q = $('dateToCurrency').value, dt = $('queryDate').value, btn = $('queryDateBtn');
    if (!dt) return notify('Tarih seçin', 'error');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sorgulanıyor...';
    try {
        const r = await fetch(`${API}/rate-on-date/${b}/${q}/${dt}`), d = await r.json();
        if (r.ok) {
            $('dateQueryLabel').textContent = `${new Date(dt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} tarihinde`;
            $('dateQueryRate').textContent = `1 ${b} = ${fmt(d.rate)} ${q}`; $('dateQueryResult').classList.remove('hidden');
        } else throw new Error(d.error);
    } catch (e) { notify(e.message || 'Hata', 'error'); } finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-search mr-2"></i>Sorgula'; }
}

async function compareDates() {
    const b = $('compareFromCurrency').value, q = $('compareToCurrency').value, st = $('compareStartDate').value, en = $('compareEndDate').value, btn = $('compareDatesBtn');
    if (!st || !en) return notify('Tarihleri seçin', 'error');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Karşılaştırılıyor...';
    try {
        const r = await fetch(`${API}/compare-dates/${b}/${q}?start_date=${st}&end_date=${en}`), d = await r.json();
        if (r.ok) {
            const fd = x => new Date(x).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
            $('compareStartLabel').textContent = fd(st); $('compareStartRate').textContent = fmt(d.start_rate); $('compareEndLabel').textContent = fd(en); $('compareEndRate').textContent = fmt(d.end_rate);
            const p = $('compareChangePercent'), dr = $('compareChangeDirection'), pos = d.change_percent >= 0;
            p.textContent = `${pos ? '+' : ''}${d.change_percent}%`; p.className = `text-3xl font-bold ${pos ? 'positive' : 'negative'}`;
            dr.textContent = d.change_direction; dr.className = `text-sm ${pos ? 'positive' : 'negative'}`; $('compareResult').classList.remove('hidden');
        } else throw new Error(d.error);
    } catch (e) { notify(e.message || 'Hata', 'error'); } finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-chart-bar mr-2"></i>Karşılaştır'; }
}

async function showChart(b, q, n) {
    if (!n) n = `${currencies.fiat[b]?.name || b}/${currencies.fiat[q]?.name || q}`; pair = { base: b, quote: q, name: n }; comparisons = []; $('removeCompareBtn').classList.add('hidden');
    $('chartTitle').textContent = `${n} - Son 7 Gün`; $('chartSection').classList.remove('hidden'); $('chartSection').scrollIntoView({ behavior: 'smooth' });
    document.querySelectorAll('.chart-period-btn').forEach(bb => { bb.classList.remove('bg-accent-light', 'text-accent'); bb.classList.add('bg-transparent', 'text-muted', 'border-default'); });
    const btn7 = document.querySelector('.chart-period-btn[data-days="7"]'); if (btn7) { btn7.classList.remove('bg-transparent', 'text-muted', 'border-default'); btn7.classList.add('bg-accent-light', 'text-accent'); }
    await loadChartData(b, q, 7);
}

function addComparison(e) { const c = e.target.value; if (!c || !pair.base || comparisons.includes(c)) return; comparisons.push(c); $('removeCompareBtn').classList.remove('hidden'); loadChartData(pair.base, pair.quote, parseInt(document.querySelector('.chart-period-btn.bg-accent-light')?.dataset?.days || 7)); e.target.value = ''; notify(`${c} grafiğe eklendi`, 'success'); }
function removeComparison() { comparisons = []; $('removeCompareBtn').classList.add('hidden'); loadChartData(pair.base, pair.quote, parseInt(document.querySelector('.chart-period-btn.bg-accent-light')?.dataset?.days || 7)); notify('Kaldırıldı', 'success'); }

async function loadChartData(b, q, days = 7) {
    try {
        const r = await fetch(`${API}/history/${b}/${q}?days=${days}`), m = await r.json(); if (!r.ok || !m) return;
        const cd = await Promise.all(comparisons.map(async c => { const cr = await fetch(`${API}/history/${b}/${c}?days=${days}`); return cr.ok ? { currency: c, data: (await cr.json()).data } : null; }));
        renderChart(m, cd.filter(Boolean));
    } catch { notify('Grafik hatası', 'error'); }
}

function renderChart(d, cmp = []) {
    if (!d?.data?.length) return notify('Veri yok', 'error');
    if (chart) chart.destroy();
    const lbls = d.data.map(x => { try { return new Date(x.date).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }); } catch { return x.date; } });
    const col = [{ b: 'rgb(147,51,234)', a: 'rgba(147,51,234,.1)' }, { b: 'rgb(59,130,246)', a: 'rgba(59,130,246,.1)' }, { b: 'rgb(16,185,129)', a: 'rgba(16,185,129,.1)' }, { b: 'rgb(245,158,11)', a: 'rgba(245,158,11,.1)' }];
    const ds = [{ label: `${d.base}/${d.quote}`, data: d.data.map(v => v.rate), borderColor: col[0].b, backgroundColor: col[0].a, borderWidth: 2, fill: true, tension: .4, pointRadius: 4, pointBackgroundColor: col[0].b, pointBorderColor: '#fff', pointBorderWidth: 2, pointHoverRadius: 6 }];
    cmp.forEach((c, i) => { const cl = col[(i + 1) % col.length]; ds.push({ label: `${d.base}/${c.currency}`, data: c.data.map(v => v.rate), borderColor: cl.b, backgroundColor: cl.a, borderWidth: 2, fill: false, tension: .4, pointRadius: 3, pointBackgroundColor: cl.b, pointBorderColor: '#fff', pointBorderWidth: 2, pointHoverRadius: 5 }); });
    const st = getComputedStyle(document.documentElement), tc = st.getPropertyValue('--text-secondary').trim() || '#4b5563', gc = st.getPropertyValue('--border').trim() || '#e5e7eb';
    chart = new Chart($('historicalChart').getContext('2d'), { type: 'line', data: { labels: lbls, datasets: ds }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: true, position: 'top', labels: { color: st.getPropertyValue('--text-primary').trim() || '#1f2937' } }, tooltip: { mode: 'index', intersect: false, callbacks: { label: c => `${c.dataset.label}: ${fmt(c.parsed.y)}` } } }, scales: { y: { beginAtZero: false, ticks: { callback: v => fmt(v), color: tc }, grid: { color: gc } }, x: { ticks: { color: tc }, grid: { color: gc } } } } });
}

function searchCurrencies() {
    const tm = $('currencySearch').value.toLowerCase(), bx = $('searchResults'); if (tm.length < 2) return bx.innerHTML = '';
    const rs = Object.entries(currencies.fiat).filter(([c, i]) => c.toLowerCase().includes(tm) || i.name.toLowerCase().includes(tm)).map(([c, i]) => ({ code: c, ...i }));
    bx.innerHTML = ''; if (!rs.length) return bx.innerHTML = '<p class="text-muted text-center col-span-full">Sonuç bulunamadı</p>';
    rs.forEach(c => {
        const crd = document.createElement('div'); crd.className = 'card p-5 cursor-pointer'; crd.innerHTML = `<div class="flex items-center justify-between mb-3"><span class="text-3xl">${c.symbol}</span><i class="fas fa-money-bill text-accent"></i></div><h3 class="text-lg font-semibold">${c.code}</h3><p class="text-sm text-secondary mt-1">${c.name}</p><span class="inline-block mt-3 px-3 py-1 text-xs font-medium rounded-full bg-accent-light text-accent">Fiat</span>`;
        crd.addEventListener('click', () => { $('fromCurrency').value = c.code; $('currencySearch').value = ''; bx.innerHTML = ''; notify(`${c.name} seçildi`, 'success'); }); bx.appendChild(crd);
    });
}

function fmt(n) { if (n == null) return '0.00'; const a = Math.abs(n); if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M'; if (a >= 1e3) return (n / 1e3).toFixed(2) + 'K'; return a < 0.01 && a > 0 ? n.toFixed(8) : a < 1 ? n.toFixed(4) : n.toFixed(2); }
function notify(m, t = 'info') { const b = t === 'error' ? 'bg-red-500' : t === 'success' ? 'bg-green-500' : 'bg-blue-500', i = t === 'error' ? 'fa-exclamation-circle' : t === 'success' ? 'fa-check-circle' : 'fa-info-circle', e = document.createElement('div'); e.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg text-white z-50 ${b}`; e.innerHTML = `<div class="flex items-center"><i class="fas ${i} mr-3"></i><span>${m}</span></div>`; document.body.appendChild(e); setTimeout(() => { e.style.transition = 'opacity 0.5s'; e.style.opacity = '0'; setTimeout(() => e.remove(), 500); }, 3000); }
