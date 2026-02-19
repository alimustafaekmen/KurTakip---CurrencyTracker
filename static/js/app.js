// API Base URL
const API_BASE_URL = '/api';

// Global değişkenler
let chartInstance = null;
let allCurrencies = { fiat: {} };
let currentPair = { base: '', quote: '', name: '' };
let comparisonCurrencies = []; // Karşılaştırmalı grafik için ek para birimleri

// LocalStorage anahtarları
const STORAGE_KEYS = {
    THEME: 'kurtakip_theme',
    FAVORITES: 'kurtakip_favorites',
    HISTORY: 'kurtakip_history'
};

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

// Uygulamayı başlat
async function initializeApp() {
    loadTheme();
    updateCurrentDate();
    setDefaultDates();
    await loadCurrencies();
    await loadPopularPairs();
    populateCurrencySelects();
    loadFavorites();
    loadConversionHistory();
}

// Varsayılan tarihleri ayarla
function setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const formatDate = (date) => date.toISOString().split('T')[0];

    // Maksimum tarih bugün olmalı
    const maxDate = formatDate(today);

    // Tarihe göre sorgulama
    const queryDateInput = document.getElementById('queryDate');
    if (queryDateInput) {
        queryDateInput.value = formatDate(thirtyDaysAgo);
        queryDateInput.max = maxDate;
    }

    // Tarih karşılaştırma
    const startDateInput = document.getElementById('compareStartDate');
    const endDateInput = document.getElementById('compareEndDate');
    if (startDateInput && endDateInput) {
        startDateInput.value = formatDate(thirtyDaysAgo);
        startDateInput.max = maxDate;
        endDateInput.value = maxDate;
        endDateInput.max = maxDate;
    }
}

// Event listener'ları ayarla
function setupEventListeners() {
    // Mevcut event listener'lar
    document.getElementById('convertBtn').addEventListener('click', convertCurrency);
    document.getElementById('multiConvertBtn').addEventListener('click', multiConvert);
    document.getElementById('currencySearch').addEventListener('input', searchCurrencies);

    // Enter tuşu ile dönüştürme
    document.getElementById('amount').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') convertCurrency();
    });

    // Tema değiştirme
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Tarihe göre kur sorgulama
    document.getElementById('queryDateBtn').addEventListener('click', queryRateOnDate);

    // Tarih karşılaştırma
    document.getElementById('compareDatesBtn').addEventListener('click', compareDates);

    // Geçmişi temizle
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);

    // Karşılaştırmalı grafik para birimi ekleme
    document.getElementById('addCompareChart').addEventListener('change', addComparisonCurrency);
    document.getElementById('removeCompareBtn').addEventListener('click', removeComparisonCurrency);

    // Grafik periyot butonları
    document.querySelectorAll('.chart-period-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const days = parseInt(e.target.dataset.days);

            if (!currentPair.base || !currentPair.quote) {
                showNotification('Lütfen önce bir parite seçin', 'error');
                return;
            }

            if (!currentPair.name) {
                const baseName = allCurrencies.fiat[currentPair.base]?.name || currentPair.base;
                const quoteName = allCurrencies.fiat[currentPair.quote]?.name || currentPair.quote;
                currentPair.name = `${baseName}/${quoteName}`;
            }

            updatePeriodButtons(e.target);

            const chartTitle = document.getElementById('chartTitle');
            chartTitle.textContent = `${currentPair.name} - Son ${days} Gün`;

            await loadHistoricalData(currentPair.base, currentPair.quote, days);
        });
    });
}

// ==================== TEMA SİSTEMİ ====================

function loadTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
    showNotification(isDark ? 'Karanlık mod aktif' : 'Aydınlık mod aktif', 'success');
}

// ==================== FAVORİ SİSTEMİ ====================

