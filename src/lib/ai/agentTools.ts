import { CROP_DATABASE } from '@/lib/cropDatabase';
import { simulateRotationStrategies, DEFAULT_PRIORITIES } from '@/lib/fieldShiftEngine';
import { generateFieldTelemetry, deriveFieldMemoryFromCoords } from '@/lib/veloceRootEngine';

export interface ToolInvocationResult {
  id?: string;
  name: string;
  labelAr: string;
  labelEn: string;
  status: 'success' | 'error';
  input: any;
  output: any;
  summaryAr: string;
  summaryEn: string;
}

// ============================================================================
// 1. OPENAI / GROQ AGENT TOOL SCHEMAS (FUNCTION DEFINITIONS)
// ============================================================================
export const AGENT_TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'simulate_crop_scenario',
      description: 'Simulates biophysical crop growth, FAO-56 water deficit, and soil salinity yield penalty (e.g., when a farmer asks "What if I plant Rice, Potatoes, Fava Beans, Wheat, etc.?"). Returns real expected yield ratio, water consumption in m3/feddan, and salinity compatibility.',
      parameters: {
        type: 'object',
        properties: {
          crop_name: {
            type: 'string',
            description: 'Name of the crop in Arabic or English (e.g. rice / أرز, potatoes / بطاطس, wheat / قمح, faba / فول, clover / برسيم, maize / ذرة, sorghum / سورجم, sunflower / عباد شمس).',
          },
          salinity_level: {
            type: 'string',
            enum: ['low', 'normal', 'moderate', 'severe'],
            description: 'Soil salinity level. Defaults to field state if omitted.',
          },
          water_availability_percent: {
            type: 'number',
            description: 'Percentage of water available (100 = full irrigation, 70 = 30% deficit). Defaults to 100.',
          },
        },
        required: ['crop_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_topsis_rotation_optimizer',
      description: 'Executes the 3-Year / 6-Season FieldShift rotation optimizer using multi-criteria TOPSIS decision theory. Use when farmer asks to maximize profit, save water, break subsoil hardpan, or plan next seasons.',
      parameters: {
        type: 'object',
        properties: {
          primary_goal: {
            type: 'string',
            enum: ['balanced', 'water_saving', 'profit', 'soil_health'],
            description: 'The farmer objective: balanced (recommended), water_saving (drought/water cuts), profit (cash margin), or soil_health (fixing nitrogen/hardpan).',
          },
          water_cut_percent: {
            type: 'number',
            description: 'Simulated water shortage percentage (0 to 30%). Defaults to 0.',
          },
          heatwave_c: {
            type: 'number',
            description: 'Simulated heatwave temperature rise above normal in Celsius (0 to 4). Defaults to 0.',
          },
        },
        required: ['primary_goal'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_nasa_drought_telemetry',
      description: 'Fetches live satellite observations from NASA (ECOSTRESS thermal infrared canopy fever, downscaled SMAP 30m root-zone moisture, NDVI greenness, and 14-day flash drought warning countdown) for the active parcel.',
      parameters: {
        type: 'object',
        properties: {
          include_14day_forecast: {
            type: 'boolean',
            description: 'Whether to include the 14-day early warning countdown for stomatal closure.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_ithmar_knowledge_base',
      description: 'Queries official Egyptian Ministry of Agriculture ("إثمار" Ithmar) guidelines covering planting windows (عروات شتوية وصيفية), precise NPK & Urea fertilizer dosages per feddan, approved pest/disease remedies, and Egyptian market economics (costs & revenue in EGP).',
      parameters: {
        type: 'object',
        properties: {
          crop_name: {
            type: 'string',
            description: 'Target crop (e.g., wheat, rice, maize, clover, faba, potato, tomato, cotton, beet, sesame).',
          },
          topic: {
            type: 'string',
            enum: ['planting_window', 'fertilization_schedule', 'pests_and_diseases', 'economic_roi', 'all'],
            description: 'The agronomic topic to query.',
          },
        },
        required: ['crop_name', 'topic'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_field_parameters',
      description: 'Updates active field setup when the farmer specifies real changes in chat (e.g. changing area to 10 feddans, changing irrigation from flood to drip, or recording newly harvested crop).',
      parameters: {
        type: 'object',
        properties: {
          area_feddan: {
            type: 'number',
            description: 'Updated field acreage in feddans.',
          },
          irrigation_type: {
            type: 'string',
            enum: ['تنقيط', 'غمر', 'رش', 'بيفوت', 'Drip', 'Flood', 'Sprinkler', 'Center Pivot'],
            description: 'Updated irrigation system.',
          },
          previous_crop: {
            type: 'string',
            description: 'Last harvested crop on the parcel.',
          },
          soil_type: {
            type: 'string',
            description: 'Updated soil texture.',
          },
        },
      },
    },
  },
];

// ============================================================================
// 2. EGYPTIAN AGRONOMIC KNOWLEDGE BASE (إثمار - ITHMAR DATABASE)
// ============================================================================
interface IthmarEntry {
  namesAr: string[];
  namesEn: string[];
  plantingWindowAr: string;
  plantingWindowEn: string;
  fertilizationScheduleAr: string;
  fertilizationScheduleEn: string;
  pestsAndDiseasesAr: string;
  pestsAndDiseasesEn: string;
  economicsEgp: {
    avgCostPerFeddanEgp: number;
    expectedYieldPerFeddan: string;
    expectedRevenuePerFeddanEgp: number;
    netProfitPerFeddanEgp: number;
  };
}

const ITHMAR_DATABASE: Record<string, IthmarEntry> = {
  wheat: {
    namesAr: ['قمح', 'القمح', 'قمح بلدي', 'غلة'],
    namesEn: ['wheat', 'durum wheat', 'bread wheat'],
    plantingWindowAr: 'العروة الشتوية المثالية: من 15 نوفمبر إلى 30 نوفمبر (تجنب الزراعة المبكرة لتفادي حشرة المن، وتجنب التأخير بعد أول ديسمبر لضمان التفريع الكامل).',
    plantingWindowEn: 'Optimal winter window: Nov 15 to Nov 30 across Nile Delta & Upper Egypt.',
    fertilizationScheduleAr: 'تسميد الفدان: 150 كجم سوبر فوسفات مع تجهيز الأرض + 75 وحدة أزوت (حوالي 3 شكاير يوريا 46% أو 4 شكاير نترات نشادر 33.5%) تُقسم على 3 دفعات مع رية المحاياة والرية الأولى والثانية + 50 كجم سلفات بوتاسيوم مع طرد السنابل.',
    fertilizationScheduleEn: '75 N units (3 bags urea or 4 bags ammonium nitrate) split in 3 doses + 50kg potassium sulphate.',
    pestsAndDiseasesAr: 'الصدأ الأصفر (أخطر فطر في الدلتا - يُكافح بمبيد تيلت أو كافالير فور ظهور البثور) + حشرة المن على السنابل (تُكافح بالملاثيون أو الأسيتامبريد).',
    pestsAndDiseasesEn: 'Stripe yellow rust and aphids managed with Tilt or Acetamiprid.',
    economicsEgp: {
      avgCostPerFeddanEgp: 14500,
      expectedYieldPerFeddan: '18 - 22 إردب / فدان (بالإضافة إلى حمل تبن)',
      expectedRevenuePerFeddanEgp: 44000,
      netProfitPerFeddanEgp: 29500,
    },
  },
  rice: {
    namesAr: ['أرز', 'رز', 'الارز', 'الرز'],
    namesEn: ['rice', 'paddy rice'],
    plantingWindowAr: 'العروة الصيفية: المشتل في أول مايو، والشتل في الأرض المستديمة من 1 إلى 20 يونيو (محظور زراعته خارج محافظات الدلتا الشمالية المصرح بها كفر الشيخ والدقهلية لتوفير المياه).',
    plantingWindowEn: 'Summer window: nurseries in early May, transplanting in June. Restricted to designated Delta governorates.',
    fertilizationScheduleAr: 'يحتاج الفدان 60 وحدة أزوت (أصناف عريضة الحبة كجيزة 178) أو 70 وحدة لأصناف رفيعة + 100 كجم كبريتات زنك في المشتل لمنع شلل الأرز، مع تجنب إضافة اليوريا على مياه راكدة جارية.',
    fertilizationScheduleEn: '60-70 N units + zinc sulphate to prevent seedling chlorosis.',
    pestsAndDiseasesAr: 'مرض اللفحة (Blast) في الليالي الرطبة + الدودة القارضة وثاقبة الساق (الديدان الأسطوانية). حساس بشدة للملوحة (يموت فوق 3 ديسيمنز).',
    pestsAndDiseasesEn: 'Rice blast and stem borers. Highly salt sensitive (>3 dS/m leads to failure).',
    economicsEgp: {
      avgCostPerFeddanEgp: 19000,
      expectedYieldPerFeddan: '3.5 - 4.2 طن / فدان',
      expectedRevenuePerFeddanEgp: 56000,
      netProfitPerFeddanEgp: 37000,
    },
  },
  maize: {
    namesAr: ['ذرة', 'ذره', 'ذرة صفراء', 'ذرة بيضاء'],
    namesEn: ['maize', 'corn', 'yellow corn'],
    plantingWindowAr: 'العروة الصيفية المبكرة: من 15 مايو إلى 20 يونيو (أفضل إنتاجية)، والعروة النيلية حتى منتصف يوليو.',
    plantingWindowEn: 'Summer window: May 15 to June 20. Late season up to mid-July.',
    fertilizationScheduleAr: 'الفدان يحتاج 120 وحدة أزوت (حوالي 5 شكاير يوريا 46% أو 7 شكاير نترات) تُعطى قبل الريات الأولى والثانية والثالثة قبل التزهير + رشة زنك مخلبي.',
    fertilizationScheduleEn: '120 N units (5 bags urea) split before first 3 irrigations.',
    pestsAndDiseasesAr: 'دودة الحشد الخريفية (أخطر آفة حشرية تأكل قلب النبات وتكافح بمبيد كوراجين أو بروكليم في الصباح الباكر أو الغروب) + حفار الساق والمن.',
    pestsAndDiseasesEn: 'Fall armyworm (FAW) managed with Coragen or Emamectin benzoate.',
    economicsEgp: {
      avgCostPerFeddanEgp: 16000,
      expectedYieldPerFeddan: '24 - 28 إردب / فدان (حبوب جافة)',
      expectedRevenuePerFeddanEgp: 48000,
      netProfitPerFeddanEgp: 32000,
    },
  },
  clover: {
    namesAr: ['برسيم', 'برسيم بلدي', 'برسيم مسقاوي', 'برسيم فحل'],
    namesEn: ['clover', 'berseem', 'berseem clover', 'alfalfa'],
    plantingWindowAr: 'العروة الشتوية: من 20 سبتمبر إلى 20 أكتوبر (أفضل ميعاد للتحريش والربى حتى الربيع).',
    plantingWindowEn: 'Winter window: late Sept to late Oct.',
    fertilizationScheduleAr: 'محصول بقولي يثبت النيتروجين الجوي! يحتاج جرعة تنشيطية واحدة فقط (شيكارة واحدة نترات نشادر) عند الزراعة + 150 كجم سوبر فوسفات لتقوية الجذور العقدية.',
    fertilizationScheduleEn: 'Leguminous N-fixing crop: only requires 1 starter N bag + superphosphate.',
    pestsAndDiseasesAr: 'دودة ورق القطن في الحشات الأولى (سبتمبر وأكتوبر) + الحامول (نبات طفيلي يجب التخلص من بذوره بنقاوة التقاوي المعتمدة).',
    pestsAndDiseasesEn: 'Cotton leafworm on early cuts + Cuscuta parasitic weed.',
    economicsEgp: {
      avgCostPerFeddanEgp: 11000,
      expectedYieldPerFeddan: '4 إلى 5 حشات (إنتاجية 30 - 40 طن علف أخضر)',
      expectedRevenuePerFeddanEgp: 38000,
      netProfitPerFeddanEgp: 27000,
    },
  },
  faba: {
    namesAr: ['فول', 'فول بلدي', 'الفول البلدي'],
    namesEn: ['faba', 'faba bean', 'broad bean'],
    plantingWindowAr: 'الوجه البحري: النصف الأول من نوفمبر. الوجه القبلي ومصر الوسطى: النصف الثاني من أكتوبر.',
    plantingWindowEn: 'Nile Delta: early Nov. Upper Egypt: mid-to-late Oct.',
    fertilizationScheduleAr: 'بقولي يثبت النيتروجين: شيكارة واحدة سلفات نشادر تنشيطية + 200 كجم سوبر فوسفات + شيكارة سلفات بوتاسيوم عند التزهير وعقد القرون.',
    fertilizationScheduleEn: '1 starter N bag + 200kg superphosphate + potassium at pod setting.',
    pestsAndDiseasesAr: 'الهالوك (أخطر طفيلي نباتي على الفول، يُكافح بزراعة أصناف مقاومة كجيزة 843 ورش راوند آب بجرعات دقيقة) + التبقع البني وصانعات الأنفاق.',
    pestsAndDiseasesEn: 'Orobanche (broomrape) parasite + chocolate spot fungal leaf disease.',
    economicsEgp: {
      avgCostPerFeddanEgp: 13500,
      expectedYieldPerFeddan: '9 - 12 إردب / فدان',
      expectedRevenuePerFeddanEgp: 45000,
      netProfitPerFeddanEgp: 31500,
    },
  },
  potatoes: {
    namesAr: ['بطاطس', 'البطاطس'],
    namesEn: ['potatoes', 'potato'],
    plantingWindowAr: 'عروة شتوية (نوفمبر - مارس) أو عروة صيفية مبكرة (يناير - مايو). حساسة جداً للملوحة ومياه الصرف المرتفعة.',
    plantingWindowEn: 'Winter (Nov-Mar) or Early Summer (Jan-May). Highly salt-sensitive.',
    fertilizationScheduleAr: 'محصول شَرِه للتسميد: 150 وحدة أزوت + 300 كجم سوبر فوسفات + 150 كجم سلفات بوتاسيوم لملء الدرنات.',
    fertilizationScheduleEn: '150 N units + 300kg superphosphate + 150kg potassium sulphate.',
    pestsAndDiseasesAr: 'الندوة المتأخرة والندوة المبكرة (فطريات مدمرة في الرطوبة والضباب) + العفن البني وفراشة درنات البطاطس.',
    pestsAndDiseasesEn: 'Late blight (Phytophthora) and early blight.',
    economicsEgp: {
      avgCostPerFeddanEgp: 38000,
      expectedYieldPerFeddan: '14 - 18 طن / فدان',
      expectedRevenuePerFeddanEgp: 95000,
      netProfitPerFeddanEgp: 57000,
    },
  },
  sorghum: {
    namesAr: ['سورجم', 'ذرة رفيعة', 'ذره رفيعه'],
    namesEn: ['sorghum', 'milo'],
    plantingWindowAr: 'العروة الصيفية: من مايو إلى يوليو (ممتاز جداً لأراضي توشكى والوادي الجديد والصعيد لتحمله حتى 45°م وملوحة 6.8 ديسيمنز).',
    plantingWindowEn: 'Summer window: May to July. Highly resilient to 45°C heat and 6.8 dS/m salinity.',
    fertilizationScheduleAr: '80 وحدة أزوت (أقل 40% من الذرة الشامية) + 100 كجم سوبر فوسفات.',
    fertilizationScheduleEn: '80 N units (saves 40% N vs standard maize).',
    pestsAndDiseasesAr: 'مقاوم لمعظم الآفات، قليل الإصابة بدودة الحشد، ممتاز لكسر دورات الديدان الثعبانية النيماتودا.',
    pestsAndDiseasesEn: 'Resistant to pests, interrupts nematode cycles.',
    economicsEgp: {
      avgCostPerFeddanEgp: 11500,
      expectedYieldPerFeddan: '18 - 22 إردب / فدان',
      expectedRevenuePerFeddanEgp: 36000,
      netProfitPerFeddanEgp: 24500,
    },
  },
  sunflower: {
    namesAr: ['عباد شمس', 'دوار الشمس', 'عباد الشمس'],
    namesEn: ['sunflower', 'oilseed sunflower'],
    plantingWindowAr: 'يمكن زراعته في 3 عروات (صيفية مبكرة مارس-أبريل، صيفية مايو-يونيو، ونيلية يوليو-أغسطس).',
    plantingWindowEn: 'Flexible: March to August across 3 distinct plantings.',
    fertilizationScheduleAr: 'جذوره الوتدية عميقة تسحب المخزون الباطني: يحتاج فقط 40 إلى 50 وحدة أزوت + 50 كجم بوتاسيوم لتحسين نسبة الزيت.',
    fertilizationScheduleEn: 'Deep taproots bio-drill subsoil: requires 40-50 N units + potassium.',
    pestsAndDiseasesAr: 'الطيور عند نضج الأقراص + صدأ الأوراق وعفن الساق الأبيض. يتحمل الملوحة المعتدلة حتى 5.5 ديسيمنز.',
    pestsAndDiseasesEn: 'Bird scavenging on mature heads + moderate salinity tolerance (5.5 dS/m).',
    economicsEgp: {
      avgCostPerFeddanEgp: 12000,
      expectedYieldPerFeddan: '1.2 - 1.5 طن بذور زيتية',
      expectedRevenuePerFeddanEgp: 37500,
      netProfitPerFeddanEgp: 25500,
    },
  },
};

// ============================================================================
// 3. TOOL EXECUTION RUNNER
// ============================================================================
export async function executeAgentTool(
  toolName: string,
  args: any,
  context: any
): Promise<ToolInvocationResult> {
  try {
    switch (toolName) {
      // ----------------------------------------------------------------------
      // Tool 1: Simulate Crop Scenario
      // ----------------------------------------------------------------------
      case 'simulate_crop_scenario': {
        const cropQuery = (args.crop_name || '').toLowerCase().trim();
        const salinity = args.salinity_level || context.salinityRiskLevel || 'normal';
        const waterAvail = args.water_availability_percent || 100;

        // Match crop in database
        let matchedCropId = 'wheat';
        let matchedCrop = CROP_DATABASE['wheat'];

        for (const [id, c] of Object.entries(CROP_DATABASE)) {
          if (
            id.toLowerCase().includes(cropQuery) ||
            c.nameAr.includes(cropQuery) ||
            c.nameEn.toLowerCase().includes(cropQuery)
          ) {
            matchedCropId = id;
            matchedCrop = c;
            break;
          }
        }

        // Special handling for common crops not directly in primary keys
        const isRice = cropQuery.includes('رز') || cropQuery.includes('أرز') || cropQuery.includes('rice');
        const isPotato = cropQuery.includes('بطاطس') || cropQuery.includes('potato');

        // Salinity penalty calculation: Maas-Hoffman equation Y/Ym = 1 - b*(ECe - ECt)
        let ecField = salinity === 'severe' ? 7.5 : salinity === 'moderate' ? 4.5 : 1.8;
        let ecThreshold = isRice ? 3.0 : isPotato ? 1.7 : matchedCrop.salinityToleranceDsM || 3.0;
        let salinitySlope = isRice ? 0.12 : isPotato ? 0.12 : 0.08;

        let salinityPenaltyPct = 0;
        if (ecField > ecThreshold) {
          salinityPenaltyPct = Math.min(85, Math.round((ecField - ecThreshold) * salinitySlope * 100));
        }

        // Water deficit penalty: Stewart FAO-56 1 - Ky*(1 - ETa/ETm)
        const waterDeficitFraction = Math.max(0, (100 - waterAvail) / 100);
        const ky = isRice ? 1.4 : isPotato ? 1.1 : matchedCrop.ky || 1.0;
        const waterPenaltyPct = Math.min(80, Math.round(waterDeficitFraction * ky * 100));

        // Combined yield ratio
        const totalPenaltyPct = Math.min(92, salinityPenaltyPct + waterPenaltyPct);
        const expectedYieldRatio = Math.max(0.08, (100 - totalPenaltyPct) / 100);

        const waterDemandM3Feddan = isRice
          ? 3400
          : isPotato
          ? 2200
          : Math.round((matchedCrop.waterRequirementMm || 450) * 4.2);

        const isSalinityCompatible = salinityPenaltyPct < 25;
        const financialRisk =
          totalPenaltyPct > 45 ? 'عالي جداً (خسارة مؤكدة)' : totalPenaltyPct > 20 ? 'متوسط' : 'آمن ومربح';

        let adviceAr = '';
        if (isRice && salinity !== 'normal') {
          adviceAr = `تحذير زراعي حاسم: الأرز محصول حساس للملوحة وتكلفة ريه بالغمر مرتفعة جداً (${waterDemandM3Feddan} م³/فدان). في هذه الأرض سيعاني من انخفاض محصولي بنحو ${totalPenaltyPct}% وخسارة فادحة. البديل الصيفي المربح والمقاوم هو الذرة الرفيعة (السورجم) أو عباد الشمس.`;
        } else if (isPotato && salinity === 'severe') {
          adviceAr = `تحذير: البطاطس محصول درني حساس جداً للأملاح وتربة الصرف. ملوحة الأرض ستؤدي لاحتراق حواف الأوراق وصغر حجم الدرنات وعفن الجذور بنسبة خسارة تتجاوز ${totalPenaltyPct}%.`;
        } else {
          adviceAr = `محصول ${matchedCrop.nameAr}: إنتاجيته المتوقعة في هذه الأرض بنسبة ${Math.round(expectedYieldRatio * 100)}% باحتياج مائي ${waterDemandM3Feddan} م³/فدان، ومستوى الأمان المالي: ${financialRisk}.`;
        }

        const outputData = {
          cropName: matchedCrop.nameEn,
          cropNameAr: matchedCrop.nameAr,
          expectedYieldRatio: Number(expectedYieldRatio.toFixed(2)),
          totalYieldPenaltyPercent: totalPenaltyPct,
          salinityPenaltyPercent: salinityPenaltyPct,
          waterDeficitPenaltyPercent: waterPenaltyPct,
          waterDemandM3Feddan,
          salinityThresholdDsM: ecThreshold,
          isSalinityCompatible,
          financialRisk,
          agronomicAdviceAr: adviceAr,
          certifiedEgyptianCultivars: matchedCrop.egyptianProfile?.certifiedCultivars.map(c => c.nameAr) || [],
          expectedYieldTraditional: matchedCrop.egyptianProfile ? `${matchedCrop.egyptianProfile.expectedYieldPerFeddan.average} ${matchedCrop.egyptianProfile.traditionalUnitAr}/فدان` : undefined,
          sowingWindowDelta: matchedCrop.egyptianProfile?.sowingWindows.deltaAr,
          seedRatePerFeddan: matchedCrop.egyptianProfile?.seedRatePerFeddan.amount,
        };

        return {
          name: toolName,
          labelAr: '🧬 محاكي المحاصيل والملوحة (FAO-56)',
          labelEn: '🧬 Crop Growth & Salinity Simulator (FAO-56)',
          status: 'success',
          input: args,
          output: outputData,
          summaryAr: `تمت محاكاة محصول ${matchedCrop.nameAr}: العائد المتوقع ${Math.round(expectedYieldRatio * 100)}% باحتياج مائي ${waterDemandM3Feddan} م³/فدان.`,
          summaryEn: `Simulated ${matchedCrop.nameEn}: predicted yield ${(expectedYieldRatio * 100).toFixed(0)}%, water need ${waterDemandM3Feddan} m³/fed.`,
        };
      }

      // ----------------------------------------------------------------------
      // Tool 2: Run TOPSIS Rotation Optimizer
      // ----------------------------------------------------------------------
      case 'run_topsis_rotation_optimizer': {
        const goal = args.primary_goal || 'balanced';
        const waterCut = args.water_cut_percent || 0;
        const heatwave = args.heatwave_c || 0;
        const area = context.areaFeddan || 15;

        const priorities = { ...DEFAULT_PRIORITIES };
        if (goal === 'water_saving') {
          priorities.waterWeight = 0.65;
          priorities.profitWeight = 0.20;
          priorities.soilHealthWeight = 0.15;
        } else if (goal === 'profit') {
          priorities.waterWeight = 0.20;
          priorities.profitWeight = 0.65;
          priorities.soilHealthWeight = 0.15;
        } else if (goal === 'soil_health') {
          priorities.waterWeight = 0.25;
          priorities.profitWeight = 0.25;
          priorities.soilHealthWeight = 0.50;
        }

        const fieldMemory = {
          carryoverWaterFraction: 0.55,
          stressFrequency36m: 0.12,
          accumulatedHeatLoad: 120,
          soilErrorIndex: 1.0,
          previousCropId: 'clover',
          hardpanDetected: context.hardpanDetected || false,
          salinityRiskLevel: context.salinityRiskLevel || 'normal',
        };

        const strategies = simulateRotationStrategies(
          fieldMemory as any,
          priorities,
          30.85,
          31.05,
          waterCut,
          heatwave
        );

        const chosenStrategy =
          goal === 'water_saving'
            ? strategies.find((s) => s.id === 'water_saving') || strategies[0]
            : strategies.find((s) => s.id === 'balanced') || strategies[0];

        const sequenceAr = chosenStrategy.years
          .map((y) => `${y.seasons?.[0]?.crop.nameAr || ''} ➔ ${y.seasons?.[1]?.crop.nameAr || ''}`)
          .join(' ➔ ');

        const outputData = {
          strategyTitleAr: chosenStrategy.titleAr,
          totalWaterSavedPercent: chosenStrategy.totalWaterSavedPercent,
          totalWaterSavedM3Feddan: chosenStrategy.totalWaterSavedM3Feddan,
          ureaBagsSavedPerFeddan: chosenStrategy.totalUreaBagsSavedPerFeddan,
          fertilizerSavingsEgp: chosenStrategy.totalFertilizerSavingsEgp,
          sixSeasonSequenceAr: sequenceAr,
          topsisScore: Number(chosenStrategy.topsisCloseness.toFixed(2)),
          biodrillingHardpanRemediated: chosenStrategy.biodrillingRemediated,
        };

        return {
          name: toolName,
          labelAr: '⚖️ محرك الدورة الزراعية (TOPSIS & AquaCrop)',
          labelEn: '⚖️ Crop Rotation Optimizer (TOPSIS & AquaCrop)',
          status: 'success',
          input: args,
          output: outputData,
          summaryAr: `تم حساب الدورة المتوازنة لـ 6 عروات: توفر ${chosenStrategy.totalWaterSavedPercent}% مياه و${chosenStrategy.totalUreaBagsSavedPerFeddan} شكارة يوريا للفدان.`,
          summaryEn: `Computed 6-season rotation: saves ${chosenStrategy.totalWaterSavedPercent}% water and ${chosenStrategy.totalUreaBagsSavedPerFeddan} urea bags/fed.`,
        };
      }

      // ----------------------------------------------------------------------
      // Tool 3: Fetch NASA Drought Telemetry
      // ----------------------------------------------------------------------
      case 'fetch_nasa_drought_telemetry': {
        const lat = context.lat || 30.85;
        const lon = context.lon || 31.05;
        const telemetry = generateFieldTelemetry(
          lat,
          lon,
          'active_field',
          context.fieldName || 'حقل دلتا النيل',
          'Nile Delta Field',
          false
        );

        const isThirsty = telemetry.canopyTempAnomalyC > 1.5 || telemetry.isFlashDroughtAlert;
        const outputData = {
          canopyTempAnomalyC: Number(telemetry.canopyTempAnomalyC.toFixed(1)),
          stomataCondition: isThirsty ? 'انغلاق جزئي للمسام بسبب عجز النتح (الحمى النباتية)' : 'مسام مفتوحة وتبريد نتحي طبيعي',
          flashDroughtWarning: telemetry.isFlashDroughtAlert ? 'تحذير جفاف مباغت نشط (قبل اصفرار الورق بـ 14 يوماً)' : 'طبيعي ولا خطر جفاف مباغت',
          earlyWarningLeadDays: 14,
          rootZoneMoistureMm: Number(telemetry.rootZoneMoistureMm.toFixed(1)),
          prescribedIrrigationMmToday: Number(telemetry.prescribedIrrigationMm.toFixed(1)),
          prescribedM3PerFeddanToday: Math.round(telemetry.prescribedIrrigationMm * 4.2),
          evaporativeStressIndex: Number(telemetry.currentESI.toFixed(2)),
          currentNDVI: Number(telemetry.currentNDVI.toFixed(2)),
        };

        return {
          name: toolName,
          labelAr: '🛰️ رادار ناسا للجفاف المبكر (ECOSTRESS & SMAP)',
          labelEn: '🛰️ NASA Flash Drought Radar (ECOSTRESS & SMAP)',
          status: 'success',
          input: args,
          output: outputData,
          summaryAr: `رصد أقمار ناسا: حرارة المسام ${telemetry.canopyTempAnomalyC > 0 ? `+${telemetry.canopyTempAnomalyC.toFixed(1)}°C` : `${telemetry.canopyTempAnomalyC.toFixed(1)}°C`}، وجرعة الري المطلوبة اليوم ${Math.round(telemetry.prescribedIrrigationMm * 4.2)} م³/فدان.`,
          summaryEn: `NASA Observation: Pore temp anomaly ${telemetry.canopyTempAnomalyC.toFixed(1)}°C, irrigation dose ${Math.round(telemetry.prescribedIrrigationMm * 4.2)} m³/fed.`,
        };
      }

      // ----------------------------------------------------------------------
      // Tool 4: Query Ithmar Knowledge Base
      // ----------------------------------------------------------------------
      case 'query_ithmar_knowledge_base': {
        const cropQuery = (args.crop_name || '').toLowerCase().trim();
        const topic = args.topic || 'all';

        let entry: IthmarEntry | null = null;
        for (const [key, data] of Object.entries(ITHMAR_DATABASE)) {
          if (
            key.includes(cropQuery) ||
            data.namesAr.some((n) => cropQuery.includes(n)) ||
            data.namesEn.some((n) => cropQuery.includes(n))
          ) {
            entry = data;
            break;
          }
        }

        if (!entry) {
          entry = ITHMAR_DATABASE['wheat'];
        }

        const outputData: any = {
          cropName: entry.namesAr[0],
          topicRequested: topic,
        };

        if (topic === 'planting_window' || topic === 'all') {
          outputData.plantingWindowAr = entry.plantingWindowAr;
        }
        if (topic === 'fertilization_schedule' || topic === 'all') {
          outputData.fertilizationScheduleAr = entry.fertilizationScheduleAr;
        }
        if (topic === 'pests_and_diseases' || topic === 'all') {
          outputData.pestsAndDiseasesAr = entry.pestsAndDiseasesAr;
        }
        if (topic === 'economic_roi' || topic === 'all') {
          outputData.economicsEgp = entry.economicsEgp;
        }

        return {
          name: toolName,
          labelAr: '🌱 قاعدة بيانات إثمار الزراعية (وزارة الزراعة)',
          labelEn: '🌱 Ithmar Egyptian Agronomic Guidelines',
          status: 'success',
          input: args,
          output: outputData,
          summaryAr: `تم استرجاع الإرشادات الرسمية لـ ${entry.namesAr[0]}: ${topic === 'fertilization_schedule' ? 'برنامج التسميد الدقيق للفدان' : topic === 'planting_window' ? 'مواعيد الزراعة المثالية' : 'دراسة الجدوى والتكاليف بالجنيه'}.`,
          summaryEn: `Retrieved official Ithmar guidance for ${entry.namesEn[0]} (${topic}).`,
        };
      }

      // ----------------------------------------------------------------------
      // Tool 5: Update Field Parameters
      // ----------------------------------------------------------------------
      case 'update_field_parameters': {
        const outputData = {
          status: 'updated',
          updatedFields: {
            areaFeddan: args.area_feddan || context.areaFeddan,
            irrigationType: args.irrigation_type || context.irrigationType,
            previousCrop: args.previous_crop || context.previousCrop,
            soilType: args.soil_type || context.soilType,
          },
          confirmationMessageAr: `تم تحديث بيانات الحقل بنجاح: المساحة (${args.area_feddan || context.areaFeddan} فدان) ونظام الري (${args.irrigation_type || context.irrigationType}).`,
          confirmationMessageEn: `Field parameters successfully updated.`,
        };

        return {
          name: toolName,
          labelAr: '⚙️ تحديث إعدادات وبيانات الحقل',
          labelEn: '⚙️ Field Setup Parameter Sync',
          status: 'success',
          input: args,
          output: outputData,
          summaryAr: outputData.confirmationMessageAr,
          summaryEn: outputData.confirmationMessageEn,
        };
      }

      default:
        throw new Error(`Unknown tool name: ${toolName}`);
    }
  } catch (err: any) {
    return {
      name: toolName,
      labelAr: 'الأداة الذكية',
      labelEn: 'Smart Tool',
      status: 'error',
      input: args,
      output: { error: err.message },
      summaryAr: `تعذر إكمال تشغيل الأداة: ${err.message}`,
      summaryEn: `Tool execution failed: ${err.message}`,
    };
  }
}
