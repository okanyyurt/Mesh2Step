/**
 * Mesh2Step 3D Studio - Official Web Portal Application Logic
 * Domain: mesh2step.gryntech.net
 * Features: Three.js Interactive CAD Viewport with REAL Project Samples,
 *           Bilingual Localization (TR/EN), Pipeline Simulation, Code Copying & Smooth Navigation.
 * Author: Okan YEŞİLYURT
 */

// -------------------------------------------------------------
// 1. Bilingual Localization Dictionary (TR & EN)
// -------------------------------------------------------------
const i18nData = {
  tr: {
    // Nav
    nav_overview: "Genel Bakış",
    nav_problem: "Çözüm & Fark",
    nav_features: "Yetenekler",
    nav_pipeline: "İşlem Hattı",
    nav_arch: "Mimari",
    nav_compare: "Karşılaştırma",
    nav_download: "İndir",
    nav_faq: "SSS",
    btn_github: "GitHub Deposu",
    
    // Hero
    hero_badge: "v3.23 (Kararlı Sürüm)",
    hero_sub_badge: "ISO 10303-21 STEP B-Rep • 100% Yerel",
    hero_title: "Mesh Dosyalarınızı Gerçek Parametrik B-Rep STEP Katı Modele Dönüştürün",
    hero_desc: "STL, 3MF ve OBJ dosyalarındaki milyonlarca dağınık üçgen faseti; Autodesk Fusion 360, SolidWorks ve FreeCAD ile %100 uyumlu, keskin kenarları kilitli, su sızdırmaz ve mikron toleranslı analitik katı gövdelere (STEP B-Rep) dönüştürün. Sıfır bulut bağımlılığı, tam veri gizliliği.",
    hero_cta_download: "Masaüstü Sürümü İndir",
    hero_cta_github: "GitHub'da İncele",
    stat_reduction: "B-Rep Sadeleştirme",
    stat_accuracy: "Mikron Toleransı",
    stat_privacy: "Çevrimdışı & Yerel",
    
    // Viewport HUD
    viewport_title: "İnteraktif 3D CAD Önizleme",
    hud_mesh: "Fasetli Mesh (STL)",
    hud_cad: "Analitik CAD (STEP)",
    hud_dfam: "DfAM Askı Analizi",
    vp_footer_mode: "Mod:",
    vp_footer_rotate: "3D Modeli Döndürmek İçin Sürükleyin",
    hud_mesh_src: "Kaynak Model:",
    hud_mesh_facets: "Faset:",
    hud_brep_opt: "B-Rep Kazancı:",
    lbl_sample_model: "Örnek Model:",
    
    // Problem vs Solution
    tag_problem_solution: "Neden Mesh2Step?",
    title_problem_solution: "Mesh Açmazını B-Rep Matematiği ile Çözüyoruz",
    desc_problem_solution: "Geleneksel mesh dosyaları parametrik CAD mühendisliği için tasarlanmamıştır. Mesh2Step, yapay zeka ve C++ geometrik çekirdek ile aradaki uçurumu kapatır.",
    comp_prob_badge: "Geleneksel Mesh Problemi",
    comp_prob_title: "CAD Kilitlenmeleri ve Boşa Giden Saatler",
    comp_prob_desc: "Standart STL/OBJ dosyaları CAD yazılımlarına aktarıldığında yüz binlerce ölü üçgenden oluşur.",
    prob_item_1: "Ölçüm alınamaz, teknik resim veya parametrik feder eklenemez.",
    prob_item_2: "Silindirik bir cıvata deliği yüzlerce faset yüzeye bölünür ve montaj imkansızlaşır.",
    prob_item_3: "Bulut tabanlı çeviriciler gizli AR-GE parçalarınızı harici sunuculara yüklemeye zorlar.",
    prob_item_4: "Geleneksel pürüzsüzleştiriciler keskin kenarları yuvarlatarak parçayı hurdaya çevirir.",
    
    comp_sol_badge: "Mesh2Step 3D Studio Çözümü",
    comp_sol_title: "100% Yerel, Keskin Kenar Korumalı Katı B-Rep",
    comp_sol_desc: "Titan CAD ve OpenCASCADE B-Rep dikiş motoru ile sıfır veri kaybıyla mikron hassasiyetinde katı üretim.",
    sol_item_1: "Eşdüzlemli yüzeyleri birleştirerek CAD dosya boyutunu %90'a kadar küçültür.",
    sol_item_2: "25°-45° dihedral açı kilitlemesiyle kritik montaj kenarlarını bozmadan pürüzleri ütüler.",
    sol_item_3: "%100 Yerel çalışır; modelleriniz asla bilgisayarınızın dışına çıkmaz.",
    sol_item_4: "Tek tıkla Autodesk Fusion 360 veya FreeCAD içerisine doğrudan aktarır.",
    
    // Features
    tag_features: "Güçlü Özellikler",
    title_features: "Uçtan Uca Tersine Mühendislik Stüdyosu",
    desc_features: "Yalnızca bir dönüştürücü değil; profesyonel katmanlı imalat, yüzey iyileştirme ve montaj denetim paketi.",
    feat_1_title: "Doğrudan B-Rep STEP Katı Üretimi",
    feat_1_desc: "OpenCASCADE (OCP) motoru ile manifold, su sızdırmaz ISO 10303-21 STEP AP214 katı gövde örer.",
    feat_2_title: "Akıllı Mesh İyileştirme (Healing)",
    feat_2_desc: "Taubin hacim koruyucu filtre ve bilateral yüzey normalleri ile 3D tarama pürüzlerini keskin kenarları koruyarak siler.",
    feat_3_title: "Çift Modlu Yapay Zeka Topolojisi",
    feat_3_desc: "%100 çevrimdışı yerel geometrik boyut analizi veya isteğe bağlı Google Gemini AI ile akıllı parça sınıflandırması.",
    feat_4_title: "Çok Gövdeli Montaj Ayrıştırma",
    feat_4_desc: "Tek STL dosyasındaki bağımsız mekanik parçaları ayırır, 3D patlatılmış görünüm ve solo inceleme sunar.",
    feat_5_title: "DfAM Askı & Katmanlı İmalat Denetimi",
    feat_5_desc: "45°/60° kritik aşırı sarkan yüzey haritası, tabla temas alanı ve devrilme momenti hesabı.",
    feat_6_title: "1-Tık Fusion 360 & FreeCAD",
    feat_6_desc: "Üretilen STEP dosyasını tek bir tuşla Autodesk Fusion 360 veya FreeCAD ortamında otomatik açar.",
    feat_7_title: "Kalıcı Dönüşüm Kayıt Defteri",
    feat_7_desc: "Dönüşüm süreleri, faset sadeleştirme yüzdeleri ve dosya boyutları yerel veritabanında saklanır.",
    feat_8_title: "Taşınabilir Bağımsız Masaüstü EXE",
    feat_8_desc: "Python kurulumuna gerek kalmadan çift tıkla çalışan hafif ve bağımsız Windows 64-bit masaüstü mimarisi.",
    
    // Pipeline
    tag_pipeline: "Dönüşüm Hattı",
    title_pipeline: "Adım Adım B-Rep Katılaştırma Mimarisi",
    desc_pipeline: "Milyonlarca üçgenden parametrik CAD katısına uzanan 4 aşamalı matematiksel süreç.",
    step_1_tab: "1. Mesh İçe Aktarım",
    step_2_tab: "2. Akıllı Ütüleme",
    step_3_tab: "3. B-Rep Dikimi",
    step_4_tab: "4. STEP & Fusion 360",
    
    // Architecture
    tag_arch: "Yazılım Mimarisi",
    title_arch: "Sağlam ve Optimize Modüler Mimari",
    desc_arch: "Three.js WebGL görselleştirme katmanından yerel C++ OpenCASCADE çekirdeğine kadar yüksek performans.",
    arch_l1_header: "Katman 1",
    arch_l1_title: "Kullanıcı Arayüzü & 3D WebGL",
    arch_l2_header: "Katman 2",
    arch_l2_title: "Yerel Windows API Köprüsü",
    arch_l3_header: "Katman 3",
    arch_l3_title: "Geometri & CAD Çekirdeği",
    arch_l4_header: "Katman 4",
    arch_l4_title: "Yapay Zeka & Sezgisellik",
    
    // Comparison Table
    tag_compare: "Karşılaştırma",
    title_compare: "Mesh2Step vs Diğer Yöntemler",
    desc_compare: "Neden mühendisler ve tasarımcılar standart araçlar yerine Mesh2Step 3D Studio'yu tercih ediyor?",
    th_feature: "Özellik / Yetenek",
    th_mesh2step: "Mesh2Step 3D Studio",
    th_standard_cad: "Standart CAD Araçları",
    th_cloud: "Bulut Çeviriciler",
    row_1_title: "%100 Yerel & Çevrimdışı Güvenlik",
    row_2_title: "Eşdüzlemli Yüzey Birleştirme (%90 Sadeleştirme)",
    row_3_title: "Keskin Kenar Kilitli Mesh Ütüleme (Dihedral Lock)",
    row_4_title: "Çok Gövdeli Montaj Ayrıştırma & Exploded View",
    row_5_title: "DfAM Askı Açısı & Baskı Yönü Analizi",
    row_6_title: "Fusion 360 & FreeCAD 1-Tık Entegrasyonu",
    row_7_title: "Açık Kaynak Kod & MIT Lisansı",
    
    // Download
    banner_title: "Hemen Başlayın — Ücretsiz ve Açık Kaynak",
    banner_desc: "Windows için hazır taşınabilir portable EXE paketini indirin veya GitHub deposunu klonlayarak Python ile geliştirin.",
    btn_download_zip: "v3.23 Portable EXE İndir (Zip)",
    btn_view_releases: "GitHub Sürüm Notları",
    
    // FAQ
    tag_faq: "Sıkça Sorulan Sorular",
    title_faq: "Aklınıza Takılabilecek Sorular",
    faq_q1: "Mesh2Step'i kullanmak için internet bağlantısı veya Gemini API anahtarı zorunlu mu?",
    faq_a1: "Hayır! Mesh2Step %100 yerel ve çevrimdışı çalışan bir yazılımdır. Tüm CAD dönüşümleri, B-Rep dikişi, yüzey iyileştirme ve DfAM analizleri tamamen bilgisayarınızın donanımında gerçekleşir. Google Gemini API anahtarı tamamen isteğe bağlı bir akıllı analiz asistanıdır.",
    faq_q2: "Oluşturulan STEP dosyasını Autodesk Fusion 360 veya SolidWorks doğrudan açabilir mi?",
    faq_a2: "Evet, kesinlikle! Mesh2Step uluslararası ISO 10303-21 STEP AP214 standardında katı B-Rep modelleri üretir. Fusion 360, SolidWorks, Siemens NX, CATIA, FreeCAD ve Inventor ile tam uyumludur. Ayrıca arayüzdeki 'Fusion'da Aç' butonuyla tek tıkla doğrudan Fusion 360'a gönderebilirsiniz.",
    faq_q3: "3D tarayıcıdan (KIRI Engine, LiDAR) gelen organik modelleri de katıya çevirir mi?",
    faq_a3: "Evet. Mesh2Step'in Akıllı İyileştirme (Healing) motorunda bulunan Taubin ve Bilateral filtreleri tarama gürültülerini hacim kaybı yaşatmadan pürüzsüzleştirir ve manifold katı B-Rep geometriye dönüştürür.",
    faq_q4: "Mesh2Step ticari projelerde ücretsiz olarak kullanılabilir mi?",
    faq_a4: "Evet. Mesh2Step 3D Studio MIT Lisansı ile açık kaynak kodlu olarak sunulmaktadır. Hem bireysel hem ticari AR-GE projelerinizde kısıtlama olmaksızın kullanabilirsiniz.",
    
    // Footer
    footer_desc: "Yüksek Hassasiyetli Mesh → Katı CAD B-Rep STEP Çevirici, Akıllı Yüzey İyileştirme ve DfAM Mühendislik Stüdyosu.",
    footer_quick_links: "Hızlı Bağlantılar",
    footer_community: "Topluluk & Kaynaklar",
    footer_developer: "Geliştirici & Lisans",
    footer_rights: "Tüm hakları saklıdır. MIT Lisansı ile lisanslanmıştır."
  },
  
  en: {
    // Nav
    nav_overview: "Overview",
    nav_problem: "Solution",
    nav_features: "Features",
    nav_pipeline: "Pipeline",
    nav_arch: "Architecture",
    nav_compare: "Comparison",
    nav_download: "Download",
    nav_faq: "FAQ",
    btn_github: "GitHub Repo",
    
    // Hero
    hero_badge: "v3.23 (Stable Release)",
    hero_sub_badge: "ISO 10303-21 STEP B-Rep • 100% Local",
    hero_title: "Transform Raw 3D Meshes into Watertight Parametric CAD B-Rep Solids",
    hero_desc: "Convert millions of disconnected planar facet triangles from STL, 3MF, and OBJ files into clean, feature-preserved, analytical solid bodies (STEP B-Rep) fully compatible with Autodesk Fusion 360, SolidWorks, and FreeCAD. Zero cloud telemetry, complete data privacy.",
    hero_cta_download: "Download Desktop Release",
    hero_cta_github: "View on GitHub",
    stat_reduction: "B-Rep Reduction",
    stat_accuracy: "Micron Accuracy",
    stat_privacy: "Offline & Local",
    
    // Viewport HUD
    viewport_title: "Interactive 3D CAD Viewport",
    hud_mesh: "Faceted Mesh (STL)",
    hud_cad: "Analytical CAD (STEP)",
    hud_dfam: "DfAM Overhang Audit",
    vp_footer_mode: "Mode:",
    vp_footer_rotate: "Drag Mouse to Rotate 3D Model",
    hud_mesh_src: "Source Model:",
    hud_mesh_facets: "Facets:",
    hud_brep_opt: "B-Rep Gain:",
    lbl_sample_model: "Sample Model:",
    
    // Problem vs Solution
    tag_problem_solution: "Why Mesh2Step?",
    title_problem_solution: "Bridging the Gap Between Meshes and CAD Geometry",
    desc_problem_solution: "Polygonal meshes were never designed for parametric engineering. Mesh2Step combines deep heuristic AI and C++ geometry kernels to reconstruct analytical solids.",
    comp_prob_badge: "The Mesh Dilemma",
    comp_prob_title: "CAD System Lag & Uneditable Facets",
    comp_prob_desc: "When standard STL/OBJ files are imported into CAD packages, they remain hundreds of thousands of disconnected dead triangles.",
    prob_item_1: "Inability to dimension, machine, extrude, or add parametric fillets.",
    prob_item_2: "A simple cylindrical bolt hole splits into hundreds of planar fragments.",
    prob_item_3: "Commercial cloud converters demand you upload confidential CAD IP to remote servers.",
    prob_item_4: "Naive smoothers erode sharp edges, destroying mounting datums and clearances.",
    
    comp_sol_badge: "The Mesh2Step Solution",
    comp_sol_title: "100% Local, Feature-Locked Solid B-Rep",
    comp_sol_desc: "Titan CAD & OpenCASCADE B-Rep sewing engine generates watertight solids with micron precision and zero data leakage.",
    sol_item_1: "Collapses coplanar triangles into single unified B-Rep faces, cutting file bloat by up to 90%.",
    sol_item_2: "Locks 25°-45° dihedral angles to iron out surface noise without rounding functional edges.",
    sol_item_3: "Runs 100% locally; your proprietary engineering designs never leave your workstation.",
    sol_item_4: "Direct 1-click launch into Autodesk Fusion 360 and FreeCAD.",
    
    // Features
    tag_features: "Core Capabilities",
    title_features: "End-to-End Reverse Engineering Workstation",
    desc_features: "Not just a converter; an advanced additive manufacturing, mesh healing, and multi-body assembly audit studio.",
    feat_1_title: "Direct B-Rep STEP Solid Reconstruction",
    feat_1_desc: "OpenCASCADE (OCP) C++ kernel sews watertight, manifold ISO 10303-21 STEP AP214 solid bodies locally.",
    feat_2_title: "Feature-Preserving Smart Healing",
    feat_2_desc: "Taubin volume-preserving smoothing and bilateral normal filtering clean scan ripples while locking mechanical edges.",
    feat_3_title: "Dual-Mode AI Topology Classification",
    feat_3_desc: "100% offline heuristic analysis or optional Google Gemini AI assistant for automatic mechanical part categorization.",
    feat_4_title: "Multi-Body Assembly Management",
    feat_4_desc: "Dissects multi-part STL files into individual bodies with real-time 3D exploded view and solo part inspection.",
    feat_5_title: "DfAM Additive Manufacturing Audit",
    feat_5_desc: "Visual heatmaps of critical overhang zones (>45°/>60°), bed contact footprint, and center-of-gravity stability.",
    feat_6_title: "1-Click Fusion 360 & FreeCAD Launch",
    feat_6_desc: "Directly opens exported STEP models in Autodesk Fusion 360 or FreeCAD with a single click.",
    feat_7_title: "Persistent Conversion History Ledger",
    feat_7_desc: "Tracks polygon reduction rates, vertex counts, execution times, and file paths locally in JSON ledger.",
    feat_8_title: "Standalone Portable Desktop EXE",
    feat_8_desc: "Lightweight, zero-install 64-bit Windows application that runs without requiring a pre-configured Python environment.",
    
    // Pipeline
    tag_pipeline: "Conversion Pipeline",
    title_pipeline: "Step-by-Step B-Rep Solidification",
    desc_pipeline: "The 4-stage mathematical pipeline transforming polygonal facets into parametric CAD geometry.",
    step_1_tab: "1. Mesh Ingestion",
    step_2_tab: "2. Smart Healing",
    step_3_tab: "3. B-Rep Sewing",
    step_4_tab: "4. STEP & CAD Launch",
    
    // Architecture
    tag_arch: "System Architecture",
    title_arch: "Robust & Optimized Modular Architecture",
    desc_arch: "Engineered from Three.js WebGL rendering down to high-precision C++ OpenCASCADE kernels.",
    arch_l1_header: "Layer 1",
    arch_l1_title: "Desktop UI & WebGL Frontend",
    arch_l2_header: "Layer 2",
    arch_l2_title: "Native Windows API Bridge",
    arch_l3_header: "Layer 3",
    arch_l3_title: "Geometry & CAD Kernels",
    arch_l4_header: "Layer 4",
    arch_l4_title: "AI & Heuristic Engines",
    
    // Comparison Table
    tag_compare: "Comparison",
    title_compare: "Mesh2Step vs Alternative Solutions",
    desc_compare: "Why engineers and makers choose Mesh2Step 3D Studio over generic CAD import or cloud converters.",
    th_feature: "Capability / Feature",
    th_mesh2step: "Mesh2Step 3D Studio",
    th_standard_cad: "Standard CAD Imports",
    th_cloud: "Cloud Converters",
    row_1_title: "100% Local & Offline Security",
    row_2_title: "Coplanar Face Unification (Up to 90% Reduction)",
    row_3_title: "Feature Edge-Locked Mesh Healing (Dihedral Lock)",
    row_4_title: "Multi-Body Assembly Split & Exploded View",
    row_5_title: "DfAM Overhang Angle & Bed Adhesion Audit",
    row_6_title: "1-Click Fusion 360 & FreeCAD Launch",
    row_7_title: "Open-Source & MIT License",
    
    // Download
    banner_title: "Get Started Now — Free & Open Source",
    banner_desc: "Download the pre-compiled portable Windows EXE package or clone the repository to run with Python.",
    btn_download_zip: "Download v3.23 Portable EXE (Zip)",
    btn_view_releases: "GitHub Release Notes",
    
    // FAQ
    tag_faq: "Frequently Asked Questions",
    title_faq: "Everything You Need to Know",
    faq_q1: "Is an internet connection or Gemini API key required to use Mesh2Step?",
    faq_a1: "No! Mesh2Step runs 100% locally and offline. All CAD conversions, B-Rep sewing, mesh denoising, and DfAM audits run directly on your machine's CPU and GPU. The Google Gemini API key is completely optional.",
    faq_q2: "Can Autodesk Fusion 360 or SolidWorks open the resulting STEP file directly?",
    faq_a2: "Yes, absolutely! Mesh2Step outputs standard ISO 10303-21 STEP AP214 solid models. They open seamlessly in Fusion 360, SolidWorks, Siemens NX, CATIA, FreeCAD, and Autodesk Inventor with full solid editing capabilities.",
    faq_q3: "Does it support organic 3D scans from photogrammetry and LiDAR?",
    faq_a3: "Yes. Mesh2Step includes dedicated Taubin volume-preserving smoothing and bilateral normal filters tailored for scan denoising while safeguarding boundary datums.",
    faq_q4: "Can I use Mesh2Step for commercial engineering projects?",
    faq_a4: "Yes! Mesh2Step 3D Studio is licensed under the permissive MIT License. You can use it freely for personal, academic, and commercial R&D workflows.",
    
    // Footer
    footer_desc: "High-Precision Mesh to Watertight CAD B-Rep STEP Converter, Smart Feature-Preserving Healing & DfAM Engineering Studio.",
    footer_quick_links: "Quick Links",
    footer_community: "Community & Resources",
    footer_developer: "Developer & License",
    footer_rights: "All rights reserved. Licensed under the MIT License."
  }
};

