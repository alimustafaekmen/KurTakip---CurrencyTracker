# ============================================================
# Dockerfile - KurTakip Uygulaması
# Dockerfile - KurTakip Application
# ============================================================
# Bu dosya, uygulamayı Docker ile çalıştırmak için kullanılır.
# This file is used to run the application with Docker.
#
# Kullanım / Usage:
#   docker build -t kurtakip .
#   docker run -p 5000:5000 kurtakip
#
# Sonra tarayıcıda aç / Then open in browser:
#   http://localhost:5000
# ============================================================

# Python 3.11 slim imajını kullan (küçük boyutlu)
# Use Python 3.11 slim image (small size)
FROM python:3.11-slim

# Çalışma dizinini ayarla / Set working directory
WORKDIR /app

# Önce sadece requirements.txt'yi kopyala (cache için)
# Copy only requirements.txt first (for caching)
COPY requirements.txt .

# Bağımlılıkları yükle / Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Tüm proje dosyalarını kopyala / Copy all project files
COPY . .

# 5000 portunu aç / Expose port 5000
EXPOSE 5000

# Uygulamayı başlat / Start the application
CMD ["python", "app.py"]