function loadFavorites() {
    const favorites = getFavorites();
    const section = document.getElementById('favoritesSection');
    const container = document.getElementById('favoritePairs');

    if (favorites.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    container.innerHTML = '';

    favorites.forEach(async (fav) => {
        const card = await createFavoriteCard(fav);
        container.appendChild(card);
    });
}

function getFavorites() {
    const stored = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return stored ? JSON.parse(stored) : [];
}

function saveFavorites(favorites) {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
}

function addToFavorites(base, quote, name) {
    const favorites = getFavorites();
    const exists = favorites.some(f => f.base === base && f.quote === quote);

    if (exists) {
        showNotification('Bu parite zaten favorilerinizde', 'info');
        return;
    }

    favorites.push({ base, quote, name });
    saveFavorites(favorites);
    loadFavorites();
    showNotification(`${name} favorilere eklendi`, 'success');
}

function removeFromFavorites(base, quote) {
    let favorites = getFavorites();
    favorites = favorites.filter(f => !(f.base === base && f.quote === quote));
    saveFavorites(favorites);
    loadFavorites();
    showNotification('Favorilerden kaldırıldı', 'success');
}

function isFavorite(base, quote) {
    const favorites = getFavorites();
    return favorites.some(f => f.base === base && f.quote === quote);
}

async function createFavoriteCard(fav) {
    const card = document.createElement('div');
    card.className = 'card p-5 cursor-pointer relative group';

    // Güncel kuru al
    try {
        const response = await fetch(`${API_BASE_URL}/rates/${fav.base}`);
        const data = await response.json();
        const rate = data.rates?.[fav.quote] || '-';

        card.innerHTML = `
            <button class="star-btn active absolute top-3 right-3" onclick="event.stopPropagation(); removeFromFavorites('${fav.base}', '${fav.quote}')">
                <i class="fas fa-star"></i>
            </button>
            <h3 class="font-semibold">${fav.name}</h3>
            <p class="stat-value text-2xl mt-2">${formatNumber(rate)}</p>
            <p class="text-sm text-muted mt-1">${fav.base}/${fav.quote}</p>
        `;

        card.addEventListener('click', () => {
            showHistoricalChart(fav.base, fav.quote, fav.name);
        });
    } catch (error) {
        card.innerHTML = `
            <h3 class="text-lg font-semibold">${fav.name}</h3>
            <p class="text-sm text-muted">Veri yüklenemedi</p>
        `;
    }

    return card;
}

// ==================== DÖNÜŞÜM GEÇMİŞİ ====================

function loadConversionHistory() {
    const history = getHistory();
    const section = document.getElementById('historySection');
    const container = document.getElementById('conversionHistory');

    if (history.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    container.innerHTML = '';

    history.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between p-4 rounded-xl transition' +
            ' ' + 'bg-accent-light';

        const date = new Date(item.timestamp);
        const timeStr = date.toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        row.innerHTML = `
            <div class="flex items-center gap-4 flex-wrap">
                <span class="text-sm text-muted">${timeStr}</span>
                <span class="font-medium">${formatNumber(item.amount)} ${item.from}</span>
                <i class="fas fa-arrow-right text-accent"></i>
                <span class="font-bold text-accent">${formatNumber(item.result)} ${item.to}</span>
            </div>
            <span class="text-xs text-muted">Kur: ${formatNumber(item.rate)}</span>
        `;

        container.appendChild(row);
    });
}

function getHistory() {
    const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return stored ? JSON.parse(stored) : [];
}

function saveToHistory(conversion) {
    let history = getHistory();
    history.unshift({
        ...conversion,
        timestamp: new Date().toISOString()
    });
    // Son 10 dönüşümü sakla
    history = history.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    loadConversionHistory();
}

function clearHistory() {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    loadConversionHistory();
    showNotification('Geçmiş temizlendi', 'success');
}

// ==================== TARİHE GÖRE KUR SORGULAMA ====================