let currentLang = 'tr';

function setLanguage(lang) {
  if (!i18nData[lang]) return;
  currentLang = lang;
  localStorage.setItem('mesh2step_lang', lang);
  
  // Update all elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18nData[lang][key]) {
      el.textContent = i18nData[lang][key];
    }
  });
  
  // Update lang switch button text
  const langBtn = document.getElementById('lang-switch-text');
  if (langBtn) {
    langBtn.textContent = lang === 'tr' ? '🇬🇧 EN' : '🇹🇷 TR';
  }
  
  // Update document language
  document.documentElement.lang = lang;
}

function toggleLanguage() {
  const target = currentLang === 'tr' ? 'en' : 'tr';
  setLanguage(target);
}


// -------------------------------------------------------------
// 2. Interactive Pipeline Simulator Logic
// -------------------------------------------------------------
const pipelineSteps = [
  {
    step: 1,
    title_tr: "Adım 1: Çok Formatlı Mesh İçe Aktarımı",
    title_en: "Step 1: Multi-Format Mesh Ingestion",
    desc_tr: "STL, 3MF, OBJ ve PLY mesh dosyaları yerel C++ ayrıştırıcı ile okunur. Manifold topoloji, delik sayısı ve normaller anında doğrulanır.",
    desc_en: "STL, 3MF, OBJ, and PLY files are parsed via local C++ readers. Manifold boundaries, holes, and vertex normals are validated instantly.",
    specs_tr: [
      "Desteklenen Formatlar: .stl, .3mf, .obj, .ply (ASCII ve Binary)",
      "Bellek Taraması: NumPy & Trimesh ile sıfır kopya faset indeksleme",
      "Karakter Güvenliği: Windows 8.3 kısa yol ve Türkçe karakter koruması"
    ],
    specs_en: [
      "Supported Formats: .stl, .3mf, .obj, .ply (ASCII & Binary)",
      "Memory Scan: Zero-copy facet indexing with NumPy & Trimesh",
      "Path Safety: Windows 8.3 short-path and Unicode safety"
    ],
    logs: [
      { tag: "IMPORT", msg: "Mesh ingestion started: HeadlampWasherBracket.stl", status: "normal" },
      { tag: "INDEX", msg: "Parsed 538 vertices, 5,774 triangle facets", status: "normal" },
      { tag: "CHECK", msg: "Geometry status: Watertight (Manifold: TRUE)", status: "success" }
    ]
  },
  {
    step: 2,
    title_tr: "Adım 2: Keskin Kenar Korumalı Akıllı Ütüleme",
    title_en: "Step 2: Feature-Locked Smart Mesh Healing",
    desc_tr: "3D tarama dalgalanmaları Taubin filtresiyle ütülenir. 25°-45° üzerindeki keskin montaj kenarları dihedral açı kilidiyle korunur.",
    desc_en: "Surface noise from 3D scans is smoothed using Taubin filters. Mechanical edges (>25°-45°) are locked via dihedral angle constraints.",
    specs_tr: [
      "Dihedral Açı Kilidi: Montaj delikleri ve dik kenarlarda %0 deformasyon",
      "Taubin Filtresi: Hacim daralması (shrinkage) olmadan pürüz giderme",
      "Bilateral Normaller: Yüzey eğriliklerini koruyan tensör matrisi"
    ],
    specs_en: [
      "Dihedral Edge Locking: 0% geometric shrinkage on mounting features",
      "Taubin Filter: Shrinkage-free high-frequency noise smoothing",
      "Bilateral Normals: Curvature-preserving normal diffusion tensor"
    ],
    logs: [
      { tag: "HEALING", msg: "Applying Taubin volume-preserving filter (iter=12)", status: "normal" },
      { tag: "LOCKING", msg: "Identified 482 sharp mechanical edges (>28.0°)", status: "success" },
      { tag: "PASS", msg: "Zero volumetric loss detected. RMS error: 0.0002 mm", status: "success" }
    ]
  },
  {
    step: 3,
    title_tr: "Adım 3: TrueForm B-Rep Analitik Dikim",
    title_en: "Step 3: TrueForm Analytical B-Rep Reconstruction",
    desc_tr: "Eşdüzlemli yüz binlerce üçgen faset analitik düzlemlere (Planes), dairesel delikler silindirlere (Cylinders) birleştirilir.",
    desc_en: "Coplanar triangular facets collapse into continuous analytical planes, while cylindrical holes become true geometric cylinders.",
    specs_tr: [
      "Eşdüzlem Birleştirme: %85 - %92 B-Rep yüzey sadeleştirme oranı",
      "TrueForm Tanıma: RANSAC ve PCA ile analitik yüzey tespiti",
      "OpenCASCADE OCP: BRepBuilderAPI_Sewing ile mikron toleranslı dikiş"
    ],
    specs_en: [
      "Coplanar Merge: 85% - 92% B-Rep face count reduction rate",
      "TrueForm Fitting: Analytical surface detection with RANSAC & PCA",
      "OpenCASCADE OCP: Micron-precision sewing with BRepBuilderAPI"
    ],
    logs: [
      { tag: "COPLANAR", msg: "Merging planar face clusters (angular tol=0.015 rad)", status: "normal" },
      { tag: "TRUEFORM", msg: "Detected 4 mounting slots, 2 stiffener ribs", status: "success" },
      { tag: "SEWING", msg: "OpenCASCADE B-Rep sew completed: 1 Solid, 0 Free edges", status: "success" }
    ]
  },
  {
    step: 4,
    title_tr: "Adım 4: ISO 10303-21 STEP & 1-Tık CAD Açılışı",
    title_en: "Step 4: ISO 10303-21 STEP & 1-Click CAD Launch",
    desc_tr: "Üretilen katı model uluslararası standart STEP AP214 formatında diske yazılır ve tek tıkla Fusion 360 veya FreeCAD'e aktarılır.",
    desc_en: "The reconstructed solid body is exported as standard ISO 10303-21 STEP AP214 and pushed directly to Fusion 360 or FreeCAD.",
    specs_tr: [
      "Standardizasyon: ISO 10303-21 STEP AP214 / AP203 uyumluluğu",
      "CAD Entegrasyonu: Autodesk Fusion 360 & FreeCAD otomatik başlatma",
      "Kayıt Defteri: Tüm dönüşüm istatistikleri conversion_history.json'a kaydedildi"
    ],
    specs_en: [
      "Standardization: ISO 10303-21 STEP AP214 / AP203 compliance",
      "CAD Integration: Native 1-click launch into Fusion 360 & FreeCAD",
      "Ledger Log: Conversion stats archived to conversion_history.json"
    ],
    logs: [
      { tag: "EXPORT", msg: "Writing output solid -> HeadlampWasherBracket.step", status: "normal" },
      { tag: "INTEGRATE", msg: "Dispatching to Autodesk Fusion 360 API bridge", status: "success" },
      { tag: "COMPLETE", msg: "Solid ready for parametric editing & CNC toolpaths!", status: "success" }
    ]
  }
];

