# ============================================================
# KurTakip - Döviz Kuru Takip Uygulaması
# KurTakip - Currency Exchange Rate Tracker
# ============================================================

# --- Kütüphaneleri içe aktar / Import libraries ---
import logging
import os
import random
from datetime import datetime, timedelta
from pathlib import Path

import requests
from flask import Flask, jsonify, request, send_from_directory

# --- Log ayarları / Logging setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Flask uygulamasını oluştur / Create Flask app ---
app = Flask(__name__)


# ============================================================
# CORS Ayarları / CORS Settings
# Başka sitelerden API'ye istek atılabilmesini sağlar
# Allows other websites to make requests to this API
# ============================================================
@app.after_request
def add_cors_headers(response):
    """
    Her yanıta CORS başlıklarını ekler.
    Adds CORS headers to every response.
    """
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response


# ============================================================
# Sabitler ve Ayarlar / Constants and Settings
# ============================================================

# Bu dosyanın bulunduğu klasör / Folder where this file is located
this_file = Path(__file__)
BASE_DIR = this_file.parent

# API adresleri / API URLs
# Güncel kurlar için (ücretsiz) / For current rates (free)
CURRENT_RATES_URL = "https://api.exchangerate-api.com/v4/latest"
# Geçmiş veriler için (ücretsiz) / For historical data (free)
HISTORICAL_URL = "https://api.frankfurter.app"

# Gerçek geçmiş verileri kullan mı? / Use real historical data?
# Ortam değişkeninden okunur, varsayılan: true
# Read from environment variable, default: true
env_value = os.getenv("USE_REAL_HISTORICAL_DATA", "true")
env_value = env_value.lower()
USE_REAL_HISTORICAL_DATA = (env_value == "true")

# API bekleme süresi (saniye) / API timeout (seconds)
API_TIMEOUT = 5.0

# Varsayılan geçmiş veri gün sayısı / Default number of days for history
DEFAULT_DAYS = 30

# Sahte veri için rastgele değişim oranı (%2)
# Random variation for fake data (2%)
VARIATION = 0.02

# --- Desteklenen para birimleri / Supported currencies ---
# Her para biriminin Türkçe adı ve sembolü var
# Each currency has a Turkish name and symbol
CURRENCIES = {
    "USD": {"name": "Amerikan Doları", "symbol": "$"},
    "EUR": {"name": "Euro", "symbol": "€"},
    "TRY": {"name": "Türk Lirası", "symbol": "₺"},
    "GBP": {"name": "İngiliz Sterlini", "symbol": "£"},
    "JPY": {"name": "Japon Yeni", "symbol": "¥"},
    "CHF": {"name": "İsviçre Frangı", "symbol": "CHF"},
    "CAD": {"name": "Kanada Doları", "symbol": "C$"},
    "AUD": {"name": "Avustralya Doları", "symbol": "A$"},
    "CNY": {"name": "Çin Yuanı", "symbol": "¥"},
    "INR": {"name": "Hindistan Rupisi", "symbol": "₹"},
    "RUB": {"name": "Rus Rublesi", "symbol": "₽"},
    "BRL": {"name": "Brezilya Reali", "symbol": "R$"},
    "ZAR": {"name": "Güney Afrika Randı", "symbol": "R"},
    "KRW": {"name": "Güney Kore Wonu", "symbol": "₩"},
    "MXN": {"name": "Meksika Pezosu", "symbol": "Mex$"},
    "SAR": {"name": "Suudi Arabistan Riyali", "symbol": "﷼"},
    "AED": {"name": "BAE Dirhemi", "symbol": "د.إ"},
    "SEK": {"name": "İsveç Kronu", "symbol": "kr"},
    "NOK": {"name": "Norveç Kronu", "symbol": "kr"},
    "DKK": {"name": "Danimarka Kronu", "symbol": "kr"},
    "PLN": {"name": "Polonya Zlotisi", "symbol": "zł"},
    "SGD": {"name": "Singapur Doları", "symbol": "S$"},
    "NZD": {"name": "Yeni Zelanda Doları", "symbol": "NZ$"},
}


# ============================================================
# Yardımcı Fonksiyonlar / Helper Functions
# ============================================================

