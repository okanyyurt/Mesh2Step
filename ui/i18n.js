// Mesh2Step 3D Studio - Comprehensive Multilingual (TR / EN) Localization Engine
// Supports dynamic runtime language switching, reactive DOM updates, and translation dictionary.

const I18N_DICTIONARY = {
  tr: {
    // Header & Brand
    app_brand: "MESH2STEP 3D STUDIO",
    app_subtitle: "Doğrudan Mesh → STEP B-Rep Katı Model Çevirici",
    gpu_scanning: "⚡ Donanım Hızlandırma Taranıyor...",
    btn_history: "📜 Geçmiş",
    btn_history_title: "Geçmiş Dönüştürme Raporları ve Katı Modeller",
    btn_settings: "⚙️ Ayarlar",
    btn_settings_title: "Sistem, Donanım ve API Ayarları",
    btn_open_model: "📂 Model Yükle",
    title_open_model: "Desteklenen formatlar: .stl, .3mf, .obj, .ply, .glb, .gltf, .off",
    btn_lang_toggle_title: "Dili Değiştir / Switch Language",

    // Viewport HUD & Dropzone
    dropzone_title: "3D Model Dosyasını Seçin veya Buraya Bırakın",
    dropzone_sub: ".stl, .3mf, .obj, .ply, .glb, .gltf, .off formatları doğrudan katı CAD B-Rep modeline dönüştürülür",
    btn_browse: "📂 Bilgisayardan Dosya Seç",
    hud_mesh: "🔺 Mesh & Üçgenler",
    hud_solid: "💎 Katı Model (STEP)",
    hud_compare: "🔄 Üst Üste",
    hud_split: "⏸️ Yan Yana",
    title_wireframe: "Üçgen Tel Kafese Aç / Kapat",
    title_edges: "CAD B-Rep Kenarlarını Aç / Kapat",
    title_grid: "Zemin Izgarasını Aç / Kapat",
    title_lay_flat: "Tabana Oturt (En Geniş Yüzeyi Z=0 Düzlemine Yatır)",
    title_rotate_90: "Modeli 90° Döndür ve Tabana Oturt",
    title_scale_1000: "1000x Büyüt (Metreden mm Standardına Çevir)",
    title_drag_mode: "Serbest 3D Model Taşıma",
    title_reset_view: "Görünüşü Modele Odakla",
    exploded_label: "🧩 Ayrıştır:",
    btn_toggle_3d_drag: "🖐️ 3D Taşı",
    btn_progress_cancel: "🛑 Durdur",
    progress_converting: "Katı Modele Dönüştürülüyor...",
    hud_split_left: "🔺 Sol: Orijinal Mesh",
    hud_split_right: "💎 Sağ: STEP Katı Model",
    hud_split_reset: "🔄 Konumları Sıfırla",
    solo_inspect_title: "Gövde İnceleniyor",
    btn_prev_body: "◀ Önceki",
    btn_next_body: "Sonraki ▶",
    btn_exit_solo: "Montaja Dön",

    // Sidebar Tabs
    tab_convert: "🚀 Katı CAD",
    tab_heal: "🪄 İyileştirme",
    tab_dfam: "📐 DfAM Analiz",
    tab_ai: "🤖 AI Asistan",

    // Shortcuts & Hints
    engine_desc_short: "RANSAC + OpenCASCADE Analitik B-Rep Motoru",
    scan_shortcut_text: "3D Tarama / Fotogrametri tespit edildi. Pürüzleri ve dalgalanmaları ütülemek ister misiniz?",
    btn_goto_heal: "🪄 İyileştir ➔",
    btn_goto_convert: "🚀 Katı CAD Dönüştürmeye Geç ➔",
    heal_next_hint: "Modeli ütüleyip keskin hatları sabitledikten sonra katı CAD B-Rep oluşturmak için Katı CAD sekmesine geçebilirsiniz:",

    // Model Info Card
    card_model_info: "Model Özellikleri",
    lbl_filename: "Dosya Adı",
    txt_no_model: "Model yüklenmedi",
    lbl_triangles: "Üçgen Sayısı",
    lbl_vertices: "Nokta Sayısı",
    lbl_filesize: "Dosya Boyutu",
    lbl_diagonal: "Köşegen (Çap)",
    lbl_dimensions: "Boyutlar (Genişlik × Derinlik × Yükseklik)",
    warn_meter_scale: "⚠️ Model metre ölçeğinde görünüyor.",
    btn_scale_1000: "📐 1000x Yap (mm)",

    // Multi-body Assembly Card
    card_assemblies: "🧩 Montaj Gövdeleri",
    btn_all: "Tümü",
    btn_clear: "Temizle",
    bodies_hint: "Dönüştürmek istediğiniz parçaları seçin. 3D sahnede parçaları mouse ile tutup sürükleyerek bağımsız taşıyabilirsiniz:",
    btn_arrange_side: "↔️ Yan Yana Diz",
    btn_reset_pos: "🔄 Sıfırla",

    // Smart Mesh Healing Card
    card_heal_title: "🪄 3D Tarama & Mesh İyileştirme",
    heal_desc: "KIRI Engine veya mobil taramalardaki dalgalı yüzeyleri hacim kaybetmeden ve keskin kenarları bozmadan ütüler, havada uçuşan toz fasetleri siler, açık delikleri diker.",
    lbl_heal_intensity: "Ütüleme / İyileştirme Yoğunluğu",
    heal_light: "Hafif",
    heal_balanced: "Dengeli",
    heal_strong: "Güçlü",
    heal_intensity_light_desc: "Hafif (6 Döngü)",
    heal_intensity_balanced_desc: "Dengeli (Önerilen)",
    heal_intensity_strong_desc: "Güçlü (28 Döngü)",
    chk_preserve_features: "📐 Keskin Kenarları Koru (Feature-Preserving)",
    lbl_dihedral: "Köşe Eşik Açısı (Dihedral):",
    opt_dihedral_30: "30° (Hassas - Daha Çok Köşe Koru)",
    opt_dihedral_35: "35° (Dengeli - CAD Standardı)",
    opt_dihedral_45: "45° (Sadece Çok Dik Kenarlar)",
    chk_outliers: "Uçuşan toz ve kopuk parçacıkları temizle",
    chk_holes: "Açık delikleri ve kenarları kapat (Watertight)",
    chk_smooth: "Yüzey ütüleme & gürültü giderme",
    lbl_heal_method: "Ütüleme Metodu:",
    method_taubin: "Taubin (Hacim Koruyucu)",
    method_bilateral: "Bilateral (Yüzey Normalleri)",
    chk_decimate: "Faset sadeleştirme (Üçgen sayısını %50 azalt)",
    btn_heal_mesh: "🪄 Modeli İyileştir & Ütüle",
    btn_revert_heal: "↩️ Geri Al",
    scan_detected_badge: "📷 3D Tarama / Fotogrametri Modeli Algılandı",
    cad_detected_badge: "📐 Teknik CAD / Prizmatik Model Algılandı",

    // CAD Conversion Engine Card
    card_conv_settings: "Dönüştürme Ayarları",
    lbl_cad_engine: "🚀 CAD Dönüştürme Motoru",
    engine_title_native: "Titan Analitik CAD Motoru (v3.0)",
    engine_desc_native: "RANSAC + OpenCASCADE Analitik Geometri Motoru. Düzlemsel yüzeyleri birleştirir, silindirleri tanır, helisel dişleri mikron hassasiyetle korur ve %100 su geçirmez katı model üretir.",
    tab_ai_mode: "🤖 AI Otomatik Mod",
    tab_expert_mode: "⚙️ Uzman Modu",

    // Model Style & Design Characteristics
    model_style_title: "📐 Model Tarzı & Tasarım Tipi",
    style_placeholder: "⚡ Model Tarzını Seçin veya AI ile Belirleyin...",
    style_hint_text: "Tasarım tipini bilmiyorsanız yukarıdaki [🤖 AI ile Belirle] butonuna basarak geometriden otomatik tespit ettirebilirsiniz.",
    badge_auto: "Otomatik",
    badge_manual: "Manuel",
    badge_pending: "Seçim Bekleniyor",
    badge_ai_gemini: "🤖 Gemini AI",
    badge_local_geo: "⚡ Yerel Geometri",
    btn_detect_ai: "AI ile Belirle",
    btn_detect_title: "Modeli Google Gemini AI veya yerel topoloji motoruyla analiz et",
    style_prismatic: "📐 Prizmatik / Mekanik Montaj Braketi & Gövde",
    style_gear: "⚙️ Dişli ve Şaft / Aktarma Elemanı",
    style_fastener: "🔩 Vida, Somun ve Yivli Bağlantı Elemanı",
    style_organic: "🎨 Organik Form / Sanatsal Heykel / Figür",
    style_honeycomb: "🕳️ Bal Peteği / İnce Kafes Yapısı",
    style_scan: "📱 3D Tarama / Tersine Mühendislik",

    // AI Tune Box
    ai_tune_title: "💡 Akıllı Model Teşhisi",
    ai_analyzing: "⏳ Model Analiz Ediliyor...",
    ai_default_desc: "Model yüklendiğinde yapay zeka ve topoloji motoru geometrik yapıyı teşhis ederek en ideal motor ayarlarını otomatik seçer.",
    ai_pending_desc: "Model yüklendiğinde yapay zeka veya yukarıdaki [🤖 AI ile Belirle] butonu ile geometri analiz edilir ve B-Rep motor ayarları yapılandırılır.",

    // Quality Preference
    quality_label: "🎯 CAD Yüzey Kalitesi",
    q_fast_title: "Hızlı CAD",
    q_fast_sub: "Fasetleri korur",
    q_balanced_title: "Dengeli CAD",
    q_balanced_sub: "Temiz yüzeyler",
    q_high_title: "Titan Hassas",
    q_high_sub: "Tam Manifold Katı",
    q_fast_summary: "Hızlı CAD (Temel Faset)",
    q_balanced_summary: "Dengeli CAD (Önerilen)",
    q_high_summary: "Titan Hassas (Tam Manifold Katı)",

    // Convert Buttons
    btn_convert_ai: "🚀 DÖNÜŞTÜR (STEP)",
    btn_convert_expert: "🚀 DÖNÜŞTÜR (STEP)",

    // Header Hover Popover
    hover_release: "Yayınlanma:",
    hover_kernel: "Motor:",
    hover_status: "Durum:",
    hover_stable: "Kararlı Dağıtım (Stable)",

    // Expert Mode
    lbl_engine_mode: "B-Rep Motor Modu",
    opt_mode_verbatim: "Yüksek Hızlı Faset Katı (Verbatim - Önerilen)",
    opt_mode_trueform: "Analitik Katı (TrueForm - Silindir & Düzlem İyileştirme)",
    lbl_unify: "Eşdüzlemli Yüzey Birleştirme (Unify)",
    opt_unify_true: "Açık (Düzlemleri Tek Yüzey Yapar)",
    opt_unify_false: "Kapalı (Her Üçgeni Ayrı B-Rep Yüzü Bırakır - Güvenli Mod)",
    lbl_unify_angle: "Yüzey Sadeleştirme & CAD Kalitesi",
    opt_angle_precise: "Hassas CAD (0.5° - Detaylı Faset)",
    opt_angle_balanced: "Dengeli CAD (2.5° - Önerilen)",
    opt_angle_smooth: "Yüksek Sadeleştirme (5.0° - Sade Yüzeyler)",
    opt_angle_max: "Maksimum Sadeleştirme (8.0° - Minimum Yüzey)",
    lbl_threads: "CPU İş Parçacığı (Threads)",
    opt_threads_auto: "Maksimum (Tüm Çekirdekler)",
    opt_threads_8: "8 Çekirdek",
    opt_threads_4: "4 Çekirdek",

    // Conversion Results Card
    card_results_title: "Katı Model Sonuçları",
    lbl_engine_used: "Kullanılan Motor",
    lbl_solid_status: "Katı Gövde Durumu",
    lbl_volume_verify: "Hacim Doğrulaması (Mesh ➔ CAD B-Rep)",
    lbl_brep_faces: "B-Rep Yüzey Sayısı",
    lbl_simplification_rate: "B-Rep Sadeleştirme Oranı",
    lbl_step_size: "STEP Dosya Boyutu",
    lbl_detected_cylinders: "Algılanan Silindirler",
    lbl_detected_planes: "Algılanan Düzlemler",
    lbl_proc_time: "İşlem Süresi",

    // CAD Export Card
    card_export_title: "CAD Yazılımlarına Aktar",
    btn_open_fusion: "🚀 Autodesk Fusion 360'a Gönder",
    btn_open_freecad: "📐 FreeCAD ile Aç",
    btn_save_step: "💾 STEP Olarak Farklı Kaydet...",
    btn_reveal_explorer: "📂 Dosya Konumunu Aç",

    // DfAM Tab
    card_dfam_score: "📐 DfAM Üretilebilirlik Skoru",
    dfam_calculating: "Hesaplanıyor...",
    dfam_waiting: "3D model verisi bekleniyor...",
    btn_optimize_dfam: "🚀 3D Baskı Yönünü Optimize Et (1-Tıkla)",
    dfam_reason_default: "Parçayı en az destek gerektiren ve en geniş tabla yapışması sağlayan açıya otomatik oturtmak için butona tıklayın.",
    card_3d_print_params: "3D Yazıcı (Eklemeli İmalat) Parametreleri",
    lbl_support_area: "Destek Alanı (>45°)",
    lbl_critical_overhang: "Kritik Sarkma (>60°)",
    lbl_bed_contact: "Zemin / Tabla Teması",
    lbl_warping_risk: "Bükülme (Warping) Riski",
    lbl_thin_wall: "Min. Et Kalınlığı",
    lbl_sagitta: "Delik Sagitta Büzülmesi",
    card_cad_verify: "Teknik Çizim & Katı Doğrulama",
    lbl_facet_reduction: "Faset Sadeleşme Oranı",
    lbl_vol_dev: "Hacim Sapması (Mesh vs Katı STEP)",
    lbl_solid_integrity: "Katı Bütünlüğü & Manifoldluk",
    card_engineering_recs: "👷 Mühendislik Tavsiyeleri & PM Notları",
    dfam_rec_default: "Model yüklendiğinde Makina Tasarım Mühendisi analiz maddeleri burada listelenecektir.",

    // AI Assistant Tab
    card_ai_title: "🤖 Gemini AI Tersine Mühendislik",
    ai_desc: "Yapay zeka parça geometrisini inceler; silindirik yuvaları, düz montaj yüzeylerini, imalat yöntemlerini (3D Baskı vs CNC) ve mukavemet tavsiyelerini listeler.",
    btn_run_ai: "Modeli AI ile İncele",
    ai_output_default: "AI analizi almak için yukarıdaki butona tıklayın...",

    // Modals
    modal_settings_title: "Sistem ve API Ayarları",
    lbl_hardware_accel: "Donanım Hızlandırma & GPU",
    lbl_detected_gpu: "Algılanan Grafik Kartı",
    lbl_cpu_threads: "CPU İş Parçacığı Sayısı (Threads)",
    opt_threads_20: "Maksimum Performans (20 Thread)",
    opt_threads_16: "16 Thread",
    opt_threads_8_perf: "8 Thread",
    opt_threads_4_low: "4 Thread (Düşük Kaynak)",
    lbl_threads_help: "OpenCASCADE B-Rep dikiş ve faset motoruna ayrılan çekirdek sayısı.",
    lbl_gemini_key: "Google Gemini API Anahtarı",
    ph_gemini_key: "AIzaSy... veya AQ.Ab...",
    gemini_key_sub: "Tersine mühendislik ve akıllı analiz için API anahtarınız (Opsiyonel).",
    lbl_ai_model: "AI Modeli (Google Gemini)",
    btn_cancel: "Vazgeç",
    btn_save_settings: "💾 Ayarları Kaydet",

    modal_history_title: "Dönüştürme Geçmişi ve Katı Model Arşivi",
    btn_clear_history: "🗑️ Geçmişi Temizle",
    lbl_total_models: "Toplam Model:",
    lbl_success_solids: "Başarılı Katı:",
    lbl_avg_reduction: "Ort. B-Rep Sadeleştirme:",
    ph_history_search: "🔍 Model adı, format veya motor ara...",
    history_footer_note: "💾 Veriler yerel diskte (conversion_history.json) kalıcı olarak saklanır. Uygulama kapansa bile kaybolmaz.",
    btn_close: "Kapat",
    history_empty: "Henüz tamamlanmış bir dönüştürme kaydı bulunmuyor.",

    modal_unsaved_title: "Önceki Katı Model (STEP) Kaydedilsin mi?",
    unsaved_warning: "Daha önce dönüştürdüğünüz katı CAD modeli (STEP) henüz kaydedilmedi. Yeni bir model yüklediğinizde bu model 3D sahneden temizlenecektir.",
    lbl_completed_solid: "Tamamlanan Katı Model",
    btn_save_and_open: "💾 STEP'i Kaydet & Devam Et",
    btn_discard: "🗑️ Kaydetmeden Sil & Yeni Modeli Aç",

    // Units
    unit_tris: "adet",
    unit_pts: "nokta",
    unit_facets: "faset",

    // Status Bar
    status_ready: "Hazır. Model bekleniyor...",
    status_loading: "Model yükleniyor...",
    status_converting: "Dönüştürülüyor...",
    status_success: "Dönüştürme başarıyla tamamlandı!",

    // About Modal & Credits
    btn_about: "Hakkında",
    about_modal_btn_tip: "Hakkında, Geliştirici & GitHub Deposu",
    hover_open_about: "Geliştirici & Proje Hakkında",
    modal_about_title: "Mesh2Step 3D Studio Hakkında",
    about_hero_tag: "100% Manifold Analitik B-Rep STEP Katı CAD Çekirdeği",
    about_hero_desc: "Mesh modellerini (.stl, .3mf, .obj, .ply) doğrudan parametrik CAD uyumlu katı STEP (ISO 10303-21) modellerine dönüştüren yeni nesil tersine mühendislik stüdyosu.",
    about_dev_role: "Yazılım & Algoritma Geliştiricisi",
    about_dev_desc: "Mesh işleme, tersine mühendislik, B-Rep katı yüzey dikimi ve yapay zeka optimizasyon algoritmaları mimarı.",
    about_repo_badge: "Açık Kaynak Kod & Resmi Depo",
    about_repo_title: "Resmi GitHub Deposu",
    about_repo_desc: "Mesh2Step projesinin kaynak kodları, kurulum paketleri, teknik mimari belgeleri ve güncel yayınları (releases) GitHub üzerinde barındırılmaktadır.",
    about_repo_btn: "🌐 GitHub Deposunu Aç",
    btn_copy_link: "Bağlantıyı Kopyala",
    about_changelog_badge: "Sürüm Günlüğü & Değişiklikler",
    about_changelog_title: "Sürüm Notları (CHANGELOG)",
    about_changelog_desc: "Tüm hata düzeltmeleri, algoritma geliştirmeleri ve yeni özellikler projenin GitHub deposundaki CHANGELOG.md dosyasında düzenli olarak güncellenmektedir.",
    about_changelog_btn: "📜 Sürüm Günlüğünü Oku (CHANGELOG.md)",
    about_spec_version: "Yüklü Sürüm:",
    about_spec_date: "Yayın Tarihi:",
    about_spec_engine: "CAD Çekirdeği:",
    about_spec_license: "Telif Hakları & Lisans:",
    about_copyright_note: "© 2026 Okan YEŞİLYURT. Tüm hakları saklıdır."
  },

  en: {
    // Header & Brand
    app_brand: "MESH2STEP 3D STUDIO",
    app_subtitle: "Direct Mesh → STEP B-Rep Solid CAD Converter",
    gpu_scanning: "⚡ Scanning Hardware Acceleration...",
    btn_history: "📜 History",
    btn_history_title: "Past Conversion Reports and Solid CAD Models",
    btn_settings: "⚙️ Settings",
    btn_settings_title: "System, Hardware and API Settings",
    btn_open_model: "📂 Open Model",
    title_open_model: "Supported formats: .stl, .3mf, .obj, .ply, .glb, .gltf, .off",
    btn_lang_toggle_title: "Dili Değiştir / Switch Language",

    // Viewport HUD & Dropzone
    dropzone_title: "Select or Drop 3D Model File Here",
    dropzone_sub: ".stl, .3mf, .obj, .ply, .glb, .gltf, .off formats converted directly into solid CAD B-Rep",
    btn_browse: "📂 Select File from Computer",
    hud_mesh: "🔺 Mesh & Triangles",
    hud_solid: "💎 Solid CAD (STEP)",
    hud_compare: "🔄 Overlay",
    hud_split: "⏸️ Side-by-Side",
    title_wireframe: "Toggle Wireframe On / Off",
    title_edges: "Toggle CAD B-Rep Edges On / Off",
    title_grid: "Toggle Ground Grid On / Off",
    title_lay_flat: "Lay Flat on Bed (Orient Largest Face to Z=0)",
    title_rotate_90: "Rotate 90° and Lay Flat on Bed",
    title_scale_1000: "Scale 1000x (Convert Meter to mm Standard)",
    title_drag_mode: "Free 3D Body Drag Mode",
    title_reset_view: "Focus Camera on Model",
    exploded_label: "🧩 Explode:",
    btn_toggle_3d_drag: "🖐️ 3D Drag",
    btn_progress_cancel: "🛑 Stop",
    progress_converting: "Converting to Solid CAD B-Rep...",
    hud_split_left: "🔺 Left: Original Mesh",
    hud_split_right: "💎 Right: STEP Solid Model",
    hud_split_reset: "🔄 Reset Positions",
    solo_inspect_title: "Inspecting Body",
    btn_prev_body: "◀ Prev",
    btn_next_body: "Next ▶",
    btn_exit_solo: "Back to Assembly",

    // Sidebar Tabs
    tab_convert: "🚀 Solid CAD",
    tab_heal: "🪄 Healing",
    tab_dfam: "📐 DfAM Audit",
    tab_ai: "🤖 AI Assistant",

    // Shortcuts & Hints
    engine_desc_short: "RANSAC + OpenCASCADE Analytical B-Rep Kernel",
    scan_shortcut_text: "3D Scan / Photogrammetry detected. Would you like to smooth surface ripples before conversion?",
    btn_goto_heal: "🪄 Heal ➔",
    btn_goto_convert: "🚀 Proceed to Solid CAD ➔",
    heal_next_hint: "After smoothing and preserving sharp features, switch to Solid CAD tab to generate a B-Rep model:",

    // Model Info Card
    card_model_info: "Model Properties",
    lbl_filename: "File Name",
    txt_no_model: "No model loaded",
    lbl_triangles: "Triangle Count",
    lbl_vertices: "Vertex Count",
    lbl_filesize: "File Size",
    lbl_diagonal: "Diagonal (Bound)",
    lbl_dimensions: "Dimensions (Width × Depth × Height)",
    warn_meter_scale: "⚠️ Model appears to be in meter scale.",
    btn_scale_1000: "📐 Convert to mm (1000x)",

    // Multi-body Assembly Card
    card_assemblies: "🧩 Assembly Bodies",
    btn_all: "All",
    btn_clear: "Clear",
    bodies_hint: "Select parts to convert. You can drag and position bodies independently in the 3D viewport:",
    btn_arrange_side: "↔️ Arrange Side-by-Side",
    btn_reset_pos: "🔄 Reset",

    // Smart Mesh Healing Card
    card_heal_title: "🪄 3D Scan & Mesh Healing",
    heal_desc: "Smooths undulating surfaces from KIRI Engine or mobile scans without losing volume or dulling sharp edges, deletes flying dust facets, and closes holes.",
    lbl_heal_intensity: "Smoothing / Healing Intensity",
    heal_light: "Light",
    heal_balanced: "Balanced",
    heal_strong: "Strong",
    heal_intensity_light_desc: "Light (6 Cycles)",
    heal_intensity_balanced_desc: "Balanced (Recommended)",
    heal_intensity_strong_desc: "Strong (28 Cycles)",
    chk_preserve_features: "📐 Preserve Sharp Edges (Feature-Preserving)",
    lbl_dihedral: "Corner Dihedral Angle:",
    opt_dihedral_30: "30° (Precise - Keep More Edges)",
    opt_dihedral_35: "35° (Balanced - CAD Standard)",
    opt_dihedral_45: "45° (Steep Edges Only)",
    chk_outliers: "Clean floating dust and detached outliers",
    chk_holes: "Close open holes and boundaries (Watertight)",
    chk_smooth: "Surface smoothing & noise reduction",
    lbl_heal_method: "Smoothing Method:",
    method_taubin: "Taubin (Volume-Preserving)",
    method_bilateral: "Bilateral (Surface Normals)",
    chk_decimate: "Facet decimation (Reduce triangles by 50%)",
    btn_heal_mesh: "🪄 Heal & Smooth Mesh",
    btn_revert_heal: "↩️ Revert",
    scan_detected_badge: "📷 3D Scan / Photogrammetry Model Detected",
    cad_detected_badge: "📐 Technical CAD / Prismatic Model Detected",

    // CAD Conversion Engine Card
    card_conv_settings: "Conversion Settings",
    lbl_cad_engine: "🚀 CAD Conversion Engine",
    engine_title_native: "Titan Analytical CAD Engine (v3.0)",
    engine_desc_native: "RANSAC + OpenCASCADE Analytical Geometry Kernel. Merges coplanar faces, fits analytical cylinders, preserves helical threads with sub-micron accuracy, and produces 100% watertight solid CAD models.",
    tab_ai_mode: "🤖 AI Auto Mode",
    tab_expert_mode: "⚙️ Expert Mode",

    // Model Style & Design Characteristics
    model_style_title: "📐 Model Style & Design Type",
    style_placeholder: "⚡ Select Model Style or Detect with AI...",
    style_hint_text: "If you are unsure of the design type, click the [🤖 Detect with AI] button above to automatically diagnose the geometry.",
    badge_auto: "Auto",
    badge_manual: "Manual",
    badge_pending: "Awaiting Selection",
    badge_ai_gemini: "🤖 Gemini AI",
    badge_local_geo: "⚡ Local Geometry",
    btn_detect_ai: "Detect with AI",
    btn_detect_title: "Analyze model using Google Gemini AI or local topology engine",
    style_prismatic: "📐 Prismatic / Mechanical Bracket & Housing",
    style_gear: "⚙️ Gear & Shaft / Transmission Element",
    style_fastener: "🔩 Screw, Nut & Threaded Fastener",
    style_organic: "🎨 Organic Form / Sculpture / Figurine",
    style_honeycomb: "🕳️ Honeycomb / Porous Lattice Structure",
    style_scan: "📱 3D Scan / Reverse Engineering",

    // AI Tune Box
    ai_tune_title: "💡 Smart Model Diagnosis",
    ai_analyzing: "⏳ Analyzing Model...",
    ai_default_desc: "When a model is loaded, AI and topology heuristics diagnose geometry to automatically select optimal CAD engine settings.",
    ai_pending_desc: "When a model is loaded or [🤖 Detect with AI] is clicked, geometry is analyzed and optimal CAD settings are configured.",

    // Quality Preference
    quality_label: "🎯 CAD Surface Quality",
    q_fast_title: "Fast CAD",
    q_fast_sub: "Preserves facets",
    q_balanced_title: "Balanced CAD",
    q_balanced_sub: "Clean surfaces",
    q_high_title: "Titan Precision",
    q_high_sub: "Full Manifold Solid",
    q_fast_summary: "Fast CAD (Basic Facets)",
    q_balanced_summary: "Balanced CAD (Recommended)",
    q_high_summary: "Titan Precision (Full Manifold Solid)",

    // Convert Buttons
    btn_convert_ai: "🚀 CONVERT (STEP)",
    btn_convert_expert: "🚀 CONVERT (STEP)",

    // Header Hover Popover
    hover_release: "Released:",
    hover_kernel: "Kernel:",
    hover_status: "Status:",
    hover_stable: "Stable Release",

    // Expert Mode
    lbl_engine_mode: "B-Rep Engine Mode",
    opt_mode_verbatim: "High-Speed Faceted Solid (Verbatim - Recommended)",
    opt_mode_trueform: "Analytical Solid (TrueForm - Cylinder & Plane Fitting)",
    lbl_unify: "Unify Coplanar Surfaces",
    opt_unify_true: "Enabled (Merges Coplanar Faces)",
    opt_unify_false: "Disabled (Keep Each Triangle as Separate Face - Safe Mode)",
    lbl_unify_angle: "Surface Simplification & Quality",
    opt_angle_precise: "Precise CAD (0.5° - Detailed Facets)",
    opt_angle_balanced: "Balanced CAD (2.5° - Recommended)",
    opt_angle_smooth: "High Simplification (5.0° - Simplified Faces)",
    opt_angle_max: "Maximum Simplification (8.0° - Minimum Faces)",
    lbl_threads: "CPU Worker Threads",
    opt_threads_auto: "Maximum (All Cores)",
    opt_threads_8: "8 Cores",
    opt_threads_4: "4 Cores",

    // Conversion Results Card
    card_results_title: "Solid Model Results",
    lbl_engine_used: "Engine Used",
    lbl_solid_status: "Solid Watertight Status",
    lbl_volume_verify: "Volume Verification (Mesh ➔ CAD B-Rep)",
    lbl_brep_faces: "B-Rep Face Count",
    lbl_simplification_rate: "B-Rep Simplification Rate",
    lbl_step_size: "STEP File Size",
    lbl_detected_cylinders: "Detected Cylinders",
    lbl_detected_planes: "Detected Planes",
    lbl_proc_time: "Processing Time",

    // CAD Export Card
    card_export_title: "Export to CAD Software",
    btn_open_fusion: "🚀 Send to Autodesk Fusion 360",
    btn_open_freecad: "📐 Open in FreeCAD",
    btn_save_step: "💾 Save As STEP...",
    btn_reveal_explorer: "📂 Open File Location",

    // DfAM Tab
    card_dfam_score: "📐 DfAM Manufacturability Score",
    dfam_calculating: "Calculating...",
    dfam_waiting: "Waiting for 3D model data...",
    btn_optimize_dfam: "🚀 Optimize Print Orientation (1-Click)",
    dfam_reason_default: "Click to automatically orient the part for minimal support volume and maximum bed adhesion.",
    card_3d_print_params: "3D Printing (Additive Mfg) Metrics",
    lbl_support_area: "Support Area (>45°)",
    lbl_critical_overhang: "Critical Overhang (>60°)",
    lbl_bed_contact: "Bed Contact Area",
    lbl_warping_risk: "Warping / Shrinkage Risk",
    lbl_thin_wall: "Min. Wall Thickness",
    lbl_sagitta: "Bore Sagitta Shrinkage",
    card_cad_verify: "CAD Fidelity & Solid Verification",
    lbl_facet_reduction: "Facet Reduction Ratio",
    lbl_vol_dev: "Volume Deviation (Mesh vs STEP)",
    lbl_solid_integrity: "Solid Manifold Integrity",
    card_engineering_recs: "👷 Engineering Recommendations & PM Notes",
    dfam_rec_default: "Mechanical engineering analysis notes will appear here once a model is loaded.",

    // AI Assistant Tab
    card_ai_title: "🤖 Gemini AI Reverse Engineering",
    ai_desc: "AI analyzes part geometry; identifies cylindrical bores, mounting planes, manufacturing methods (3D Print vs CNC), and assembly recommendations.",
    btn_run_ai: "Inspect Model with AI",
    ai_output_default: "Click the button above to generate AI engineering analysis...",

    // Modals
    modal_settings_title: "System & API Settings",
    lbl_hardware_accel: "Hardware Acceleration & GPU",
    lbl_detected_gpu: "Detected Graphics Card",
    lbl_cpu_threads: "CPU Worker Threads",
    opt_threads_20: "Maximum Performance (20 Threads)",
    opt_threads_16: "16 Threads",
    opt_threads_8_perf: "8 Threads",
    opt_threads_4_low: "4 Threads (Low Resource)",
    lbl_threads_help: "Number of CPU threads allocated to OpenCASCADE B-Rep stitching and meshing kernel.",
    lbl_gemini_key: "Google Gemini API Key",
    ph_gemini_key: "AIzaSy... or AQ.Ab...",
    gemini_key_sub: "Your API key for reverse engineering and smart analysis (Optional).",
    lbl_ai_model: "AI Model (Google Gemini)",
    btn_cancel: "Cancel",
    btn_save_settings: "💾 Save Settings",

    modal_history_title: "Conversion History & Solid Archive",
    btn_clear_history: "🗑️ Clear History",
    lbl_total_models: "Total Models:",
    lbl_success_solids: "Successful Solids:",
    lbl_avg_reduction: "Avg. B-Rep Reduction:",
    ph_history_search: "🔍 Search model name, format or engine...",
    history_footer_note: "💾 Records are stored permanently on local disk (conversion_history.json).",
    btn_close: "Close",
    history_empty: "No conversion records found yet.",

    modal_unsaved_title: "Save Previous Solid Model (STEP)?",
    unsaved_warning: "The previously converted solid CAD model (STEP) has not been saved yet. Opening a new model will remove it from the 3D scene.",
    lbl_completed_solid: "Completed Solid Model",
    btn_save_and_open: "💾 Save STEP & Continue",
    btn_discard: "🗑️ Discard & Open New",

    // Units
    unit_tris: "triangles",
    unit_pts: "points",
    unit_facets: "facets",

    // Status Bar
    status_ready: "Ready. Waiting for model...",
    status_loading: "Loading model...",
    status_converting: "Converting...",
    status_success: "Conversion completed successfully!",

    // About Modal & Credits
    btn_about: "About",
    about_modal_btn_tip: "About, Developer & GitHub Repo",
    hover_open_about: "About Developer & Project",
    modal_about_title: "About Mesh2Step 3D Studio",
    about_hero_tag: "100% Manifold Analytical B-Rep STEP CAD Kernel",
    about_hero_desc: "Next-generation reverse engineering studio converting polygon meshes (.stl, .3mf, .obj, .ply) directly into solid parametric STEP (ISO 10303-21) models.",
    about_dev_role: "Software & Algorithm Developer",
    about_dev_desc: "Architect of mesh processing, reverse engineering, B-Rep solid stitching, and AI-assisted topology optimization algorithms.",
    about_repo_badge: "Open Source Code & Official Repo",
    about_repo_title: "Official GitHub Repository",
    about_repo_desc: "Mesh2Step source code, installation packages, technical architecture docs, and release packages are hosted on GitHub.",
    about_repo_btn: "🌐 Open GitHub Repository",
    btn_copy_link: "Copy Link",
    about_changelog_badge: "Version Changelog & Release Notes",
    about_changelog_title: "Version Notes (CHANGELOG)",
    about_changelog_desc: "All bug fixes, algorithmic improvements, and new features are systematically documented in the CHANGELOG.md file on GitHub.",
    about_changelog_btn: "📜 View Release Notes (CHANGELOG.md)",
    about_spec_version: "Installed Version:",
    about_spec_date: "Release Date:",
    about_spec_engine: "CAD Kernel:",
    about_spec_license: "Copyright & License:",
    about_copyright_note: "© 2026 Okan YEŞİLYURT. All rights reserved."
  }
};