function selectPipelineStep(index) {
  const step = pipelineSteps[index];
  if (!step) return;
  
  // Update step tabs
  document.querySelectorAll('.step-tab').forEach((tab, idx) => {
    tab.classList.toggle('active', idx === index);
  });
  
  // Update text content
  const titleEl = document.getElementById('pipeline-step-title');
  const descEl = document.getElementById('pipeline-step-desc');
  const specsContainer = document.getElementById('pipeline-specs-container');
  const logsContainer = document.getElementById('pipeline-logs-container');
  
  if (titleEl) titleEl.textContent = currentLang === 'tr' ? step.title_tr : step.title_en;
  if (descEl) descEl.textContent = currentLang === 'tr' ? step.desc_tr : step.desc_en;
  
  if (specsContainer) {
    const specs = currentLang === 'tr' ? step.specs_tr : step.specs_en;
    specsContainer.innerHTML = specs.map(s => `
      <div class="pipeline-spec-item">
        <span class="spec-bullet">▸</span>
        <span>${s}</span>
      </div>
    `).join('');
  }
  
  if (logsContainer) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    logsContainer.innerHTML = step.logs.map(log => `
      <div class="log-line">
        <span class="timestamp">[${timeStr}]</span>
        <span class="tag ${log.status === 'success' ? 'success' : ''}">[${log.tag}]</span>
        <span class="msg">${log.msg}</span>
      </div>
    `).join('');
  }
}