def get_rates(base_currency):
    """
    İnternetten güncel döviz kurlarını çeker.
    Fetches current exchange rates from the internet.

    Parametre / Parameter:
        base_currency: Para birimi kodu / Currency code (örn: "USD")

    Döndürür / Returns:
        Başarılı ise: kur verileri (sözlük) / rate data (dictionary)
        Hata varsa: None
    """
    # API adresini oluştur / Build API URL
    url = CURRENT_RATES_URL + "/" + base_currency

    try:
        # İnternete istek gönder / Send request to internet
        response = requests.get(url, timeout=API_TIMEOUT)

        # 200 = başarılı istek / 200 = successful request
        if response.status_code == 200:
            data = response.json()
            return data
        else:
            logger.error("API hatası / API error: " + str(response.status_code))
            return None

    except requests.Timeout:
        # İnternet çok yavaş / Internet too slow
        logger.error("API zaman aşımı / API timeout: " + base_currency)
        return None
    except Exception as error:
        # Başka bir hata oldu / Some other error happened
        logger.error("Hata / Error: " + str(error))
        return None


def is_valid_currency(currency_code):
    """
    Bu para birimini destekliyor muyuz kontrol eder.
    Checks if we support this currency.

    Parametre / Parameter:
        currency_code: Kontrol edilecek kod / Code to check (örn: "USD")

    Döndürür / Returns:
        True = destekleniyor / supported
        False = desteklenmiyor / not supported
    """
    if currency_code in CURRENCIES:
        return True
    else:
        return False


def get_historical_rates(base_currency, quote_currency, day_count):
    """
    Frankfurter API'den geçmiş kur verilerini çeker.
    Fetches historical rate data from Frankfurter API.

    Parametreler / Parameters:
        base_currency: Temel para birimi / Base currency (örn: "USD")
        quote_currency: Hedef para birimi / Target currency (örn: "TRY")
        day_count: Kaç günlük veri / How many days of data

    Döndürür / Returns:
        Başarılı ise: tarih ve kur listesi / list of date and rate
        Hata varsa: None
    """
    try:
        # Tarih aralığını hesapla / Calculate date range
        today = datetime.now()
        start_date = today - timedelta(days=day_count)

        # Tarihleri yazıya çevir / Convert dates to text
        start_date_text = start_date.strftime('%Y-%m-%d')
        end_date_text = today.strftime('%Y-%m-%d')

        # API adresini oluştur / Build API URL
        url = HISTORICAL_URL + "/" + start_date_text + ".." + end_date_text

        # API parametreleri / API parameters
        api_params = {"from": base_currency, "to": quote_currency}

        # İstek gönder (geçmiş veri daha uzun sürebilir)
        # Send request (historical data may take longer)
        long_timeout = API_TIMEOUT * 2
        response = requests.get(url, params=api_params, timeout=long_timeout)

        # Yanıt başarılı mı? / Is response successful?
        if response.status_code != 200:
            logger.error("Frankfurter API hatası: " + str(response.status_code))
            return None

        data = response.json()

        # Yanıtta "rates" anahtarı var mı? / Does response have "rates" key?
        if "rates" not in data:
            logger.error("API'den beklenmeyen yanıt / Unexpected API response")
            return None

        # Verileri tarihe göre sırala / Sort data by date
        rates_data = data["rates"]
        result_list = []

        all_dates = list(rates_data.keys())
        all_dates.sort()

        for current_date in all_dates:
            day_rates = rates_data[current_date]

            # Bu tarihte hedef para birimi var mı? / Does this date have the target currency?
            if quote_currency in day_rates:
                rate_value = day_rates[quote_currency]
                rate_value = float(rate_value)

                item = {
                    "date": current_date,
                    "rate": rate_value
                }
                result_list.append(item)

        # Hafta sonları veri olmayabilir, bu normal
        # Weekends may have no data, that's normal
        if len(result_list) < day_count:
            logger.info(
                str(len(result_list)) + " gün veri bulundu / days of data found "
                "(hafta sonları hariç / weekends excluded)"
            )

        # Sonuç var mı? / Any results?
        if len(result_list) > 0:
            return result_list
        else:
            return None

    except requests.Timeout:
        logger.error("API zaman aşımı / timeout: " + base_currency + "/" + quote_currency)
        return None
    except Exception as error:
        logger.error("Geçmiş veri hatası / Historical data error: " + str(error))
        return None