let currentLanguage = localStorage.getItem('mesh2step_language') || 'tr';

function t(key, fallback = '') {
  const dict = I18N_DICTIONARY[currentLanguage] || I18N_DICTIONARY.tr;
  return dict[key] || fallback || key;
}

function getCurrentLanguage() {
  return currentLanguage;
}

function setLanguage(lang) {
  if (lang !== 'tr' && lang !== 'en') lang = 'tr';
  currentLanguage = lang;
  localStorage.setItem('mesh2step_language', lang);
  document.documentElement.lang = lang;

  // 1. Update elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key && I18N_DICTIONARY[lang] && I18N_DICTIONARY[lang][key]) {
      el.textContent = I18N_DICTIONARY[lang][key];
    }
  });

  // 2. Update elements with data-i18n-title
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key && I18N_DICTIONARY[lang] && I18N_DICTIONARY[lang][key]) {
      el.setAttribute('title', I18N_DICTIONARY[lang][key]);
    }
  });

  // 3. Update elements with data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key && I18N_DICTIONARY[lang] && I18N_DICTIONARY[lang][key]) {
      el.setAttribute('placeholder', I18N_DICTIONARY[lang][key]);
    }
  });

  // 4. Update language toggle button in header
  const flagEl = document.getElementById('lang-flag');
  const codeEl = document.getElementById('lang-code');
  if (flagEl && codeEl) {
    if (lang === 'tr') {
      flagEl.textContent = '🇹🇷';
      codeEl.textContent = 'TR';
    } else {
      flagEl.textContent = '🇬🇧';
      codeEl.textContent = 'EN';
    }
  }

  // 5. Update Quality Summary
  if (typeof updateQualitySummaryText === 'function') {
    updateQualitySummaryText();
  }

  // 6. Update Model Style Badge
  const styleSourceBadge = document.getElementById('model-style-source-badge');
  if (styleSourceBadge) {
    const currentSrc = styleSourceBadge.dataset.source || 'auto';
    if (currentSrc === 'manual') {
      styleSourceBadge.textContent = t('badge_manual');
    } else if (currentSrc === 'gemini') {
      styleSourceBadge.textContent = t('badge_ai_gemini');
    } else if (currentSrc === 'local') {
      styleSourceBadge.textContent = t('badge_local_geo');
    } else {
      styleSourceBadge.textContent = t('badge_auto');
    }
  }

  // 7. Update Healing intensity label if function exists
  if (typeof setHealIntensity === 'function' && typeof currentHealIntensity !== 'undefined') {
    setHealIntensity(currentHealIntensity);
  }

  // 8. Update initial empty state labels if no model is loaded
  if (typeof currentFilePath !== 'undefined' && !currentFilePath) {
    const fnEl = document.getElementById('stat-filename');
    if (fnEl) fnEl.textContent = t('txt_no_model');
    const dfamTarget = document.getElementById('dfam-target-name');
    if (dfamTarget) dfamTarget.textContent = t('txt_no_model');
    const dfamStatus = document.getElementById('dfam-status-text');
    if (dfamStatus) dfamStatus.textContent = t('dfam_waiting');
  }

  // 9. Re-render assembly bodies list if present
  if (typeof window.renderBodiesList === 'function' && window.currentBodies && window.currentBodies.length > 0) {
    window.renderBodiesList(window.currentBodies);
  }

  console.log(`[i18n] Language switched to: ${lang.toUpperCase()}`);
}

function toggleLanguage() {
  const nextLang = currentLanguage === 'tr' ? 'en' : 'tr';
  setLanguage(nextLang);
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setLanguage(currentLanguage));
} else {
  setLanguage(currentLanguage);
}