// -------------------------------------------------------------
// 3. Three.js Interactive 3D CAD Mechanical Model Viewport
// -------------------------------------------------------------
let scene, camera, renderer, controls;
let currentCADGroup = null;
let currentMode = 'cad'; // 'mesh' | 'cad' | 'dfam'
let currentModelId = 'headlamp_bracket';
let animationId = null;

const modelIcons = {
  headlamp_bracket: "🏎️",
  housing: "⚙️",
  cycloidal_wall: "🔄",
  towel_hook: "🪝"
};

function initThreeCADViewer() {
  const container = document.getElementById('canvas-container');
  if (!container || typeof THREE === 'undefined') {
    const overlay = document.getElementById('canvas-loading');
    if (overlay) overlay.style.display = 'none';
    return;
  }
  
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070c18);
  
  // Camera
  camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
  camera.position.set(38, 28, 48);
  
  // High-End Renderer with tone mapping
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);
  
  // Orbit Controls
  if (typeof THREE.OrbitControls !== 'undefined') {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.4;
    controls.minDistance = 15;
    controls.maxDistance = 180;
    controls.target.set(0, 0, 0);
  }
  
  // Studio Quality Multi-Point CAD Lighting
  const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x090d16, 0.75);
  scene.add(hemiLight);
  
  // Main Key Light (Soft Cyan White)
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(45, 60, 40);
  keyLight.castShadow = true;
  scene.add(keyLight);
  
  // Fill Light (Electric Blue)
  const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
  fillLight.position.set(-45, 25, -30);
  scene.add(fillLight);
  
  // Sharp Cyan Edge Rim Light
  const rimLight = new THREE.DirectionalLight(0x00f2fe, 1.5);
  rimLight.position.set(20, -35, -50);
  scene.add(rimLight);
  
  // Bottom Warm Bounce Light
  const bounceLight = new THREE.DirectionalLight(0x1e3a8a, 0.6);
  bounceLight.position.set(0, -50, 0);
  scene.add(bounceLight);
  
  // Precision CAD Grid Floor
  const gridHelper = new THREE.GridHelper(70, 28, 0x00f2fe, 0x1e293b);
  gridHelper.position.y = -18;
  scene.add(gridHelper);
  
  // Render Real Project Model
  renderRealProjectModel();
  
  // Hide loading overlay
  const overlay = document.getElementById('canvas-loading');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 400);
  }
  
  // Quick tools listeners
  const rotateBtn = document.getElementById('btn-toggle-rotate');
  if (rotateBtn && controls) {
    rotateBtn.addEventListener('click', () => {
      controls.autoRotate = !controls.autoRotate;
      rotateBtn.textContent = controls.autoRotate ? '⏸' : '▶';
      rotateBtn.style.color = controls.autoRotate ? '' : '#00f2fe';
    });
  }
  
  const resetBtn = document.getElementById('btn-reset-cam');
  if (resetBtn && controls) {
    resetBtn.addEventListener('click', () => {
      camera.position.set(38, 28, 48);
      controls.target.set(0, 0, 0);
      controls.update();
    });
  }
  
  const modelSelect = document.getElementById('model-select');
  if (modelSelect) {
    modelSelect.addEventListener('change', (e) => {
      currentModelId = e.target.value;
      const pickerIcon = document.querySelector('.picker-icon');
      if (pickerIcon && modelIcons[currentModelId]) {
        pickerIcon.textContent = modelIcons[currentModelId];
      }
      renderRealProjectModel();
    });
  }
  
  // Resize handler
  window.addEventListener('resize', onWindowResize);
  
  // Animation Loop
  animate();
}

