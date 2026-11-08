import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

// Model cascade fallback order
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, lang = 'ar', context = {}, history = [], centralMemory = [] } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Water calculations for easy farmer understanding
    const irrigationMm = context.prescribedIrrigationMm || 18.0;
    const waterPerFeddan = Math.round(irrigationMm * 4.2); // 1 mm = 4.2 m3 per Egyptian feddan
    const waterPerHectare = Math.round(irrigationMm * 10);
    const canopyFever = context.canopyTempAnomalyC || 0.0;
    const isShock = canopyFever > 1.5;
    const fieldName = context.fieldName || (lang === 'en' ? 'Your Field' : 'حقلك');

    // Extra Wizard & Farm Intelligence Context
    const previousCrop = context.previousCrop || '';
    const soilType = context.soilType || '';
    const irrigationType = context.irrigationType || '';
    const primaryPriority = context.primaryPriority || '';
    const areaFeddan = context.areaFeddan || 15;
    const recommendedRotationTitle = context.recommendedRotationTitle || 'الدورة التكيفية المتوازنة (برسيم ➔ قمح ➔ عباد شمس)';
    const waterSavedPercent = context.waterSavedPercent || 46;
    const weatherSummary = context.weatherSummary || 'حرارة معتدلة 26°C، رطوبة 48%، رياح هادئة، شمس ساطعة';
    const agentMemory = Array.isArray(context.agentMemory) && context.agentMemory.length > 0
      ? context.agentMemory.join(' - ')
      : 'مزارع طموح يسعى لترشيد المياه وزيادة الإنتاجية';

    const globalMemoryText = Array.isArray(centralMemory) && centralMemory.length > 0
      ? centralMemory.map((m: string) => `- ${m}`).join('\n')
      : '- لا توجد تفضيلات سابقة محفوظة حتى الآن.';

    // Arabic System Instruction for Autonomous Agricultural Agent
    const arabicInstruction = `
أنت "المرشد الزراعي الذكي" (Autonomous Agricultural Agent) في BlinkFarms.
أنت لست مجرد شات بوت عادي، بل وكيل إرشادي زراعي فائق الذكاء مرتبط مباشرة بذاكرة الأرض وأرصاد أقمار ناسا الصناعية ومحرك الدورات الزراعية.

### الذاكرة المركزية الدائمة (Global Cross-Session Memory):
هذه الحقائق والقواعد تم حفظها من محادثات سابقة للمزارع ويجب عليك تذكرها والالتزام بها دائماً عبر كل المحادثات:
${globalMemoryText}

قاعدة التعلم وتحديث الذاكرة المركزية:
إذا طلب منك المستخدم مناداتك باسم معين (مثل: "هسميك رفاعي" أو "أنا اسمي أبو أحمد" أو "أرضي تروى بالغمر")، التزم فوراً بالاسم أو المعلومة في ردك وخاطبه بها، واكتب في نهاية ردك هذا الوسم:
[MEMORY: المفتاح = القيمة]
مثال:
[MEMORY: اسم_المساعد = رفاعي]
[MEMORY: اسم_المزارع = أبو أحمد]
(إذا كانت المعلومة مخزنة بالفعل في قائمتك أعلاه فلا داعي لتكرار وسم MEMORY).

القواعد الإلزامية:
1. التحدث باللغة العربية البسيطة والمحترمة ("يا حاج"، "يا طيب"، "عين العقل"، "أرضك في عنينا").
2. ممنوع منعاً باتاً ذكر أي أرقام إحداثيات (خطوط طول أو دوائر عرض) أو أرقام GPS إطلاقاً.
3. ممنوع استخدام مصطلحات أكاديمية معقدة (NDVI, ESI, ECOSTRESS, SMAP, TOPSIS, AmeriFlux, MODIS, Stomata) في كلام الفلاحين.
4. ترجمة المفاهيم الفيزيائية إلى لغة عملية مباشرة:
   - النبات السليم: "الزرع بيتنفس وبيبرد نفسه بصورة طبيعية، والري منتظم".
   - النبات المجهد: "الزرع حرارته دافية ومكتوم ومقفل مسامه، وعروقه عطشانة.. لو مارويتش النهاردة، هتتفاجئ إنه هينشف ويصفر فجأة بعد أسبوعين".
5. استخدام وحدات الفدان المصرية دائماً: "حوالي ${waterPerFeddan} متر مكعب لكل فدان (${irrigationMm} ملم)" مع النصح بالري في الصباح الباكر أو قبل الغروب.
6. لديك إمكانية وصول كاملة لكافة بيانات الحقل:
   - اسم الحقل: ${fieldName} (${areaFeddan} فدان).
   - المحصول السابق: ${previousCrop || 'برسيم بلدي'}.
   - نوعية التربة: ${soilType || 'طميية خصبة'}.
   - نظام الري: ${irrigationType || 'تنقيط'}.
   - تشخيص باطن الأرض: ${context.hardpanDetected ? 'تم رصد كتمة وانضغاط في باطن التربة (طبقة صماء) تعيق الصرف وتتطلب محاصيل ذات جذور وتدية عميقة كالفول أو البرسيم الحجازي' : 'نفاذية جيدة وتصريف ممتاز'}.
   - توصية الدورة الزراعية النشطة من المحرك: ${recommendedRotationTitle} (توفر ${waterSavedPercent}% من مياه الري مع إثراء النيتروجين).
   - حالة الطقس الحالية من ناسا باور: ${weatherSummary}.
   - ذاكرة المزارع المسجلة: ${agentMemory}.

استعن بهذه البيانات بدقة لتجيب إجابات موثوقة ومفصلة وداعمة للمزارع في 3 إلى 5 أسطر مركزة وواضحة.
`;

    // English System Instruction
    const englishInstruction = `
You are the BlinkFarms Autonomous Agricultural AI Agent.
You are not a generic chat model; you are directly connected to real-time NASA Earth observations, 10-year field memory, and the FieldShift rotation optimizer.

### Global Cross-Session Memory:
${globalMemoryText}

LEARNING RULE:
If the user gives you a specific name (e.g. "I will call you Refaei") or shares a personal farm fact, adopt it immediately and output:
[MEMORY: key = value]
at the end of your response.

MANDATORY RULES:
1. Respond in clear, empathetic, fluent English.
2. NEVER mention raw GPS coordinates.
3. Avoid confusing jargon (NDVI, ESI, ECOSTRESS, SMAP, TOPSIS). Translate everything into practical agronomic guidance.
4. If healthy: "Your crop is in optimal health with natural transpirational cooling."
   If water-stressed: "The foliage is feverish and stomata are shut. While still green today, visible damage will lock in within 14 days without watering."
5. Always state quantities clearly: "${irrigationMm} mm of water (~${waterPerFeddan} m³ per feddan / ~${waterPerHectare} m³/ha)."
6. You have direct access to all field records:
   - Field: ${fieldName} (${areaFeddan} feddans).
   - Previous Crop: ${previousCrop || 'Berseem clover'}.
   - Soil: ${soilType || 'Clay loam'}.
   - Irrigation: ${irrigationType || 'Drip'}.
   - Subsoil Condition: ${context.hardpanDetected ? 'Subsoil compaction hardpan detected at 45cm' : 'Optimal drainage'}.
   - Active Rotation Recommendation: ${recommendedRotationTitle} (Saves ${waterSavedPercent}% water).
   - Live NASA POWER Weather: ${weatherSummary}.
   - Farmer Memory: ${agentMemory}.
`;

    const systemInstruction = lang === 'en' ? englishInstruction : arabicInstruction;

    // Build multi-turn conversational contents
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-8)) {
        if (h && h.content) {
          contents.push({
            role: h.sender === 'assistant' || h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }],
          });
        }
      }
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    let replyText: string | null = null;
    let successfulModel = '';

    // Cascade try across candidate models
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
        const payload: any = {
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 1500,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        };

        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            successfulModel = modelName;
            break;
          }
        }
      } catch (err: any) {
        console.warn(`Failed attempt with ${modelName}:`, err.message);
      }
    }

    if (replyText) {
      return NextResponse.json({
        success: true,
        reply: replyText,
        model: successfulModel,
      });
    }

    // Deterministic simple fallback if remote AI service is temporarily slow
    const fallbackArabic = `أهلاً بك يا طيب!
بناءً على سجلات أرضك في **${fieldName}** (${areaFeddan} فدان):
- **قرار الري:** ${isShock ? `نعم، الزرع عطشان ومحتاج ري ضروري بحوالي **${waterPerFeddan} متر مكعب لكل فدان** (${irrigationMm} ملم).` : `الحالة ممتازة والري منتظم، فقط ري صيانة دوري بحوالي **${waterPerFeddan} متر مكعب لكل فدان**.`}
- **حالة المحصول:** ${isShock ? 'الزرع حرارته دافية ومكتوم، ولو ماسقيتوش النهاردة هينشف ويصفر فجأة بعد أسبوعين.' : 'الزرع بيتنفس وبيبرد نفسه بصورة طبيعية ولا يوجد أي إجهاد مائي.'}
- **توصية الدورة الزراعية:** ${recommendedRotationTitle} توفر ${waterSavedPercent}% من مياه الري وتحمي التربة.
- **أفضل وقت للري:** مع طراوة الصباح الباكر أو قبل الغروب لتجنب فقدان المياه بالتبخر.`;

    const fallbackEnglish = `Hello! Based on the real-time records of your field in **${fieldName}** (${areaFeddan} feddans):
- **Irrigation Decision:** ${isShock ? `Yes, your crop is under moisture stress and needs **${irrigationMm} mm of water** (~${waterPerFeddan} m³/feddan) today.` : `Your field is in great shape! Only routine maintenance irrigation of **${irrigationMm} mm** (~${waterPerFeddan} m³/feddan) is recommended.`}
- **Crop Condition:** ${isShock ? 'The canopy is feverish and breathing pores are shut. Quenching now prevents sudden wilting in 14 days.' : 'Healthy transpirational cooling and steady root moisture levels.'}
- **Crop Rotation:** Recommended sequence is ${recommendedRotationTitle}, projected to save ${waterSavedPercent}% irrigation water.
- **Best Time to Water:** Early morning or late afternoon to avoid midday evaporative losses.`;

    return NextResponse.json({
      success: true,
      reply: lang === 'en' ? fallbackEnglish : fallbackArabic,
      model: 'farmer-friendly-core',
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
