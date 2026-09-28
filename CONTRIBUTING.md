# Katkıda Bulunma Rehberi / Contributing Guidelines

[🇹🇷 Türkçe](#-türkçe) | [🇬🇧 English](#-english)

---

## 🇹🇷 Türkçe

**Mesh2Step 3D Studio** projesine katkıda bulunmak istediğiniz için teşekkür ederiz! Açık kaynak topluluğunun desteği ile projeyi daha ileriye taşımaktan mutluluk duyarız.

### 🐛 Hata Bildirimi (Bug Reports)
Bir hata veya beklenmeyen bir davranış ile karşılaştığınızda lütfen GitHub Issues üzerinden bildirin. Bildiriminizde şu detaylara yer vermeniz çözümü hızlandıracaktır:
- İşletim sistemi ve sürümü (örn: Windows 11 x64).
- Uygulama sürümü (örn: `v3.20`).
- Dönüştürülmeye çalışılan modelin formatı ve yaklaşık üçgen sayısı (.stl, .3mf vb.).
- Varsa konsol logları veya hata mesajı ekran görüntüsü.

### 💡 Yeni Özellik Önerileri (Feature Requests)
Yeni bir CAD dönüştürme algoritması, mesh iyileştirme filtresi veya arayüz özelliği önerisinde bulunmak için bir GitHub Issue açarak fikrinizi detaylandırabilirsiniz.

### 🔀 Çekme İstekleri (Pull Requests)
1. Bu depoyu forklayın (`Fork`).
2. Yeni özelliğiniz için bir dal oluşturun:
   ```bash
   git checkout -b ozellik/yeni-filtre
   ```
3. Değişikliklerinizi yapın ve test edin:
   - Mevcut Python kod standartlarına (`PEP 8`) uygun yazın.
   - İki dilli desteğin bozulmadığından emin olun (`APP/ui/i18n.js`).
4. Değişikliklerinizi commit edin:
   ```bash
   git commit -m "feat: Taubin mesh yumuşatma algoritması optimize edildi"
   ```
5. Dalınızı GitHub'a push edin ve bir Pull Request açın.

### 👨‍💻 İletişim & Proje Yöneticisi
- **Proje Sahibi & Geliştirici:** Okan YEŞİLYURT
- **Web Sitesi:** [www.okanyesilyurt.com](https://www.okanyesilyurt.com)
- **GitHub:** [@okanyyurt](https://github.com/okanyyurt)

---

## 🇬🇧 English

Thank you for your interest in contributing to **Mesh2Step 3D Studio**! We welcome bug fixes, algorithm optimizations, documentation improvements, and feature proposals.

### 🐛 Bug Reports
If you encounter a bug or unexpected behavior, please submit a GitHub Issue with:
- OS version (e.g., Windows 11 x64).
- Application version (e.g., `v3.20`).
- Mesh format and triangle count (.stl, .3mf, .obj).
- Terminal traceback or error screenshot if applicable.

### 💡 Feature Requests
Have an idea for a new CAD healing filter, B-Rep segmentation heuristic, or UI capability? Feel free to open a feature discussion on GitHub Issues.

### 🔀 Pull Request Process
1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/smooth-algorithm-enhancement
   ```
3. Commit your changes following standard conventions:
   ```bash
   git commit -m "feat: optimize Taubin volume-preserving smoothing filter"
   ```
4. Verify that bilingual i18n keys are preserved (`APP/ui/i18n.js`).
5. Push to your branch and open a Pull Request against `main`.

### 👨‍💻 Project Maintainer
- **Author & Lead Developer:** Okan YEŞİLYURT
- **Website:** [www.okanyesilyurt.com](https://www.okanyesilyurt.com)
- **GitHub:** [@okanyyurt](https://github.com/okanyyurt)