async function queryRateOnDate() {
    const base = document.getElementById('dateFromCurrency').value;
    const quote = document.getElementById('dateToCurrency').value;
    const date = document.getElementById('queryDate').value;

    if (!date) {
        showNotification('Lütfen bir tarih seçin', 'error');
        return;
    }

    const btn = document.getElementById('queryDateBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sorgulanıyor...';

    try {
        const response = await fetch(`${API_BASE_URL}/rate-on-date/${base}/${quote}/${date}`);
        const data = await response.json();

        if (response.ok) {
            const resultDiv = document.getElementById('dateQueryResult');
            const formattedDate = new Date(date).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            document.getElementById('dateQueryLabel').textContent = `${formattedDate} tarihinde`;
            document.getElementById('dateQueryRate').textContent = `1 ${base} = ${formatNumber(data.rate)} ${quote}`;

            resultDiv.classList.remove('hidden');
            resultDiv.classList.add('animate-fadeIn');
        } else {
            throw new Error(data.error || 'Sorgulama hatası');
        }
    } catch (error) {
        showNotification(error.message || 'Kur bilgisi alınamadı', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-search mr-2"></i>Sorgula';
    }
}

// ==================== TARİH KARŞILAŞTIRMA ====================

async function compareDates() {
    const base = document.getElementById('compareFromCurrency').value;
    const quote = document.getElementById('compareToCurrency').value;
    const startDate = document.getElementById('compareStartDate').value;
    const endDate = document.getElementById('compareEndDate').value;

    if (!startDate || !endDate) {
        showNotification('Lütfen her iki tarihi de seçin', 'error');
        return;
    }

    const btn = document.getElementById('compareDatesBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Karşılaştırılıyor...';

    try {
        const response = await fetch(
            `${API_BASE_URL}/compare-dates/${base}/${quote}?start_date=${startDate}&end_date=${endDate}`
        );
        const data = await response.json();

        if (response.ok) {
            const resultDiv = document.getElementById('compareResult');

            const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });

            document.getElementById('compareStartLabel').textContent = formatDate(startDate);
            document.getElementById('compareStartRate').textContent = formatNumber(data.start_rate);
            document.getElementById('compareEndLabel').textContent = formatDate(endDate);
            document.getElementById('compareEndRate').textContent = formatNumber(data.end_rate);

            const changePercent = document.getElementById('compareChangePercent');
            const changeDirection = document.getElementById('compareChangeDirection');

            changePercent.textContent = `${data.change_percent > 0 ? '+' : ''}${data.change_percent}%`;
            changePercent.className = `text-3xl font-bold ${data.change_percent >= 0 ? 'positive' : 'negative'}`;
            changeDirection.textContent = data.change_direction;
            changeDirection.className = `text-sm ${data.change_percent >= 0 ? 'positive' : 'negative'}`;

            resultDiv.classList.remove('hidden');
            resultDiv.classList.add('animate-fadeIn');
        } else {
            throw new Error(data.error || 'Karşılaştırma hatası');
        }
    } catch (error) {
        showNotification(error.message || 'Karşılaştırma yapılamadı', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-chart-bar mr-2"></i>Karşılaştır';
    }
}

// ==================== KARŞILAŞTIRMALI GRAFİK ====================

function addComparisonCurrency(e) {
    const currency = e.target.value;
    if (!currency || !currentPair.base) return;

    if (comparisonCurrencies.includes(currency)) {
        showNotification('Bu para birimi zaten grafikte', 'info');
        return;
    }

    comparisonCurrencies.push(currency);
    document.getElementById('removeCompareBtn').classList.remove('hidden');

    // Grafiği yeniden yükle
    const activePeriod = document.querySelector('.chart-period-btn.bg-purple-600');
    const days = activePeriod ? parseInt(activePeriod.dataset.days) : 7;
    loadHistoricalData(currentPair.base, currentPair.quote, days);

    e.target.value = '';
    showNotification(`${currency} grafiğe eklendi`, 'success');
}

function removeComparisonCurrency() {
    comparisonCurrencies = [];
    document.getElementById('removeCompareBtn').classList.add('hidden');

    const activePeriod = document.querySelector('.chart-period-btn.bg-purple-600');
    const days = activePeriod ? parseInt(activePeriod.dataset.days) : 7;
    loadHistoricalData(currentPair.base, currentPair.quote, days);

    showNotification('Ek para birimleri kaldırıldı', 'success');
}

// Period butonlarını güncelle
function updatePeriodButtons(activeButton) {
    document.querySelectorAll('.chart-period-btn').forEach(btn => {
        btn.classList.remove('bg-accent-light', 'text-accent');
        btn.classList.add('bg-transparent', 'text-muted', 'border-default');
    });
    activeButton.classList.remove('bg-transparent', 'text-muted', 'border-default');
    activeButton.classList.add('bg-accent-light', 'text-accent');
}

// Güncel tarihi göster
function updateCurrentDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('tr-TR', options);
}

// Para birimlerini yükle
async function loadCurrencies() {
    try {
        const response = await fetch(`${API_BASE_URL}/currencies`);
        const data = await response.json();
        allCurrencies = data;
    } catch (error) {
        console.error('Para birimleri yüklenemedi:', error);
        showNotification('Para birimleri yüklenemedi. Lütfen backend sunucusunu başlatın.', 'error');
    }
}

// Para birimi seçim kutularını doldur
function populateCurrencySelects() {
    const selects = [
        'fromCurrency', 'toCurrency', 'multiFromCurrency',
        'dateFromCurrency', 'dateToCurrency',
        'compareFromCurrency', 'compareToCurrency',
        'addCompareChart'
    ];

    const currencyEmojis = {
        'USD': '🇺🇸', 'EUR': '🇪🇺', 'TRY': '🇹🇷', 'GBP': '🇬🇧',
        'JPY': '🇯🇵', 'CHF': '🇨🇭', 'CAD': '🇨🇦', 'AUD': '🇦🇺',
        'CNY': '🇨🇳', 'INR': '🇮🇳', 'RUB': '🇷🇺', 'BRL': '🇧🇷',
        'ZAR': '🇿🇦', 'KRW': '🇰🇷', 'MXN': '🇲🇽', 'SAR': '🇸🇦',
        'AED': '🇦🇪', 'SEK': '🇸🇪', 'NOK': '🇳🇴', 'DKK': '🇩🇰',
        'PLN': '🇵🇱', 'SGD': '🇸🇬', 'NZD': '🇳🇿'
    };

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentValue = select.value;
        const isCompareSelect = selectId === 'addCompareChart';

        select.innerHTML = isCompareSelect ? '<option value="">+ Para Birimi Ekle</option>' : '';

        Object.entries(allCurrencies.fiat).forEach(([code, info]) => {
            const option = document.createElement('option');
            option.value = code;
            const emoji = currencyEmojis[code] || info.symbol;
            option.textContent = `${emoji} ${code} - ${info.name}`;
            select.appendChild(option);
        });

        if (currentValue && [...select.options].some(opt => opt.value === currentValue)) {
            select.value = currentValue;
        }
    });

    // Varsayılan değerler
    setSelectDefault('fromCurrency', 'TRY');
    setSelectDefault('toCurrency', 'USD');
    setSelectDefault('multiFromCurrency', 'TRY');
    setSelectDefault('dateFromCurrency', 'USD');
    setSelectDefault('dateToCurrency', 'TRY');
    setSelectDefault('compareFromCurrency', 'USD');
    setSelectDefault('compareToCurrency', 'TRY');
}

