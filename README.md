<div align="center">
  <h1>💱 KurTakip / Currency Tracker</h1>
  <p><strong>Modern, hızlı ve güvenilir döviz kuru takip ve analiz uygulaması.</strong></p>
  <p><em>A modern, fast, and reliable currency tracking and analysis application.</em></p>

  ![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white)
  ![Flask](https://img.shields.io/badge/Flask-Backend-black?logo=flask&logoColor=white)
  ![JavaScript](https://img.shields.io/badge/JavaScript-Frontend-yellow?logo=javascript&logoColor=white)
  ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Styling-38B2AC?logo=tailwindcss&logoColor=white)
  ![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)
</div>

---

## 🚀 Özellikler / Features

✅ **Anlık Kurlar:** 23 farklı popüler para birimi için anlık döviz kurları. *(Real-time tracking for 23 different currencies.)*
✅ **Akıllı Dönüştürücü:** Hızlı ve kolay döviz çevrimi, aynı anda çoklu dönüştürme desteği. *(Smart converter with multi-currency support.)*
✅ **Geçmiş Veri Analizi:** Etkileşimli grafiklerle desteklenmiş tarihsel kur analizleri. *(Graph-supported historical rate analysis.)*
✅ **Tarihsel Sorgulama:** Belirli bir tarihteki veya iki tarih arasındaki kurları karşılaştırma. *(Compare rates between two dates or query a specific date.)*
✅ **Gelişmiş Arayüz:** TailwindCSS ile geliştirilmiş, mobil uyumlu ve karanlık/aydınlık mod destekli arayüz. *(Responsive UI with dark/light mode.)*
✅ **RESTful API:** Geliştiriciler için tüm uygulama özelliklerini sunan kapsamlı JSON API. *(Comprehensive JSON API.)*

---

## � Docker ile Hızlı Başlangıç / Quick Start (Docker)

Uygulamayı çalıştırmanın en temiz ve hızlı yolu Docker kullanmaktır:
*The cleanest and fastest way to run the app is using Docker:*

```bash
# 1. İmajı oluşturun / Build the Docker image
docker build -t kurtakip .

# 2. Konteyneri çalıştırın / Run the container
docker run -p 5000:5000 kurtakip
```

Tarayıcınızda açın / Open in browser: 👉 **http://localhost:5000**

---

## � Manuel Kurulum / Manual Installation

Docker kullanmak istemiyorsanız aşağıdaki adımları izleyebilirsiniz:
*If you prefer not to use Docker, follow these steps:*

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
# Bağımlılıkları yükleyin / Install dependencies
pip install -r requirements.txt

# Uygulamayı başlatın / Start app
python app.py
```

---

## 📡 REST API Referansı / API Documentation

Uygulama, geliştiriciler için esnek ve geniş çaplı bir REST API sunar. Dönen tüm yanıtlar `JSON` formatındadır.
*The application provides a comprehensive REST API for developers. All responses are in `JSON` format.*

| Endpoint | Method | Açıklama / Description |
|----------|--------|------------------------|
| `/api` | `GET` | API versiyon ve endpoint bilgilerini listeler. |
| `/api/currencies` | `GET` | Desteklenen tüm para birimlerini getirir. |
| `/api/rates/{base}` | `GET` | Belirtilen para biriminin tüm güncel kurlarını getirir. |
| `/api/convert` | `GET` | İki para birimi arası çeviri yapar (Örn: `?from_currency=USD&to_currency=TRY&amount=100`). |
| `/api/multi-convert` | `GET` | Bir para birimini ayarlanmış hedeflere çevirir (Örn: `?from_currency=USD&amount=100`). |
| `/api/history/{base}/{quote}` | `GET` | İki para birimi arasındaki geçmiş kur verilerini getirir (Örn: `?days=30`). |
| `/api/popular-pairs` | `GET` | En çok takip edilen döviz çiftlerinin güncel durumunu getirir. |
| `/api/rate-on-date/{base}/{quote}/{date}` | `GET` | Belirli bir tarihteki kuru sorgular. (Örn: `/api/rate-on-date/USD/TRY/2024-12-01`) |
| `/api/compare-dates/{base}/{quote}` | `GET` | İki tarih arasındaki kuru analiz eder (Örn: `?start_date=2024-01-01&end_date=2024-12-01`) |

---

## 🧪 Testler / Running Tests

Projenin stabilitesini sağlamak için `pytest` ile yazılmış testler bulunmaktadır:
*The project includes tests written with `pytest` to ensure stability:*

```bash
python -m pytest tests/ -v
```

---

## 👤 Geliştirici / Developer

**Ali Mustafa Ekmen**  
*Bu proje eğitim amaçlı geliştirilmiştir.*  
*Developed for educational purposes.*   
