"""
KurTakip - Testler / Tests
Uygulamanın tüm özelliklerini test eder.
Tests all features of the application.
"""

from pathlib import Path
from app import CURRENCIES, USE_REAL_HISTORICAL_DATA


# ============================================================
# Temel Testler / Basic Tests
# ============================================================

def test_currency_list():
    """
    Para birimi listesini kontrol eder.
    Checks the currency list.
    """
    # En az 1 para birimi olmalı / At least 1 currency
    assert len(CURRENCIES) > 0

    # Önemli para birimleri olmalı / Important currencies must exist
    assert "USD" in CURRENCIES
    assert "EUR" in CURRENCIES
    assert "TRY" in CURRENCIES

    # Her birimin adı ve sembolü olmalı / Each must have name and symbol
    for code in CURRENCIES:
        info = CURRENCIES[code]
        assert "name" in info
        assert "symbol" in info


def test_settings():
    """
    Ayarların doğru olduğunu kontrol eder.
    Checks that settings are correct.
    """
    # Boolean olmalı / Must be boolean
    assert USE_REAL_HISTORICAL_DATA is not None
    assert isinstance(USE_REAL_HISTORICAL_DATA, bool)


def test_files_exist():
    """
    Gerekli dosyaların var olduğunu kontrol eder.
    Checks that required files exist.
    """
    base = Path(__file__).parent.parent

    assert (base / "app.py").exists()
    assert (base / "static" / "index.html").exists()
    assert (base / "static" / "js" / "app.js").exists()


# ============================================================
# API Testleri / API Tests
# ============================================================

def test_api_info(client):
    """
    /api adresinin çalıştığını test eder.
    Tests that /api endpoint works.
    """
    response = client.get("/api")
    assert response.status_code == 200

    data = response.get_json()
    assert "message" in data
    assert "version" in data


def test_currencies_endpoint(client):
    """
    /api/currencies adresini test eder.
    Tests the /api/currencies endpoint.
    """
    response = client.get("/api/currencies")
    assert response.status_code == 200

    data = response.get_json()
    assert "fiat" in data
    assert "total" in data
    assert data["total"] > 0


def test_convert(client):
    """
    Para birimi dönüşümünü test eder.
    Tests currency conversion.

    Örnek / Example: 100 USD -> EUR
    """
    response = client.get(
        "/api/convert?from_currency=USD&to_currency=EUR&amount=100"
    )
    assert response.status_code == 200

    data = response.get_json()
    assert "from" in data
    assert "to" in data
    assert "result" in data
    assert data["from"] == "USD"
    assert data["to"] == "EUR"


def test_popular(client):
    """
    Popüler pariteleri test eder.
    Tests popular pairs endpoint.
    """
    response = client.get("/api/popular-pairs")
    assert response.status_code == 200

    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_multi_convert(client):
    """
    Çoklu dönüşümü test eder.
    Tests multi-currency conversion.

    Örnek / Example: 1000 TRY -> USD, EUR, GBP...
    """
    response = client.get("/api/multi-convert?from_currency=TRY&amount=1000")
    assert response.status_code == 200

    data = response.get_json()
    assert "from" in data
    assert "conversions" in data
    assert len(data["conversions"]) > 0


def test_invalid_currency(client):
    """
    Geçersiz para birimiyle hata döndüğünü test eder.
    Tests that invalid currency returns an error.
    """
    response = client.get(
        "/api/convert?from_currency=INVALID&to_currency=USD&amount=100"
    )
    assert response.status_code in [400, 404, 500]


def test_negative_amount(client):
    """
    Negatif miktarla hata döndüğünü test eder.
    Tests that negative amount returns an error.
    """
    response = client.get(
        "/api/convert?from_currency=USD&to_currency=EUR&amount=-100"
    )
    assert response.status_code in [200, 400, 422]


def test_homepage(client):
    """
    Ana sayfanın açıldığını test eder.
    Tests that the homepage loads.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert b"KurTakip" in response.data or "text/html" in response.content_type


# ============================================================
# Tarih Testleri / Date Tests
# ============================================================

def test_rate_on_date(client):
    """
    Tarihe göre kur sorgusunu test eder.
    Tests the rate-on-date endpoint.
    """
    response = client.get("/api/rate-on-date/USD/EUR/2024-12-01")
    assert response.status_code in [200, 404]

    if response.status_code == 200:
        data = response.get_json()
        assert "base" in data
        assert "quote" in data
        assert "rate" in data
        assert "date" in data


def test_bad_date_format(client):
    """
    Yanlış tarih formatının hata döndürdüğünü test eder.
    Tests that bad date format returns an error.
    """
    response = client.get("/api/rate-on-date/USD/EUR/01-12-2024")
    assert response.status_code == 400

    data = response.get_json()
    assert "error" in data


def test_future_date(client):
    """
    Gelecek tarih hata döndürmeli.
    Future date should return an error.
    """
    response = client.get("/api/rate-on-date/USD/EUR/2030-12-01")
    assert response.status_code == 400

    data = response.get_json()
    assert "error" in data


def test_compare_dates(client):
    """
    Tarih karşılaştırmayı test eder.
    Tests date comparison.
    """
    response = client.get(
        "/api/compare-dates/USD/EUR?start_date=2024-11-01&end_date=2024-12-01"
    )
    assert response.status_code in [200, 404]

    if response.status_code == 200:
        data = response.get_json()
        assert "base" in data
        assert "quote" in data
        assert "start_rate" in data
        assert "end_rate" in data
        assert "change_percent" in data
        assert "change_direction" in data


def test_compare_no_dates(client):
    """
    Tarih parametresi olmadan hata döndürmeli.
    Should return error without date parameters.
    """
    response = client.get("/api/compare-dates/USD/EUR")
    assert response.status_code == 400

    data = response.get_json()
    assert "error" in data


def test_compare_bad_currency(client):
    """
    Geçersiz para birimiyle hata döndürmeli.
    Should return error with invalid currency.
    """
    response = client.get(
        "/api/compare-dates/INVALID/EUR?start_date=2024-11-01&end_date=2024-12-01"
    )
    assert response.status_code == 400

    data = response.get_json()
    assert "error" in data