function setSelectDefault(id, value) {
    const select = document.getElementById(id);
    if (select && !select.value) {
        select.value = value;
    }
}

// Popüler pariteleri yükle
async function loadPopularPairs() {
    try {
        const response = await fetch(`${API_BASE_URL}/popular-pairs`);
        const pairs = await response.json();

        const container = document.getElementById('popularPairs');
        container.innerHTML = '';

        pairs.forEach(pair => {
            if (pair && pair.rate) {
                const card = createPairCard(pair);
                container.appendChild(card);
            }
        });
    } catch (error) {
        console.error('Popüler pariteler yüklenemedi:', error);
        showNotification('Popüler pariteler yüklenemedi. Backend sunucusuna erişilemiyor.', 'error');
    }
}

// Parite kartı oluştur
function createPairCard(pair) {
    const card = document.createElement('div');
    card.className = 'card p-5 cursor-pointer relative group';

    const changeClass = pair.change_24h >= 0 ? 'positive' : 'negative';
    const changeIcon = pair.change_24h >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    const isFav = isFavorite(pair.base, pair.quote);

    card.innerHTML = `
        <button class="star-btn absolute top-4 right-4 ${isFav ? 'active' : ''}"
                onclick="event.stopPropagation(); toggleFavorite('${pair.base}', '${pair.quote}', '${pair.name}')">
            <i class="fas fa-star"></i>
        </button>
        <div class="flex justify-between items-start mb-3 pr-8">
            <h3 class="font-semibold">${pair.name}</h3>
            <span class="text-xs ${changeClass} flex items-center">
                <i class="fas ${changeIcon} mr-1"></i>
                ${Math.abs(pair.change_24h).toFixed(2)}%
            </span>
        </div>
        <p class="stat-value text-2xl">${formatNumber(pair.rate)}</p>
        <p class="text-sm text-muted mt-2">${pair.base}/${pair.quote}</p>
    `;

    card.addEventListener('click', () => {
        showHistoricalChart(pair.base, pair.quote, pair.name);
    });

    return card;
}

