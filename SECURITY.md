# Güvenlik ve Gizlilik Politikası / Security & Privacy Policy

[🇹🇷 Türkçe](#-türkçe) | [🇬🇧 English](#-english)

---

## 🇹🇷 Türkçe

### 🔒 %100 Yerel İşleme ve Model Gizliliği
- **Sıfır Bulut Bağımlılığı:** Mesh2Step 3D Studio, yüklediğiniz hiçbir 3D model dosyasını (`.stl`, `.3mf`, `.obj`, `.step`) harici bir bulut sunucusuna aktarmaz.
- Tüm analitik geometri hesaplamaları, B-Rep dikimi, yüzey birleştirme ve mesh iyileştirme işlemleri **tamamen yerel bilgisayarınızda (offline)** gerçekleştirilir.
- Ticari, patentli veya gizli mühendislik tasarımlarınız cihazınızdan dışarı çıkmaz.

### 🔑 API Anahtarı Güvenliği
- Google Gemini API anahtarı kullanımı **tamamen isteğe bağlıdır**.
- Girilen API anahtarı yalnızca yerel bilgisayarınızdaki `config.json` dosyasında saklanır.
- Yapay zeka ile analiz sırasında 3D dosyanın kendisi veya koordinat noktaları gönderilmez; yalnızca minimum geometrik metadatalar (boyutlar, en-boy oranı, faset sayısı) kullanılır.

### 🛡️ Güvenlik Açığı Bildirimi
Eğer projede potansiyel bir güvenlik açığı tespit ederseniz, lütfen bunu herkese açık GitHub Issues üzerinden paylaşmak yerine doğrudan e-posta yoluyla geliştiriciye iletin:
- **Geliştirici:** Okan YEŞİLYURT
- **Web Sitesi:** [www.okanyesilyurt.com](https://www.okanyesilyurt.com)
- **GitHub:** [@okanyyurt](https://github.com/okanyyurt)

---

## 🇬🇧 English

### 🔒 100% Local Execution & CAD Privacy
- **Zero Cloud Exposure:** Mesh2Step 3D Studio processes all 3D geometries (`.stl`, `.3mf`, `.obj`, `.step`) exclusively on your local workstation.
- All analytical B-Rep topology reconstructions, mesh smoothing, and OpenCASCADE CAD kernel operations run **100% offline**.
- Proprietary industrial CAD files and confidential geometries never leave your system.

### 🔑 API Key Privacy
- Integration with Google Gemini is **strictly optional**. The application operates at full capability without any API key.
- If provided, your API key is stored locally in `config.json` and is never sent to third-party endpoints.
- Even during AI design categorization, no raw vertex coordinates or 3D geometry models are uploaded; only lightweight bounding dimensions and topology summaries are queried.

### 🛡️ Reporting Vulnerabilities
If you identify a security or privacy vulnerability, please contact the maintainer directly:
- **Author & Developer:** Okan YEŞİLYURT
- **Website:** [www.okanyesilyurt.com](https://www.okanyesilyurt.com)
- **GitHub:** [@okanyyurt](https://github.com/okanyyurt)