function renderRealProjectModel() {
  if (currentCADGroup) {
    scene.remove(currentCADGroup);
    currentCADGroup = null;
  }
  
  const group = new THREE.Group();
  let geometry = null;
  
  // Look up model data from real_models.js
  const mData = (window.REAL_MODELS_DATA && window.REAL_MODELS_DATA[currentModelId]) || null;
  
  if (mData && mData.vertices && mData.faces) {
    const positions = new Float32Array(mData.vertices);
    const indices = new Uint32Array(mData.faces);
    
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    
    // Update Telemetry HUD
    const nameEl = document.getElementById('hud-model-filename');
    const facesEl = document.getElementById('hud-val-faces');
    const redEl = document.getElementById('hud-val-reduction');
    
    if (nameEl) nameEl.textContent = mData.source_file;
    if (facesEl) facesEl.textContent = mData.face_count.toLocaleString();
    if (redEl) redEl.textContent = mData.step_reduction;
  } else {
    // Fallback parametric geometry if database isn't loaded
    geometry = new THREE.CylinderGeometry(14, 18, 12, 32);
    geometry.computeVertexNormals();
  }
  
  // Mode-Specific Materials and CAD Shaders
  let meshMaterial;
  const dfamLegendBox = document.getElementById('dfam-legend-box');
  
  if (currentMode === 'mesh') {
    if (dfamLegendBox) dfamLegendBox.style.display = 'none';
    
    // Flat Shaded Faceted Matte Carbon Surface
    meshMaterial = new THREE.MeshStandardMaterial({
      color: 0x182436,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: true
    });
    
    // Triangular Facet Wireframe Overlay
    const wireGeo = new THREE.WireframeGeometry(geometry);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 1,
      transparent: true,
      opacity: 0.42
    });
    const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
    group.add(wireMesh);
    
  } else if (currentMode === 'cad') {
    if (dfamLegendBox) dfamLegendBox.style.display = 'none';
    
    // High-End Titanium Anodized B-Rep Solid Surface
    meshMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x12253a,
      roughness: 0.22,
      metalness: 0.88,
      clearcoat: 0.75,
      clearcoatRoughness: 0.12,
      reflectivity: 0.95,
      flatShading: false
    });
    
    // Dihedral Feature Angle Boundary Edge Curves (24 deg threshold)
    const edgeGeo = new THREE.EdgesGeometry(geometry, 24);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x00f2fe,
      linewidth: 2,
      transparent: true,
      opacity: 0.95
    });
    const edgeMesh = new THREE.LineSegments(edgeGeo, edgeMat);
    group.add(edgeMesh);
    
  } else if (currentMode === 'dfam') {
    if (dfamLegendBox) dfamLegendBox.style.display = 'flex';
    
    // Precise Overhang Heatmap based on Face Normal Inclination
    geometry.computeVertexNormals();
    const normals = geometry.attributes.normal;
    const colors = [];
    
    for (let i = 0; i < normals.count; i++) {
      const ny = normals.getY(i);
      if (ny < -0.707) {
        // Critical Overhang (> 60°) -> Crimson Red
        colors.push(0.94, 0.23, 0.28);
      } else if (ny < -0.2) {
        // Warning Zone (45° - 60°) -> Amber Orange
        colors.push(0.96, 0.62, 0.11);
      } else {
        // Safe Printable Zone (< 45°) -> Emerald Cyan
        colors.push(0.06, 0.72, 0.58);
      }
    }
    
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    meshMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.35,
      metalness: 0.4,
      flatShading: true
    });
    
    const edgeGeo = new THREE.EdgesGeometry(geometry, 35);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
    const edgeMesh = new THREE.LineSegments(edgeGeo, edgeMat);
    group.add(edgeMesh);
  }
  
  const mainMesh = new THREE.Mesh(geometry, meshMaterial);
  mainMesh.castShadow = true;
  mainMesh.receiveShadow = true;
  group.add(mainMesh);
  
  // Initial dramatic isometric pitch
  group.rotation.x = -Math.PI / 6;
  group.rotation.y = Math.PI / 4;
  
  scene.add(group);
  currentCADGroup = group;
}