def make_fake_history(current_rate, day_count):
    """
    Sahte geçmiş veri üretir (gerçek veri alınamazsa kullanılır).
    Generates fake historical data (used when real data is unavailable).

    Parametreler / Parameters:
        current_rate: Bugünkü kur / Today's rate (örn: 32.50)
        day_count: Kaç gün / How many days

    Döndürür / Returns:
        Tarih ve kur listesi / List of date and rate
    """
    today = datetime.now()
    fake_data = []

    for i in range(day_count):
        # Bugünden geriye doğru tarih hesapla / Calculate date going backwards
        date = today - timedelta(days=day_count - i)

        # Rastgele küçük bir değişim ekle (±%2)
        # Add small random change (±2%)
        random_change = random.uniform(-VARIATION, VARIATION)
        rate = current_rate * (1 + random_change)

        item = {
            "date": date.strftime("%Y-%m-%d"),
            "rate": rate
        }
        fake_data.append(item)

    return fake_data


# ============================================================
# API Endpoint'leri / API Endpoints
# Her endpoint bir URL adresidir ve tarayıcıdan erişilebilir
# Each endpoint is a URL that can be accessed from the browser
# ============================================================

@app.route("/api")
def api_info():
    """
    API hakkında bilgi döndürür.
    Returns information about the API.
    """
    info = {
        "message": "KurTakip API'ye Hoş Geldiniz! / Welcome to KurTakip API!",
        "version": "1.0.0",
        "endpoints": {
            "currencies": "/api/currencies",
            "rates": "/api/rates/{base}",
            "convert": "/api/convert?from_currency=USD&to_currency=TRY&amount=100",
            "history": "/api/history/{base}/{quote}?days=30",
            "popular": "/api/popular-pairs",
            "multi-convert": "/api/multi-convert?from_currency=USD&amount=100",
            "rate-on-date": "/api/rate-on-date/{base}/{quote}/{date}",
            "compare-dates": "/api/compare-dates/{base}/{quote}?start_date=X&end_date=Y"
        }
    }
    return jsonify(info)


@app.route("/api/currencies")
def list_currencies():
    """
    Desteklenen tüm para birimlerini listeler.
    Lists all supported currencies.
    """
    result = {
        "fiat": CURRENCIES,
        "total": len(CURRENCIES)
    }
    return jsonify(result)


@app.route("/api/rates/<base_currency>")
def show_rates(base_currency):
    """
    Bir para biriminin tüm kurlarını gösterir.
    Shows all exchange rates for a currency.

    Örnek / Example: /api/rates/USD -> 1 USD = ? EUR, TRY, GBP...
    """
    base_currency = base_currency.upper()

    # Para birimi geçerli mi? / Is currency valid?
    if not is_valid_currency(base_currency):
        return jsonify({"error": "Para birimi bulunamadı / Currency not found"}), 404

    # Kurları internetten al / Get rates from internet
    data = get_rates(base_currency)
    if data is None:
        return jsonify({"error": "Kurlar alınamadı / Could not fetch rates"}), 500

    # Tarih bilgisini al / Get date info
    date = data.get("date")

    # Kur bilgilerini al / Get rate info
    rates = data.get("rates")
    if rates is None:
        rates = {}

    result = {
        "base": base_currency,
        "date": date,
        "rates": rates
    }
    return jsonify(result)


