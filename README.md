# 💎 Mesh2Step 3D Studio

<div align="center">

[![Version](https://img.shields.io/badge/Version-v3.24%20(Stable)-00f2fe.svg?style=for-the-badge)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.9%20%7C%203.10%20%7C%203.11-brightgreen.svg?style=for-the-badge)](https://www.python.org/)
[![WebGL](https://img.shields.io/badge/WebGL-Three.js-000000.svg?style=for-the-badge)](https://threejs.org/)
[![CAD Kernel](https://img.shields.io/badge/CAD%20Kernel-OpenCASCADE%20%2F%20Titan-ea580c.svg?style=for-the-badge)](https://dev.opencascade.org/)
[![Languages](https://img.shields.io/badge/Languages-Türkçe%20%7C%20English-10b981.svg?style=for-the-badge)](#-dil-seçimi--language-quick-jump)
[![Author](https://img.shields.io/badge/Author-Okan%20YEŞİLYURT-8b5cf6.svg?style=for-the-badge)](https://www.okanyesilyurt.com)
[![Website](https://img.shields.io/badge/Website-mesh2step.gryntech.net-00f2fe.svg?style=for-the-badge)](https://mesh2step.gryntech.net)

<p align="center">
  <strong>Yüksek Hassasiyetli Mesh (STL, 3MF, OBJ, PLY) → Katı CAD B-Rep STEP Çevirici, Akıllı Yüzey İyileştirme ve DfAM Mühendislik Stüdyosu</strong><br>
  <em>High-Precision Mesh (STL, 3MF, OBJ, PLY) → Solid CAD B-Rep STEP Converter, Smart Feature-Preserving Healing & DfAM Engineering Studio</em>
</p>

[🌐 Web Sitesi / Website](https://mesh2step.gryntech.net) • [📦 GitHub Deposu / Repository](https://github.com/okanyyurt/Mesh2Step) • [📜 Sürüm Notları / Changelog](CHANGELOG.md) • [🤝 Katkıda Bulunma / Contributing](CONTRIBUTING.md) • [🔒 Güvenlik / Security](SECURITY.md)

</div>

---

## 🧭 Dil Seçimi / Language Quick Jump

- [🇹🇷 Türkçe Dokümantasyon](#-türkçe-dokümantasyon)
  - [Neden Mesh2Step 3D Studio?](#-neden-mesh2step-3d-studio)
  - [Öne Çıkan Temel Yetenekler](#-öne-çıkan-temel-yetenekler)
  - [Sistem Mimarisi](#-sistem-mimarisi)
  - [Kurulum ve Çalıştırma](#-kurulum-ve-çalıştırma)
  - [Masaüstü EXE Olarak Paketleme](#-tek-tıkla-masaüstü-exe-üretimi)
  - [Yapılandırma (`config.json`)](#-yapılandırma-configjson)
  - [Gizlilik ve Güvenlik Güvencesi](#-gizlilik-ve-güvenlik-güvencesi)
- [🇬🇧 English Documentation](#-english-documentation)
  - [Why Mesh2Step 3D Studio?](#-why-mesh2step-3d-studio)
  - [Key Architectural Highlights](#-key-architectural-highlights)
  - [System Architecture](#-system-architecture)
  - [Installation & Quickstart](#-installation--quickstart)
  - [Building Standalone Windows EXE](#-standalone-windows-exe-packaging)
  - [Configuration (`config.json`)](#-configuration-configjson)
  - [Privacy & CAD Data Security](#-privacy--cad-data-security)
- [👨‍💻 Geliştirici & Lisans / Author & License](#-geliştirici--lisans--author--license)

---

# 🇹🇷 Türkçe Dokümantasyon

## 🌟 Neden Mesh2Step 3D Studio?

3D yazıcılardan veya 3D tarayıcılardan alınan **STL, 3MF veya OBJ** dosyaları on binlerce küçük düz üçgenden (faset) oluşur. Bu dosyalar standart CAD programlarına (Autodesk Fusion 360, SolidWorks, Siemens NX, CATIA, FreeCAD) aktarıldığında:
- Yüzeyler tek tek bölünmüş üçgenler halinde kalır ve ölçüm almak veya parametrik değişiklik yapmak imkansızlaşır.
- Basit bir vida deliği binlerce küçük yüzeye bölünür, CAD yazılımı kilitlenir veya yavaşlar.
- Bulut tabanlı çeviriciler ise gizli/tescilli mühendislik modellerinizi üçüncü taraf sunuculara yüklemek zorunda bırakır.

**Mesh2Step 3D Studio**, bu sorunları kökten çözmek için tasarlanmış **%100 yerel (çevrimdışı çalışan)**, yapay zeka destekli yeni nesil bir tersine mühendislik stüdyosudur. Üçgen ağları matematiksel olarak analiz eder; düzlemsel alanları tek parça pürüzsüz CAD düzlemlerine, delikleri analitik silindirlere dönüştürerek mikron hassasiyetinde **ISO 10303-21 STEP B-Rep** katı modelleri üretir.

---

## ⚡ Öne Çıkan Temel Yetenekler

### 1. 🚀 Doğrudan Katı CAD B-Rep STEP Dönüştürme
- **Titan CAD & OpenCASCADE (OCP) Çekirdeği:** Bulut veya harici bir CAD yazılımına ihtiyaç duymadan, yerel C++ CAD çekirdeği ile 100% Manifold, su sızdırmaz (watertight) katı gövdeler örer.
- **Eşdüzlemli Yüzey Birleştirme (Unify Coplanar):** Aynı düzlemde yer alan yüz binlerce üçgen faseti tek bir analitik B-Rep yüzeyi haline getirir.
- **TrueForm Yüzey Tanıma:** Silindirik delikleri, konik geçişleri ve düzlemsel montaj tablalarını mikron toleransında tespit eder.

### 2. 🪄 Keskin Kenarları Koruyan Akıllı Mesh İyileştirme (Ütüleme / Healing)
- **3D Tarama Pürüzlerini Giderme:** KIRI Engine, LiDAR, Revopoint ve el tipi 3D tarayıcılardan gelen yüzey dalgalanmalarını ve gürültüyü hacim kaybı yaşatmadan ütüler.
- **Dihedral Açı Kilitlemesi (Feature Edge Locking):** Standart pürüzsüzleştiriciler vida yuvalarını ve dik kenarları yuvarlatıp bozar. Mesh2Step ise 25°-45° üzerindeki keskin kenarları matematiksel olarak kilitler; kritik montaj yüzeylerini sıfır deformasyonla korur.
- **Çift Filtre Desteği:** 
  - *Taubin Hacim Koruyucu Filtre:* Parçanın dış ölçülerini daraltmadan pürüzleri giderir.
  - *Bilateral Yüzey Normalleri:* Organik ve sanatsal taranmış modellerde yüzey dalgalarını ipeksi bir forma kavuşturur.

### 3. 🤖 Model Tasarım Tarzı Seçimi & AI Topoloji Analizi
- **Tasarım Kategorileri:** Prizmatik Braket, Dişli/Şaft, Cıvata/Somun, Organik Heykel, Petek/Kafes Yapı veya 3D Tarama.
- **AI ile Belirle Butonu:**
  - *Bulut Modu (Gemini AI):* Ayarlara Google Gemini API anahtarı girildiğinde parçanın tasarım amacını, cıvata dairesi (PCD) çaplarını ve önerilen dönüşüm ayarlarını analiz eder.
  - *%100 Çevrimdışı Mod (Offline Heuristics):* API anahtarı olmasa dahi yerel geometrik boyut analizi ve dihedral açı dağılımı ile modeli anında sınıflandırır.

### 4. 🧩 Çok Gövdeli Montaj Yönetimi (Multi-Body Split)
- Tek bir STL/3MF dosyasında birleştirilmiş birden fazla mekanik parçayı bağımsız gövdelere (`Body 1`, `Body 2`, ...) ayırır.
- **3D Patlatılmış Görünüm (Exploded View):** Montaj parçalarını slider ile uzayda ayrıştırarak iç detayları incelemenizi sağlar.
- **Tekil İnceleme (Solo Inspection):** Tek bir gövdeye odaklanıp diğer parçaları şeffaflaştırarak ölçüm ve denetim imkanı tanır.

### 5. 📐 DfAM & Katmanlı İmalat Mühendislik Denetimi
- **Aşırı Sarkan Yüzey Analizi (Overhang Audit):** Destek malzemesi gerektiren 45° ve 60° üzeri kritik açıları 3D üzerinde renklerle işaretler.
- **Tabla Yapışma & Devrilme Riski:** Parçanın yatak temas alanını ve ağırlık merkezine bağlı devrilme momentini hesaplar.
- **Matematiksel Optimal Oryantasyon:** Minimum destek ve maksimum yüzey kalitesi için en ideal baskı açısını otomatik hesaplar ve modeli tek tıkla tabana oturtur.

### 6. 🔗 Fusion 360 & FreeCAD 1-Tık Entegrasyonu
- Üretilen STEP katı modelini bilgisayarınızda kurulu olan Autodesk Fusion 360 veya FreeCAD içerisine tek bir butonla doğrudan aktarır.

### 7. 📜 Kalıcı Dönüşüm Kayıt Defteri (History Ledger)
- Yapılan her dönüşümün faset sayısı, B-Rep yüzey sadeleştirme oranı, dosya boyutu ve işlem süresi yerel diskte (`conversion_history.json`) saklanır.
- Geçmiş modellere tek tıkla erişebilir, doğrudan Fusion'da açabilir veya dosya konumuna gidebilirsiniz.

### 8. 🌐 Çift Dilli Dinamik Arayüz (Türkçe & English)
- Üst bardaki dil butonu ile tüm arayüz, ipuçları ve durum bildirimleri çalışma anında anlık olarak Türkçe veya İngilizceye çevrilir.

---

## 🏗️ Sistem Mimarisi

```
Mesh2Step 3D Studio
│
├── [Desktop UI Frontend] ──> Three.js WebGL (3D Sahne, Raycasting, Çoklu Görünüm)
│                         ──> Vanilla CSS & Glassmorphism Design System
│                         ──> i18n Çoklu Dil Çekirdeği (TR / EN)
│
├── [Python API Köprüsü]  ──> pywebview (Yerel Windows Web Platformu Entegrasyonu)
│                         ──> C++ Uyumlu 8.3 Kısa Yol Çözümleyici (Türkçe Karakter Desteği)
│
├── [Geometri & CAD Motoru]─> OpenCASCADE (OCP) B-Rep Dikiş ve Katılaştırma
│                         ──> Titan CAD Analitik Form Tanıma Motoru
│                         ──> Trimesh & NumPy Faset Topolojisi ve Taubin Filtresi
│
└── [Yapay Zeka & Analiz] ──> Yerel Çevrimdışı Topoloji Heuristiği (100% Offline)
                          ──> Google Gemini API (İsteğe Bağlı Bulut Asistanı)
```

---

## 📦 Kurulum ve Çalıştırma

### Sistem Gereksinimleri
- **İşletim Sistemi:** Windows 10 / 11 (64-bit)
- **Python:** Python 3.9, 3.10 veya 3.11 (Python 3.12+ OCP ikili paketleri için önerilmez)
- **Donanım:** Minimum 4 GB RAM, WebGL destekli grafik kartı (NVIDIA / AMD / Intel)

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/okanyyurt/Mesh2Step.git
cd Mesh2Step
```

### 2. Gerekli Kütüphaneleri Yükleyin
```bash
pip install -r requirements.txt
```

### 3. Uygulamayı Başlatın
- **Yöntem A (En Kolay):** `Baslat_CAD_Studio.bat` dosyasına çift tıklayın. (Python ortamını kontrol eder, eksik paket varsa yükler ve arayüzü açar).
- **Yöntem B (Terminal):**
  ```bash
  python app.py
  ```

---

## 🔨 Tek Tıkla Masaüstü EXE Üretimi

Mesh2Step 3D Studio'yu herhangi bir Python kurulumuna ihtiyaç duymayan, tek parça taşınabilir bir Windows `.exe` programı haline getirmek için:

```bash
build_exe.bat
# veya
python build_exe.py
```

İşlem tamamlandığında `dist/Mesh2Step_3D_Studio/` klasörü içerisinde bağımsız çalıştırılabilir masaüstü uygulamanız hazır olacaktır.

---

## ⚙️ Yapılandırma (`config.json`)

İlk çalıştırmada `config.example.json` dosyasını `config.json` olarak kopyalayabilir veya uygulama içerisindeki **Ayarlar (⚙️)** penceresinden düzenleyebilirsiniz:

```json
{
  "api_key": "YOUR_GEMINI_API_KEY_OPTIONAL",
  "model": "gemini-2.5-flash",
  "threads": 4,
  "default_engine": "ransac_occ",
  "language": "tr"
}
```
> **Not:** `api_key` alanı boş bırakılsa bile tüm CAD dönüştürme, mesh iyileştirme, gövde ayırma ve DfAM özellikleri **tamamen yerel ve sınırsız** olarak çalışır.

---

## 🔒 Gizlilik ve Güvenlik Güvencesi

1. **Sıfır Bulut Sızıntısı:** 3D modelleriniz, mesh dosyalarınız ve koordinatlarınız **kesinlikle** herhangi bir sunucuya yüklenmez. Tüm matematiksel hesaplamalar cihazınızın işlemcisinde ve grafik kartında yerel olarak koşar.
2. **Ticari Gizlilik:** Gizli veya patentli mühendislik parçalarınızı güvenle dönüştürebilirsiniz.
3. Detaylı bilgi için [SECURITY.md](SECURITY.md) dosyasını inceleyebilirsiniz.

---

<br>

# 🇬🇧 English Documentation

## 🌟 Why Mesh2Step 3D Studio?

Standard 3D mesh files (**STL, 3MF, OBJ, PLY**) generated by 3D printers, 3D scanners, or generative design tools consist of thousands of disconnected planar facet triangles. When imported into parametric engineering CAD platforms (Autodesk Fusion 360, SolidWorks, Siemens NX, CATIA, FreeCAD):
- The model remains a jagged mesh with no true geometric edges, making technical dimensioning, machining, and parametric editing nearly impossible.
- Simple cylindrical bolt holes become hundreds of tiny facets, dragging CAD systems into severe lag or crashes.
- Commercial cloud conversion services compromise your IP by requiring you to upload proprietary geometries to third-party servers.

**Mesh2Step 3D Studio** solves this challenge through a **100% local, offline-capable**, AI-assisted reverse engineering workstation. It reconstructs topology mathematically: planar facets are merged into single continuous analytical B-Rep faces, and cylindrical bores are recognized natively, generating watertight, micron-accurate **ISO 10303-21 STEP B-Rep solid bodies**.

---

## ⚡ Key Architectural Highlights

### 1. 🚀 Direct Solid CAD B-Rep STEP Reconstruction
- **Titan CAD & OpenCASCADE (OCP) Kernel:** Performs high-precision edge-stitching, surface fitting, and sew-to-solid operations locally with zero external CAD dependencies.
- **Unify Coplanar Faces:** Seamlessly collapses co-planar triangles into single clean B-Rep faces, slashing CAD file bloat by up to 90%.
- **TrueForm Analytical Fitting:** Automatically classifies planes, cylinders, cones, and freeform NURBS surfaces.

### 2. 🪄 Feature-Preserving Smart Mesh Healing & Denoising
- **3D Scan Ripple Removal:** Cleans up surface noise from handheld LiDAR, photogrammetry, and KIRI Engine 3D scans without causing volumetric shrinkage.
- **Dihedral Angle Feature Locking:** Unlike naive Laplacian smoothers that erode sharp functional edges, Mesh2Step locks mechanical edges (>25°-45° dihedral angles) to ensure datum surfaces and mounting holes retain mathematical precision.
- **Dual Smoothing Filters:**
  - *Taubin Volume-Preserving Smoothing:* Eliminates high-frequency surface noise while strictly retaining the object's original bounding dimensions.
  - *Bilateral Normal Filtering:* Generates smooth, aesthetic contours on organic and sculptured meshes.

### 3. 🤖 Design Classification & AI Auto-Detection
- **Technical Presets:** Prismatic Bracket, Gear/Transmission, Fastener/Nut, Organic Sculpture, Honeycomb Grid, and 3D Scan.
- **Detect with AI Action:**
  - *Cloud AI Engine (Gemini):* Analyzes part metadata, bolt circles (PCD), and manufacturing features using minimal token overhead.
  - *100% Offline Mode (Geometric Heuristics):* Automatically evaluates bounding aspect ratios and facet normals locally without requiring any network connection or API key.

### 4. 🧩 Multi-Body Assembly Management
- Dissects complex multi-part STL/3MF files into distinct solid bodies (`Body 1`, `Body 2`, ...).
- **3D Exploded View Slider:** Spatially separates assembly components in real time to inspect internal interfaces.
- **Solo Body Inspection:** Isolate and inspect any individual component while dimming surrounding parts.

### 5. 📐 DfAM & Additive Manufacturing Engineering Audit
- **Overhang Angle Audit:** Real-time visual heatmaps pinpointing critical overhang zones (>45° and >60°) requiring support material.
- **Bed Contact Area & Toppling Moment:** Calculates build plate contact footprint and center-of-gravity stability.
- **Optimal Print Orientation:** Computes the mathematical orientation that minimizes support volume and maximizes layer adhesion strength.

### 6. 🔗 1-Click Launch into Fusion 360 & FreeCAD
- Automatically opens exported STEP models directly inside Autodesk Fusion 360 or FreeCAD with a single click.

### 7. 📜 Persistent Conversion History Ledger
- Conversion records, polygon-to-solid reduction rates, file sizes, and timestamps are permanently logged to `conversion_history.json`.

### 8. 🌐 Dynamic Bilingual UI (Turkish & English)
- Instant runtime localization switching between English and Turkish across all dialogs, inspection cards, and HUD elements.

---

## 🏗️ System Architecture

```
Mesh2Step 3D Studio
│
├── [Desktop UI Frontend] ──> Three.js WebGL (Interactive 3D Viewport, Raycasting, Multi-View)
│                         ──> Vanilla CSS & Dark Cyber-Industrial Design System
│                         ──> i18n Real-time Localization Engine (TR / EN)
│
├── [Python API Bridge]   ──> pywebview (Native Windows Web Platform Integration)
│                         ──> Windows 8.3 Safe Short Path Handler (Non-ASCII Path Safety)
│
├── [CAD & Geometry Core] ──> OpenCASCADE (OCP) B-Rep Sewing & Solidification
│                         ──> Titan CAD Analytical TrueForm Recognition
│                         ──> Trimesh & NumPy Facet Topology & Taubin Filters
│
└── [AI & Heuristics]     ──> 100% Offline Geometric Topology Heuristics
                          ──> Optional Google Gemini API Assistant
```

---

## 📦 Installation & Quickstart

### Prerequisites
- **Operating System:** Windows 10 / 11 (64-bit)
- **Python:** Python 3.9, 3.10, or 3.11 (Python 3.12+ is not recommended due to prebuilt OCP binary wheels)
- **Hardware:** Minimum 4 GB RAM, WebGL-capable GPU (NVIDIA / AMD / Intel)

### 1. Clone the Repository
```bash
git clone https://github.com/okanyyurt/Mesh2Step.git
cd Mesh2Step
```

### 2. Install Required Dependencies
```bash
pip install -r requirements.txt
```

### 3. Launch the Application
- **Method A (Recommended):** Double-click `Baslat_CAD_Studio.bat`. (Automatically verifies Python environment and dependencies).
- **Method B (Terminal):**
  ```bash
  python app.py
  ```

---

## 🔨 Standalone Windows EXE Packaging

To package Mesh2Step 3D Studio into a standalone, portable Windows `.exe` application that runs without requiring a pre-installed Python interpreter:

```bash
build_exe.bat
# or
python build_exe.py
```

The output bundle will be generated in `dist/Mesh2Step_3D_Studio/`.

---

## ⚙️ Configuration (`config.json`)

You can create `config.json` from `config.example.json` or adjust settings directly via the **Settings (⚙️)** modal inside the application:

```json
{
  "api_key": "YOUR_GEMINI_API_KEY_OPTIONAL",
  "model": "gemini-2.5-flash",
  "threads": 4,
  "default_engine": "ransac_occ",
  "language": "en"
}
```

---

## 🔒 Privacy & CAD Data Security

1. **Zero Cloud Telemetry:** Your 3D models, geometry vertices, and STEP CAD solids are processed **strictly on your local machine**.
2. **Proprietary Protection:** Confidential mechanical engineering assets are safe from cloud exposure.
3. For full details, refer to [SECURITY.md](SECURITY.md).

---

## 👨‍💻 Geliştirici & Lisans / Author & License

### Geliştirici & Yazar / Author
- **Okan YEŞİLYURT**
- **Proje Web Sitesi / Project Website:** [https://mesh2step.gryntech.net](https://mesh2step.gryntech.net)
- **Geliştirici Web Sitesi / Developer Website:** [www.okanyesilyurt.com](https://www.okanyesilyurt.com)
- **GitHub:** [@okanyyurt](https://github.com/okanyyurt)
- **Resmi Depo / Official Repository:** [https://github.com/okanyyurt/Mesh2Step](https://github.com/okanyyurt/Mesh2Step)

### License
This project is open-source and released under the **[MIT License](LICENSE)**.

### Third-Party Acknowledgments
- **OpenCASCADE Technology (OCCT / OCP):** Licensed under LGPL v2.1 with Exception.
- **Three.js:** Licensed under the MIT License.
- **pywebview:** Licensed under the BSD 3-Clause License.
- **Trimesh & NumPy:** Licensed under the MIT and BSD Licenses.

---

<div align="center">
  <sub>Mesh2Step 3D Studio • Designed & Developed by Okan YEŞİLYURT • 2026</sub>
</div>