function toggleFavorite(base, quote, name) {
    if (isFavorite(base, quote)) {
        removeFromFavorites(base, quote);
    } else {
        addToFavorites(base, quote, name);
    }
    // Kartları yeniden yükle
    loadPopularPairs();
}

// Para birimi dönüştür
async function convertCurrency() {
    const amount = parseFloat(document.getElementById('amount').value);
    const from = document.getElementById('fromCurrency').value;
    const to = document.getElementById('toCurrency').value;

    if (!amount || amount <= 0) {
        showNotification('Lütfen geçerli bir miktar girin', 'error');
        return;
    }

    if (from === to) {
        showNotification('Kaynak ve hedef para birimi aynı olamaz', 'error');
        return;
    }

    try {
        const btn = document.getElementById('convertBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Dönüştürülüyor...';

        const response = await fetch(`${API_BASE_URL}/convert?from_currency=${from}&to_currency=${to}&amount=${amount}`);
        const data = await response.json();

        if (response.ok) {
            displayConversionResult(data);
            // Geçmişe kaydet
            saveToHistory({
                from: data.from,
                to: data.to,
                amount: data.amount,
                result: data.result,
                rate: data.rate
            });
        } else {
            throw new Error(data.detail || 'Dönüştürme hatası');
        }
    } catch (error) {
        console.error('Dönüştürme hatası:', error);
        showNotification('Dönüştürme işlemi başarısız oldu', 'error');
    } finally {
        const btn = document.getElementById('convertBtn');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Dönüştür';
    }
}

// Dönüştürme sonucunu göster
function displayConversionResult(data) {
    const resultDiv = document.getElementById('conversionResult');
    const resultAmount = document.getElementById('resultAmount');
    const resultCurrency = document.getElementById('resultCurrency');
    const exchangeRate = document.getElementById('exchangeRate');

    resultAmount.textContent = formatNumber(data.result);
    resultCurrency.textContent = data.to;
    exchangeRate.textContent = `Kur: 1 ${data.from} = ${formatNumber(data.rate)} ${data.to}`;

    resultDiv.classList.remove('hidden');
    resultDiv.classList.add('animate-fadeIn');
}

// Çoklu dönüşüm
async function multiConvert() {
    const from = document.getElementById('multiFromCurrency').value;
    const amount = parseFloat(document.getElementById('multiAmount').value);

    if (!amount || amount <= 0) {
        showNotification('Lütfen geçerli bir miktar girin', 'error');
        return;
    }

    try {
        const btn = document.getElementById('multiConvertBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Dönüştürülüyor...';

        const response = await fetch(`${API_BASE_URL}/multi-convert?from_currency=${from}&amount=${amount}`);
        const data = await response.json();

        if (response.ok) {
            displayMultiConversionResults(data);
        } else {
            throw new Error(data.detail || 'Çoklu dönüşüm hatası');
        }
    } catch (error) {
        console.error('Çoklu dönüşüm hatası:', error);
        showNotification('Çoklu dönüşüm işlemi başarısız oldu', 'error');
    } finally {
        const btn = document.getElementById('multiConvertBtn');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-calculator mr-2"></i>Tüm Para Birimlerine Dönüştür';
    }
}

// Çoklu dönüşüm sonuçlarını göster
function displayMultiConversionResults(data) {
    const container = document.getElementById('multiConversionResults');
    container.innerHTML = '';
    container.classList.remove('hidden');

    data.conversions.forEach(conversion => {
        const card = document.createElement('div');
        card.className = 'card p-5';

        card.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <span class="text-2xl">${conversion.symbol}</span>
                <span class="text-sm font-semibold text-success px-2 py-1 bg-success-light rounded-lg">${conversion.currency}</span>
            </div>
            <p class="stat-value text-xl">${formatNumber(conversion.amount)}</p>
            <p class="text-sm text-secondary mt-2">${conversion.name}</p>
            <p class="text-xs text-muted mt-3 pt-3" style="border-top: 1px solid var(--border);">Kur: ${formatNumber(conversion.rate)}</p>
        `;

        container.appendChild(card);
    });
}

// Geçmiş grafik göster
async function showHistoricalChart(base, quote, name = null) {
    if (!name) {
        const baseName = allCurrencies.fiat[base]?.name || base;
        const quoteName = allCurrencies.fiat[quote]?.name || quote;
        name = `${baseName}/${quoteName}`;
    }

    currentPair = { base, quote, name };
    comparisonCurrencies = []; // Karşılaştırma sıfırla
    document.getElementById('removeCompareBtn').classList.add('hidden');

    const chartSection = document.getElementById('chartSection');
    const chartTitle = document.getElementById('chartTitle');

    chartTitle.textContent = `${name} - Son 7 Gün`;
    chartSection.classList.remove('hidden');

    chartSection.scrollIntoView({ behavior: 'smooth' });

    const sevenDayBtn = document.querySelector('.chart-period-btn[data-days="7"]');
    if (sevenDayBtn) {
        updatePeriodButtons(sevenDayBtn);
    }

    await loadHistoricalData(base, quote, 7);
}

// Geçmiş verileri yükle
async function loadHistoricalData(base, quote, days = 7) {
    try {
        // Ana veri
        const mainData = await fetchHistoricalData(base, quote, days);
        if (!mainData) return;

        // Karşılaştırma verileri
        const comparisonData = [];
        for (const currency of comparisonCurrencies) {
            const data = await fetchHistoricalData(base, currency, days);
            if (data) {
                comparisonData.push({ currency, data: data.data });
            }
        }

        renderChart(mainData, comparisonData);
    } catch (error) {
        console.error('Geçmiş veri yüklenemedi:', error);
        showNotification('Grafik verileri yüklenemedi', 'error');
    }
}

async function fetchHistoricalData(base, quote, days) {
    const response = await fetch(`${API_BASE_URL}/history/${base}/${quote}?days=${days}`);
    const data = await response.json();

    if (response.ok) {
        return data;
    }
    return null;
}

// Grafik çiz
function renderChart(data, comparisonData = []) {
    if (!data || !data.data || data.data.length === 0) {
        showNotification('Grafik için yeterli veri yok', 'error');
        return;
    }

    const ctx = document.getElementById('historicalChart');
    if (!ctx) return;

    const context = ctx.getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = data.data.map(d => {
        try {
            const date = new Date(d.date);
            return date.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' });
        } catch (e) {
            return d.date;
        }
    });

    const colors = [
        { border: 'rgb(147, 51, 234)', bg: 'rgba(147, 51, 234, 0.1)' },
        { border: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.1)' },
        { border: 'rgb(16, 185, 129)', bg: 'rgba(16, 185, 129, 0.1)' },
        { border: 'rgb(245, 158, 11)', bg: 'rgba(245, 158, 11, 0.1)' }
    ];

    const datasets = [{
        label: `${data.base}/${data.quote}`,
        data: data.data.map(d => d.rate),
        borderColor: colors[0].border,
        backgroundColor: colors[0].bg,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: colors[0].border,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 6
    }];

    // Karşılaştırma verilerini ekle
    comparisonData.forEach((comp, index) => {
        const colorIndex = (index + 1) % colors.length;
        datasets.push({
            label: `${data.base}/${comp.currency}`,
            data: comp.data.map(d => d.rate),
            borderColor: colors[colorIndex].border,
            backgroundColor: colors[colorIndex].bg,
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: colors[colorIndex].border,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 5
        });
    });

    chartInstance = new Chart(context, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1f2937'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${formatNumber(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function (value) {
                            return formatNumber(value);
                        },
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#4b5563'
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#e5e7eb'
                    }
                },
                x: {
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#4b5563'
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#e5e7eb'
                    }
                }
            }
        }
    });
}

// Para birimi ara
function searchCurrencies() {
    const searchTerm = document.getElementById('currencySearch').value.toLowerCase();
    const resultsContainer = document.getElementById('searchResults');

    if (searchTerm.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }

    const results = [];

    Object.entries(allCurrencies.fiat).forEach(([code, info]) => {
        if (code.toLowerCase().includes(searchTerm) ||
            info.name.toLowerCase().includes(searchTerm)) {
            results.push({ code, ...info, type: 'fiat' });
        }
    });

    displaySearchResults(results);
}

// Arama sonuçlarını göster
function displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    container.innerHTML = '';

    if (results.length === 0) {
        container.innerHTML = '<p class="text-muted text-center col-span-full">Sonuç bulunamadı</p>';
        return;
    }

    results.forEach(currency => {
        const card = document.createElement('div');
        card.className = 'card p-5 cursor-pointer';

        card.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <span class="text-3xl">${currency.symbol}</span>
                <i class="fas fa-money-bill text-accent"></i>
            </div>
            <h3 class="text-lg font-semibold">${currency.code}</h3>
            <p class="text-sm text-secondary mt-1">${currency.name}</p>
            <span class="inline-block mt-3 px-3 py-1 text-xs font-medium rounded-full bg-accent-light text-accent">
                Fiat
            </span>
        `;

        card.addEventListener('click', () => {
            document.getElementById('fromCurrency').value = currency.code;
            document.getElementById('currencySearch').value = '';
            container.innerHTML = '';
            showNotification(`${currency.name} seçildi`, 'success');
        });

        container.appendChild(card);
    });
}

// Sayıyı formatla
function formatNumber(num) {
    if (num === null || num === undefined) return '0.00';

    const absNum = Math.abs(num);

    if (absNum >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (absNum >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    } else if (absNum < 0.01 && absNum > 0) {
        return num.toFixed(8);
    } else if (absNum < 1) {
        return num.toFixed(4);
    } else {
        return num.toFixed(2);
    }
}

// Bildirim göster
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg text-white z-50 ${type === 'error' ? 'bg-red-500' :
        type === 'success' ? 'bg-green-500' :
            'bg-blue-500'
        }`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'} mr-3"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transition = 'opacity 0.5s';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}