@app.route("/api/convert")
def convert():
    """
    İki para birimi arasında dönüşüm yapar.
    Converts between two currencies.

    Örnek / Example: /api/convert?from_currency=USD&to_currency=TRY&amount=100
    100 USD kaç TRY eder? / How much TRY is 100 USD?
    """
    # --- 1. Parametreleri URL'den al / Get parameters from URL ---

    # Kaynak para birimi / Source currency
    from_currency = request.args.get('from_currency', '')
    from_currency = from_currency.upper()

    # Hedef para birimi / Target currency
    to_currency = request.args.get('to_currency', '')
    to_currency = to_currency.upper()

    # Miktar / Amount
    try:
        amount_text = request.args.get('amount', '0')
        amount = float(amount_text)
    except (ValueError, TypeError):
        return jsonify({"error": "Geçersiz miktar / Invalid amount"}), 400

    # --- 2. Kontroller / Validations ---

    # Miktar pozitif olmalı / Amount must be positive
    if amount <= 0:
        return jsonify({"error": "Miktar 0'dan büyük olmalı / Amount must be > 0"}), 400

    # Kaynak para birimi geçerli mi? / Is source currency valid?
    from_valid = is_valid_currency(from_currency)
    if not from_valid:
        return jsonify({"error": "Geçersiz para birimi / Invalid currency"}), 400

    # Hedef para birimi geçerli mi? / Is target currency valid?
    to_valid = is_valid_currency(to_currency)
    if not to_valid:
        return jsonify({"error": "Geçersiz para birimi / Invalid currency"}), 400

    # --- 3. Dönüşüm yap / Do the conversion ---

    # Kurları internetten al / Get rates from internet
    data = get_rates(from_currency)
    if data is None:
        return jsonify({"error": "Kurlar alınamadı / Could not fetch rates"}), 500

    # Hedef kuru bul / Find target rate
    all_rates = data["rates"]
    rate = all_rates.get(to_currency)
    if rate is None:
        return jsonify({"error": "Kur bulunamadı / Rate not found"}), 404

    # Sonucu hesapla / Calculate result
    result = amount * rate

    # --- 4. Sonucu döndür / Return result ---
    now = str(datetime.now())

    return jsonify({
        "from": from_currency,
        "to": to_currency,
        "amount": amount,
        "rate": rate,
        "result": result,
        "timestamp": now
    })


@app.route("/api/history/<base_currency>/<quote_currency>")
def history(base_currency, quote_currency):
    """
    Bir döviz çiftinin geçmiş verilerini getirir.
    Returns historical data for a currency pair.

    Örnek / Example: /api/history/USD/TRY?days=7
    Son 7 günde USD/TRY nasıl değişti? / How did USD/TRY change in the last 7 days?
    """
    base_currency = base_currency.upper()
    quote_currency = quote_currency.upper()

    # Kaç günlük veri isteniyor? / How many days of data?
    days_text = request.args.get('days', str(DEFAULT_DAYS))
    day_count = int(days_text)

    logger.info("Geçmiş veri isteği / History request: " + base_currency + "/" + quote_currency + " - " + str(day_count) + " gün/days")

    # Para birimleri geçerli mi? / Are currencies valid?
    base_valid = is_valid_currency(base_currency)
    quote_valid = is_valid_currency(quote_currency)
    if not base_valid or not quote_valid:
        return jsonify({"error": "Geçersiz para birimi / Invalid currency"}), 400

    # Gün sayısı 1-365 arası olmalı / Days must be between 1-365
    if day_count <= 0 or day_count > 365:
        return jsonify({"error": "Gün 1-365 arası olmalı / Days must be 1-365"}), 400

    # Önce gerçek veriyi dene / Try real data first
    if USE_REAL_HISTORICAL_DATA:
        real_data = get_historical_rates(base_currency, quote_currency, day_count)

        if real_data is not None:
            return jsonify({
                "base": base_currency,
                "quote": quote_currency,
                "days": day_count,
                "data": real_data,
                "note": "Gerçek veri (Frankfurter.app) / Real data from Frankfurter.app"
            })
        else:
            logger.warning("Gerçek veri alınamadı, sahte veri kullanılıyor / Real data failed, using simulated")

    # Gerçek veri yoksa sahte veri üret / If no real data, generate fake data
    data = get_rates(base_currency)
    if data is None:
        return jsonify({"error": "Kurlar alınamadı / Could not fetch rates"}), 500

    # Bugünkü kuru al / Get today's rate
    all_rates = data["rates"]
    current_rate = all_rates.get(quote_currency)
    if current_rate is None:
        current_rate = 1.0

    fake_data = make_fake_history(current_rate, day_count)

    return jsonify({
        "base": base_currency,
        "quote": quote_currency,
        "days": day_count,
        "data": fake_data,
        "note": "Simüle edilmiş veri / Simulated data"
    })