function setViewerMode(mode) {
  currentMode = mode;
  
  // Update HUD buttons
  document.querySelectorAll('.hud-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
  });
  
  // Update footer text
  const modeText = document.getElementById('vp-current-mode');
  if (modeText) {
    if (mode === 'mesh') modeText.textContent = currentLang === 'tr' ? 'Fasetli Mesh (STL Wireframe)' : 'Faceted Mesh (STL Wireframe)';
    else if (mode === 'cad') modeText.textContent = currentLang === 'tr' ? 'Analitik B-Rep STEP (Solid)' : 'Analytical B-Rep STEP (Solid)';
    else if (mode === 'dfam') modeText.textContent = currentLang === 'tr' ? 'DfAM Askı Isı Haritası (Overhang)' : 'DfAM Overhang Heatmap';
  }
  
  renderRealProjectModel();
}

function onWindowResize() {
  const container = document.getElementById('canvas-container');
  if (!container || !renderer || !camera) return;
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  animationId = requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}


// -------------------------------------------------------------
// 4. Utilities & Interactive Handlers (FAQ, Copy, Menu)
// -------------------------------------------------------------
function copyToClipboard(text, btnElement) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = btnElement.textContent;
    btnElement.textContent = currentLang === 'tr' ? 'Kopyalandı! ✓' : 'Copied! ✓';
    btnElement.style.color = '#10b981';
    setTimeout(() => {
      btnElement.textContent = originalText;
      btnElement.style.color = '';
    }, 2000);
  });
}

function initFAQAccordion() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
        if (!isActive) item.classList.add('active');
      });
    }
  });
}

function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-toggle');
  const menu = document.getElementById('nav-menu-list');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      menu.classList.toggle('open');
      btn.textContent = menu.classList.contains('open') ? '✕' : '☰';
    });
    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        menu.classList.remove('open');
        btn.textContent = '☰';
      });
    });
  }
}

function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) btn.classList.add('show');
    else btn.classList.remove('show');
  });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}


// -------------------------------------------------------------
// 5. DOM Ready Bootstrap
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('mesh2step_lang') || 'tr';
  setLanguage(savedLang);
  
  initThreeCADViewer();
  selectPipelineStep(0);
  initFAQAccordion();
  initMobileMenu();
  initBackToTop();
  
  document.querySelectorAll('.step-tab').forEach((tab, index) => {
    tab.addEventListener('click', () => selectPipelineStep(index));
  });
  
  document.querySelectorAll('.hud-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = e.target.getAttribute('data-mode');
      if (mode) setViewerMode(mode);
    });
  });
  
  const langToggleBtn = document.getElementById('lang-toggle-btn');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', toggleLanguage);
  }
});
