# 💱 KurTakip / Currency Tracker

**KurTakip**, anlık döviz kurlarını izlemenizi, çeviri yapmanızı ve geçmiş verileri analiz etmenizi sağlayan modern bir web uygulamasıdır.

**KurTakip** is a modern web application that allows you to track real-time exchange rates, perform conversions, and analyze historical data.

---

## � Hızlı Başlangıç (Docker) / Quick Start

Uygulamayı çalıştırmanın en kolay yolu Docker kullanmaktır.
The easiest way to run the application is using Docker.

```bash
# 1. İmajı oluşturun / Build image
docker build -t kurtakip .

# 2. Çalıştırın / Run
docker run -p 5000:5000 kurtakip
```

Tarayıcınızda açın / Open in browser: 👉 **http://localhost:5000**

---

## 🚀 Özellikler / Features

*   **Anlık Takip:** 23 farklı para birimi için canlı döviz kurları.
    *   *Real-time tracking for 23 different currencies.*
*   **Hızlı Çeviri:** Kolay ve anlık para birimi dönüştürücü.
    *   *Instant and easy currency converter.*
*   **Geçmiş Veriler:** Grafik destekli tarihsel kur analizi.
    *   *Historical rate analysis with interactive charts.*
*   **Akıllı Arayüz:** Otomatik karanlık/aydınlık mod desteği ve mobil uyumlu tasarım.
    *   *Auto dark/light mode and fully responsive design.*
*   **API Desteği:** Geliştiriciler için kapsamlı JSON API.
    *   *Comprehensive JSON API for developers.*

---

## 🛠️ Teknolojiler / Tech Stack

*   **Backend:** Python 3.11, Flask
*   **Frontend:** HTML5, Modern JavaScript, Tailwind CSS
*   **Data:** ExchangeRate-API (Live), Frankfurter API (Historical)
*   **Testing:** Pytest
*   **Containerization:** Docker

---

## 📦 Kurulum (Manuel) / Manual Installation

Docker kullanmıyorsanız, aşağıdaki adımlarla kurabilirsiniz.
If you don't use Docker, follow these steps.

### 1. Hazırlık / Setup

```bash
# Projeyi indirin / Clone repository
git clone https://github.com/alimustafaekmen/KurTakip---CurrencyTracker.git
cd KurTakip

# Sanal ortam oluşturun / Create virtual env
python -m venv venv

# Aktif edin (Mac/Linux) / Activate (Mac/Linux)
source venv/bin/activate

# Aktif edin (Windows) / Activate (Windows)
venv\Scripts\activate
```

### 2. Yükleme ve Çalıştırma / Install & Run

```bash
# Gereksinimleri yükleyin / Install dependencies
pip install -r requirements.txt

# Uygulamayı başlatın / Start app
python app.py
```

---

## 📡 API Dokümantasyonu / API Documentation

Uygulama, dışarıya açık bir REST API sunar.
The app provides a public REST API.

| Endpoint | Method | Açıklama / Description |
|----------|--------|------------------------|
| `/api/rates/{base}` | `GET` | Belirtilen para birimi için tüm kurlar.<br>_Get all rates for a specific currency._ |
| `/api/convert` | `GET` | Çeviri işlemi (Params: `from`, `to`, `amount`).<br>_Convert currency._ |
| `/api/history/{base}/{quote}` | `GET` | Geçmiş kur verileri (Params: `days`).<br>_Get historical data._ |
| `/api/popular-pairs` | `GET` | Popüler paritelerin durumunu getirir.<br>_Get status of popular pairs._ |

**Örnek / Example:**
`GET /api/convert?from_currency=USD&to_currency=TRY&amount=100`

---

## 🧪 Testler / Tests

Proje kapsamlı bir test paketine sahiptir.
The project includes a comprehensive test suite.

```bash
python -m pytest tests/ -v
```

---

## 👤 Geliştirici / Developer

**Ali Mustafa Ekmen**  
*Bu proje eğitim ve portfolyo amaçlı geliştirilmiştir.*  
*Developed for educational and portfolio purposes.*