@app.route("/api/popular-pairs")
def popular_pairs():
    """
    En çok takip edilen döviz çiftlerinin kurlarını getirir.
    Returns rates for the most popular currency pairs.
    """
    # Popüler çiftler listesi / Popular pairs list
    pairs = [
        {"base": "USD", "quote": "TRY", "name": "Dolar/TL"},
        {"base": "EUR", "quote": "TRY", "name": "Euro/TL"},
        {"base": "GBP", "quote": "TRY", "name": "Sterlin/TL"},
        {"base": "EUR", "quote": "USD", "name": "Euro/Dolar"},
        {"base": "GBP", "quote": "USD", "name": "Sterlin/Dolar"},
        {"base": "JPY", "quote": "USD", "name": "Yen/Dolar"},
        {"base": "CHF", "quote": "USD", "name": "Frank/Dolar"},
        {"base": "USD", "quote": "CAD", "name": "Dolar/Kanada Doları"},
    ]

    results = []

    # Her popüler çift için kur bilgisini al / Get rate for each popular pair
    for pair in pairs:
        base_code = pair["base"]
        quote_code = pair["quote"]

        # Para birimleri geçerli mi? / Are currencies valid?
        base_valid = is_valid_currency(base_code)
        quote_valid = is_valid_currency(quote_code)

        if base_valid and quote_valid:
            # Kuru internetten al / Get rate from internet
            data = get_rates(base_code)

            if data is not None:
                all_rates = data["rates"]
                rate = all_rates.get(quote_code)

                if rate is not None:
                    results.append({
                        "base": base_code,
                        "quote": quote_code,
                        "name": pair["name"],
                        "rate": rate,
                        "change_24h": 0  # 24 saatlik değişim (henüz yok) / 24h change (not yet available)
                    })

    return jsonify(results)


@app.route("/api/multi-convert")
def multi_convert():
    """
    Bir para birimini birden fazla para birimine çevirir.
    Converts one currency to multiple currencies at once.

    Örnek / Example: /api/multi-convert?from_currency=USD&amount=100
    100 USD = kaç EUR, TRY, GBP? / 100 USD = how much EUR, TRY, GBP?
    """
    # Kaynak para birimi / Source currency
    from_currency = request.args.get('from_currency', '')
    from_currency = from_currency.upper()

    # Hedef para birimleri (virgülle ayrılmış) / Target currencies (comma separated)
    target_currencies_input = request.args.get('to_currencies', '')

    # Miktar / Amount
    try:
        amount_text = request.args.get('amount', '0')
        amount = float(amount_text)
    except (ValueError, TypeError):
        return jsonify({"error": "Geçersiz miktar / Invalid amount"}), 400

    if amount <= 0:
        return jsonify({"error": "Miktar 0'dan büyük olmalı / Amount must be > 0"}), 400

    if not is_valid_currency(from_currency):
        return jsonify({"error": "Geçersiz kaynak para birimi / Invalid source currency"}), 400

    # Hedef para birimlerini belirle / Determine target currencies
    if target_currencies_input:
        # Kullanıcı belirttiyse / If user specified
        # Örnek / Example: "EUR,TRY,GBP" -> ["EUR", "TRY", "GBP"]
        parts = target_currencies_input.split(",")
        target_list = []
        for part in parts:
            code = part.strip()
            code = code.upper()
            if is_valid_currency(code):
                target_list.append(code)
    else:
        # Varsayılan hedefler / Default targets
        target_list = ["USD", "EUR", "TRY", "GBP", "JPY", "CHF"]

    # Kaynak para birimini hedef listesinden çıkar
    # Remove source currency from target list
    filtered_targets = []
    for target_code in target_list:
        if target_code != from_currency:
            filtered_targets.append(target_code)
    target_list = filtered_targets

    if len(target_list) == 0:
        return jsonify({"error": "Geçerli hedef bulunamadı / No valid targets found"}), 400

    # Kurları internetten al / Get rates from internet
    data = get_rates(from_currency)
    if data is None:
        return jsonify({"error": "Kurlar alınamadı / Could not fetch rates"}), 500

    # Her hedef para birimi için dönüşüm yap
    # Convert for each target currency
    conversions = []
    all_rates = data["rates"]

    for target_code in target_list:
        rate = all_rates.get(target_code)

        if rate is not None:
            currency_info = CURRENCIES[target_code]
            converted_amount = amount * rate

            conversions.append({
                "currency": target_code,
                "symbol": currency_info["symbol"],
                "name": currency_info["name"],
                "rate": rate,
                "amount": converted_amount
            })

    now = str(datetime.now())

    return jsonify({
        "from": from_currency,
        "amount": amount,
        "conversions": conversions,
        "timestamp": now
    })


