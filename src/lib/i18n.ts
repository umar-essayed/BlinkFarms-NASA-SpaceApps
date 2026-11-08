// ==============================================================================
// BlinkFarms — Bilingual Dictionary (Arabic & English)
// Apple Human Interface Guidelines Typography & Precision Copy
// ==============================================================================

export const I18N = {
  ar: {
    appName: 'BlinkFarms',
    tagline: 'منظومة التكيف الزراعي ببيانات ناسا',
    challengeBadge: 'تحدي NASA Space Apps الرسمي',
    liveTelemetry: 'اتصال حي بأقمار ناسا',
    
    // Navigation Tabs
    tabShock: 'كشف الجفاف الومضي',
    tabRotations: 'محاكي الدورات لـ 3 سنوات',
    tabMemory: 'ذاكرة الحقل والتربة',
    tabChat: 'المساعد الزراعي الذكي',
    
    // Field Selector
    selectField: 'اختر الحقل التجريبي:',
    changeField: 'تغيير الحقل',
    
    // Shock Tab
    canopyTemp: 'حرارة سطح الظلة',
    feverAnomaly: 'حمى النبات الزائدة',
    esiIndex: 'مؤشر الإجهاد التبخري',
    ndviGreenness: 'مؤشر الخضرة الظاهري',
    prescribedIrrigation: 'حجم الري الموصى به اليوم',
    perHectare: 'متر مكعب / هكتار',
    depthMm: 'ملم عمق مائي',
    alertActive: 'إنذار مبكر: جفاف ومضي نشط',
    alertStable: 'الحالة مستقرة: لا يوجد إجهاد حاد',
    leadTimeAdvantage: 'ميزة الـ 14 يوماً قبل اصفرار الكلوروفيل',
    leadTimeDesc: 'رصد انهيار البخر فسيولوجياً وإغلاق الثغور بينما يظل مؤشر NDVI أخضر مخادعاً.',
    chartTitle: 'مقارنة مسار مؤشر الإجهاد ESI مع خضرة NDVI (الـ 45 يوماً الماضية)',
    doyAxis: 'اليوم السنوي (DOY)',
    
    // Rotations Tab
    rotationHeadline: 'مقارنة 3 استراتيجيات للدورات الزراعية المتعاقبة',
    rotationSubheadline: 'مبنية على موازنة المياه اليومية FAO-56 وخوارزمية Dynamic TOPSIS متعددة الأهداف',
    prioritiesTitle: 'حدد أولوياتك الحقلية:',
    weightProfit: 'الربح المالي',
    weightWater: 'توفير وترشيد المياه',
    weightSoil: 'بناء وتجديد التربة',
    weightClimate: 'مقاومة صدمات الجفاف',
    
    // Strategy Cards
    waterSaved: 'وفر مائي تراكمي',
    nitrogenAdded: 'نيتروجين عضوي مكتسب',
    failureRisk: 'احتمال خسارة المحصول',
    netProfit: 'صافي العائد المتوقع',
    topsisRank: 'درجة الملاءمة TOPSIS',
    year: 'السنة',
    evidence: 'الأدلة العلمية المدعومة ببيانات ناسا:',
    risksAndGaps: 'المخاطر وفجوات البيانات المحلية:',
    recommendedBadge: 'الخيار رقم 1 الموصى به',
    baselineBadge: 'الدورة الحالية (المقارنة)',
    
    // Memory Tab
    memoryTitle: 'تشخيص ذاكرة الحقل تحت الأرض',
    carryoverWater: 'رصيد المياه المرحل بالأعماق',
    stressFrequency: 'تكرار صدمات الجفاف (36 شهراً)',
    soilCompaction: 'حالة الطبقة الصماء تحت الجذور',
    hardpanDetected: 'تم كشف طبقة صماء مضغوطة (~45 سم)',
    hardpanNone: 'النفاذية طبيعية ولا توجد طبقة صماء',
    salinityLevel: 'مستوى خطر الملوحة الموضعية',
    normal: 'طبيعي',
    moderate: 'متوسط',
    severe: 'مرتفع',
    soilProbeExplanation: 'معادلة المسبار العكسي (Closed-Loop Probing): يقارن النظام استجابة التعافي بالأقمار بعد 48 ساعة من الري لاكتشاف عوائق التربة دون الحاجة لمجسات أرضية مكلفة.',
    
    // Chatbot Tab
    chatPlaceholder: 'اكتب سؤالك هنا بلهجتك العادية... (مثال: أروي النهاردة كام ملم؟)',
    sendBtn: 'إرسال',
    quickQuestions: 'أسئلة حقلية سريعة:',
    quick1: 'أرضي خضرا، ليه قمر ناسا بيقول لي أروي النهاردة؟',
    quick2: 'اقترح لي أحسن دورة زراعية لـ 3 سنين توفر مية',
    quick3: 'هل في أرضي ملوحة أو طبقة صماء تحت التربة؟',
    
    // Footer & Disclaimer
    disclaimer: 'تطبيق تجريبي لدعم القرار الزراعي استجابة لتحدي NASA Space Apps Challenge 2026. الأداة استرشادية ولا تغني عن حكمة المزارع واستشارة المرشدين الزراعيين المحليين.',
    nasaDataNotice: 'البيانات مسحوبة ومحاكاة وفق منتجات ECOSTRESS, SMAP L4, HLS, و NASA POWER المفتوحة.'
  },
  
  en: {
    appName: 'BlinkFarms',
    tagline: 'Adaptive Agriculture with NASA Earth Observations',
    challengeBadge: 'Official NASA Space Apps Challenge',
    liveTelemetry: 'Live NASA Satellite Feed',
    
    // Navigation Tabs
    tabShock: 'Flash Drought Monitor',
    tabRotations: '3-Year Rotation Simulator',
    tabMemory: 'Subsoil & Field Memory',
    tabChat: 'Farmer AI Assistant',
    
    // Field Selector
    selectField: 'Select Benchmark Field:',
    changeField: 'Change Field',
    
    // Shock Tab
    canopyTemp: 'Canopy Surface Temperature',
    feverAnomaly: 'Canopy Thermal Fever',
    esiIndex: 'Evaporative Stress Index (ESI)',
    ndviGreenness: 'Apparent Greenness (NDVI)',
    prescribedIrrigation: 'Prescribed Irrigation Today',
    perHectare: 'm³ / hectare',
    depthMm: 'mm water depth',
    alertActive: 'Early Warning: Flash Drought Active',
    alertStable: 'Status Stable: Optimal Transpiration',
    leadTimeAdvantage: '14-Day Lead-Time Advantage Over Chlorophyll Loss',
    leadTimeDesc: 'Stomatal closure and vascular drought detected weeks before visible NDVI yellowing occurs.',
    chartTitle: 'Evaporative Stress (ESI) vs. Vegetation Greenness (NDVI) — Last 45 Days',
    doyAxis: 'Day of Year (DOY)',
    
    // Rotations Tab
    rotationHeadline: 'Compare 3 Multi-Year Crop Rotation Strategies',
    rotationSubheadline: 'Powered by FAO-56 Daily Water Balance & Multi-Objective Dynamic TOPSIS',
    prioritiesTitle: 'Tune Your Farm Priorities:',
    weightProfit: 'Financial Profit',
    weightWater: 'Water Conservation',
    weightSoil: 'Soil Structural Health',
    weightClimate: 'Climate Risk Resilience',
    
    // Strategy Cards
    waterSaved: 'Cumulative Water Saved',
    nitrogenAdded: 'Organic N Added',
    failureRisk: 'Drought Collapse Risk',
    netProfit: 'Expected Net Return',
    topsisRank: 'TOPSIS Closeness Score',
    year: 'Year',
    evidence: 'NASA Satellite & Modeling Evidence:',
    risksAndGaps: 'Local Risks & Data Gaps:',
    recommendedBadge: 'Rank #1 Recommended',
    baselineBadge: 'Current Baseline Rotation',
    
    // Memory Tab
    memoryTitle: 'Subsoil Diagnostics & Historical Memory',
    carryoverWater: 'Subsoil Carryover Water Fraction',
    stressFrequency: 'Flash Drought Frequency (36 Mo)',
    soilCompaction: 'Subsoil Hardpan Compaction Status',
    hardpanDetected: 'Dense Compaction Layer Detected (~45 cm)',
    hardpanNone: 'Percolation Optimal — No Hardpan Detected',
    salinityLevel: 'Localized Salinity Risk',
    normal: 'Normal',
    moderate: 'Moderate',
    severe: 'Severe',
    soilProbeExplanation: 'Closed-Loop Probing: The system monitors canopy recovery 48 hours post-irrigation to diagnose subsoil flow restrictions without costly buried sensors.',
    
    // Chatbot Tab
    chatPlaceholder: 'Ask in plain language... (e.g. How much should I irrigate today?)',
    sendBtn: 'Send',
    quickQuestions: 'Quick Farm Inquiries:',
    quick1: 'My field is green, why does NASA say irrigate today?',
    quick2: 'Recommend the best 3-year rotation to save water and profit',
    quick3: 'Is there a hardpan compaction layer beneath my soil?',
    
    // Footer & Disclaimer
    disclaimer: 'Decision-support prototype built for the NASA Space Apps Challenge 2026. This tool is designed to support—not replace—farmer judgment and local agricultural extension expertise.',
    nasaDataNotice: 'Observations powered by ECOSTRESS, SMAP L4, HLS, and NASA POWER open science repositories.'
  }
};