@app.route("/api/rate-on-date/<base_currency>/<quote_currency>/<date>")
def rate_on_date(base_currency, quote_currency, date):
    """
    Belirli bir tarihteki döviz kurunu getirir.
    Returns the exchange rate for a specific date.

    Örnek / Example: /api/rate-on-date/USD/TRY/2024-12-01
    1 Aralık 2024'te 1 USD kaç TRY'ydi? / How much TRY was 1 USD on Dec 1, 2024?
    """
    base_currency = base_currency.upper()
    quote_currency = quote_currency.upper()

    # Para birimleri geçerli mi? / Are currencies valid?
    base_valid = is_valid_currency(base_currency)
    quote_valid = is_valid_currency(quote_currency)
    if not base_valid or not quote_valid:
        return jsonify({"error": "Geçersiz para birimi / Invalid currency"}), 400

    # Tarih formatını kontrol et / Check date format (YYYY-MM-DD)
    try:
        parsed_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Geçersiz tarih. YYYY-MM-DD kullanın / Invalid date. Use YYYY-MM-DD"}), 400

    # Gelecek tarih sorgulanamaz / Cannot query future dates
    now = datetime.now()
    if parsed_date > now:
        return jsonify({"error": "Gelecek tarih sorgulanamaz / Cannot query future dates"}), 400

    try:
        # API'den o tarihteki kuru al / Get rate from API for that date
        url = HISTORICAL_URL + "/" + date
        api_params = {"from": base_currency, "to": quote_currency}
        response = requests.get(url, params=api_params, timeout=API_TIMEOUT)

        # İstek başarısız mı? / Request failed?
        if response.status_code != 200:
            return jsonify({"error": "API'den veri alınamadı / Could not fetch from API"}), 500

        data = response.json()

        # Kur var mı kontrol et / Check if rate exists
        has_rates = "rates" in data
        has_quote = has_rates and (quote_currency in data["rates"])

        if has_quote:
            rate = data["rates"][quote_currency]
            return jsonify({
                "base": base_currency,
                "quote": quote_currency,
                "date": date,
                "rate": rate,
                "source": "Frankfurter.app (Avrupa Merkez Bankası / European Central Bank)"
            })
        else:
            return jsonify({"error": "Bu tarih için kur bulunamadı / No rate found for this date"}), 404

    except requests.Timeout:
        return jsonify({"error": "API zaman aşımı / API timeout"}), 500
    except Exception as error:
        logger.error("Tarih sorgu hatası / Date query error: " + str(error))
        return jsonify({"error": "Bir hata oluştu / An error occurred"}), 500


@app.route("/api/compare-dates/<base_currency>/<quote_currency>")
def compare_dates(base_currency, quote_currency):
    """
    İki farklı tarihteki kurları karşılaştırır.
    Compares exchange rates between two different dates.

    Örnek / Example:
        /api/compare-dates/USD/TRY?start_date=2024-01-01&end_date=2024-12-01
        Bu tarihler arasında USD/TRY ne kadar değişti?
        How much did USD/TRY change between these dates?
    """
    base_currency = base_currency.upper()
    quote_currency = quote_currency.upper()

    # Para birimleri geçerli mi? / Are currencies valid?
    base_valid = is_valid_currency(base_currency)
    quote_valid = is_valid_currency(quote_currency)
    if not base_valid or not quote_valid:
        return jsonify({"error": "Geçersiz para birimi / Invalid currency"}), 400

    # Tarih parametrelerini al / Get date parameters from URL
    start_date = request.args.get("start_date", "")
    end_date = request.args.get("end_date", "")

    # İki tarih de girilmeli / Both dates are required
    if not start_date or not end_date:
        return jsonify({"error": "start_date ve end_date gerekli / Both dates required"}), 400

    # Tarih formatlarını kontrol et / Check date formats (YYYY-MM-DD)
    try:
        start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
        end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Geçersiz tarih. YYYY-MM-DD kullanın / Invalid date format"}), 400

    # Gelecek tarih kontrolü / Check for future dates
    now = datetime.now()
    if start_datetime > now or end_datetime > now:
        return jsonify({"error": "Gelecek tarih sorgulanamaz / Cannot query future dates"}), 400

    try:
        # --- Başlangıç tarihinin kurunu al / Get rate for start date ---
        start_rate = None

        url = HISTORICAL_URL + "/" + start_date
        api_params = {"from": base_currency, "to": quote_currency}
        response = requests.get(url, params=api_params, timeout=API_TIMEOUT)

        if response.status_code == 200:
            data = response.json()
            has_rates = "rates" in data
            has_quote = has_rates and (quote_currency in data["rates"])
            if has_quote:
                start_rate = data["rates"][quote_currency]

        if start_rate is None:
            return jsonify({"error": start_date + " tarihi için kur bulunamadı / No rate for " + start_date}), 404

        # --- Bitiş tarihinin kurunu al / Get rate for end date ---
        end_rate = None

        url = HISTORICAL_URL + "/" + end_date
        response = requests.get(url, params=api_params, timeout=API_TIMEOUT)

        if response.status_code == 200:
            data = response.json()
            has_rates = "rates" in data
            has_quote = has_rates and (quote_currency in data["rates"])
            if has_quote:
                end_rate = data["rates"][quote_currency]

        if end_rate is None:
            return jsonify({"error": end_date + " tarihi için kur bulunamadı / No rate for " + end_date}), 404

        # --- Değişim yüzdesini hesapla / Calculate percentage change ---
        difference = end_rate - start_rate
        change_percent = (difference / start_rate) * 100
        change_percent = round(change_percent, 2)

        # Yön belirle (artış mı düşüş mü?) / Determine direction (up or down?)
        if change_percent > 0:
            direction = "artış"
        elif change_percent < 0:
            direction = "düşüş"
        else:
            direction = "değişim yok"

        return jsonify({
            "base": base_currency,
            "quote": quote_currency,
            "start_date": start_date,
            "end_date": end_date,
            "start_rate": start_rate,
            "end_rate": end_rate,
            "change_percent": change_percent,
            "change_direction": direction,
            "source": "Frankfurter.app (Avrupa Merkez Bankası / European Central Bank)"
        })

    except requests.Timeout:
        return jsonify({"error": "API zaman aşımı / API timeout"}), 500
    except Exception as error:
        logger.error("Karşılaştırma hatası / Comparison error: " + str(error))
        return jsonify({"error": "Bir hata oluştu / An error occurred"}), 500


# ============================================================
# Sayfa Servisi / Page Serving
# Kullanıcıya HTML ve JavaScript dosyalarını gönderir
# Serves HTML and JavaScript files to the user
# ============================================================

@app.route("/")
def home():
    """
    Ana sayfayı gösterir.
    Shows the home page.
    """
    static_folder = os.path.join(BASE_DIR, "static")
    return send_from_directory(static_folder, "index.html")


@app.route("/js/app.js")
def serve_js():
    """
    JavaScript dosyasını gönderir.
    Serves the JavaScript file.
    """
    js_folder = os.path.join(BASE_DIR, "static", "js")
    return send_from_directory(js_folder, "app.js", mimetype="application/javascript")


# ============================================================
# Uygulamayı Başlat / Start the Application
# Bu kısım sadece "python app.py" komutuyla çalıştırıldığında çalışır
# This part only runs when you execute "python app.py" directly
# ============================================================

if __name__ == "__main__":
    print("")
    print("=" * 50)
    print("  KurTakip Başlatıldı! / Started!")
    print("=" * 50)
    print("")
    print("  Tarayıcıda aç / Open in browser:")
    print("  http://localhost:5000")
    print("")
    print("  Durdurmak için / To stop: CTRL+C")
    print("=" * 50)
    print("")

    # 0.0.0.0 = tüm ağ bağlantılarını dinle (Docker için gerekli)
    # 0.0.0.0 = listen on all network connections (required for Docker)
    app.run(host="0.0.0.0", port=5000, debug=False)
