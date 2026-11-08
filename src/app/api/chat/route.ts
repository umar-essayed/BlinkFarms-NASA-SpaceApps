import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

// Model cascade fallback order
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
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
    const recommendedRotationTitle = context.recommendedRotationTitle || 'الدورة التكيفية المتوازنة (عروات 6 شتوي وصيفي)';
    const sixSeasonPlanAr = context.sixSeasonPlanAr || 'البرسيم ➔ الذرة ➔ بنجر السكر ➔ الصويا ➔ القمح ➔ عباد الشمس';
    const ureaBagsSaved = context.ureaBagsSavedPerFeddan ?? 2;
    const fertSavingsEgp = context.fertilizerSavingsEgpPerFeddan ?? 900;
    const waterSavedPercent = context.waterSavedPercent || 30;
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
${globalMemoryText}

قاعدة التعلم وتحديث الذاكرة المركزية:
إذا طلب منك المستخدم مناداتك باسم معين (مثل: "هسميك رفاعي" أو "أنا اسمي أبو أحمد" أو "أرضي تروى بالغمر")، التزم فوراً بالاسم أو المعلومة في ردك وخاطبه بها، واكتب في نهاية ردك هذا الوسم:
[MEMORY: المفتاح = القيمة]

القواعد الإلزامية الصارمة:
1. التحدث باللغة العربية البسيطة والمحترمة ("يا حاج"، "يا طيب"، "عين العقل"، "أرضك في عنينا").
2. ممنوع منعاً باتاً ذكر أي أرقام إحداثيات (خطوط طول أو دوائر عرض) أو أرقام GPS إطلاقاً.
3. ممنوع استخدام مصطلحات أكاديمية معقدة (NDVI, ESI, ECOSTRESS, SMAP, TOPSIS, AmeriFlux, MODIS, Stomata) في كلام الفلاحين. إذا سألك المزارع عنها، ترجمها فوراً بالبلدي وبدون تعقيد.
4. قاعدة عدم الهلوسة والالتزام الصارم بالبيانات (ZERO-HALLUCINATION RULE):
   - يجب الالتزام الكامل بمحاصيل الخطة النشطة المقترحة: ${sixSeasonPlanAr}.
   - يمنع تماماً اختراع محاصيل غير مطابقة لملوحة الأرض (مثل اقتراح الفول البلدي في أرض شديدة الملوحة).
   - عدد شكائر اليوريا الموفرة في الفدان هو بدقة: ${ureaBagsSaved} شيكارة/فدان (وفر مالي ${fertSavingsEgp} جنيه/فدان)، لا تخترع أرقاماً غيرها.
5. الرد الحاسم والناصح عند اقتراح المزارع محاصيل كارثية (كالرز أو البطاطس في أراضي الملوحة والجفاف):
   - وضح له فوراً أن الرز يحتاج غمر ومياه غزيرة ويموت من الملوحة، والبطاطس حساسة للملوحة وتكبد خسائر فادحة، وانصحه بالبدائل المقاومة في خطته.
6. استخدام وحدات الفدان المصرية دائماً: "حوالي ${waterPerFeddan} متر مكعب لكل فدان (${irrigationMm} ملم)".
7. بيانات الحقل المسجلة:
   - اسم الحقل: ${fieldName} (${areaFeddan} فدان).
   - المحصول السابق: ${previousCrop || 'برسيم بلدي'}.
   - نوعية التربة والملوحة: ${soilType || 'طميية خصبة'} (${context.salinityRiskLevel === 'severe' ? 'ملوحة مرتفعة' : 'ملوحة عادية'}).
   - نظام الري: ${irrigationType || 'تنقيط / بيفوت'}.
   - باطن الأرض: ${context.hardpanDetected ? 'رصد طبقة صماء مضغوطة على عمق 45 سم تعيق الصرف وتتطلب جذور وتدية عميقة كالعصفر والبرسيم الحجازي والسورجم' : 'تصريف ونفاذية جيدة'}.
   - الخطة المعتمدة للـ 6 عروات: ${sixSeasonPlanAr} (توفر ${waterSavedPercent}% من مياه الري).
   - حالة الطقس الحالية: ${weatherSummary}.

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
      // Clean any [MEMORY: ...] tags before sending to user interface
      const cleanedReply = replyText.replace(/\[MEMORY:[^\]]+\]/g, '').trim();
      return NextResponse.json({
        success: true,
        reply: cleanedReply,
        model: successfulModel,
      });
    }

    // Question-Intent Aware Fallback Responder (Zero-Hallucination & Accurate Field Advice)
    const lowerMsg = (message || '').toLowerCase();
    const isAskingSensitiveCrop = /رز|أرز|بطاطس|طماطم|فراولة|rice|potato|tomato/.test(lowerMsg);
    const isAskingHeatwaveOrDrought = /حر|حرارة|الميه قلت|جفاف|عطش|صيف|موجة|heat|drought|cut/.test(lowerMsg);
    const isAskingAcronyms = /esi|ndvi|topsis|مصطلحات|معنى|فهمني/.test(lowerMsg);
    const isAskingWhyOrUrea = /ليه|اشمعنى|يوريا|كيماوي|سماد|شكارة|شكاير|وفر|توفير|why|urea/.test(lowerMsg);

    let fallbackReply = '';

    if (isAskingSensitiveCrop) {
      fallbackReply = `يا حاج، عين العقل إنك بتستشير الأول قبل ما تصرف مليم في الأرض!
بصراحة وأمانة علمية: زراعة الأرز أو البطاطس في أرضك دي (${soilType || 'أرض مستصلحة'} بملوحة ${context.salinityRiskLevel === 'severe' ? 'مرتفعة' : 'حالية'} ونظام ري بالبيفوت) تعتبر مجازفة وخسارة محققة لا قدر الله:
- **الأرز:** محصول مائي شره جداً لا يصلح في الأراضي الصحراوية المفتوحة ونظم الري الحديثة، وممنوع زراعته في المناطق الجافة ويحتاج مياه عذبة تماماً.
- **البطاطس:** حساسة جداً للملوحة ومياه الري، وأي ملوحة تعيق نمو الدرنات وتؤدي لتعفنها وفشل المحصول.

**النصيحة الذهبية المعتمدة لأرضك:** التزم بمحاصيل دورتك التكيفية المقترحة (${sixSeasonPlanAr})؛ لأنها محاصيل مدروسة ومتحملة للملوحة والجفاف ومضمونة العائد بإذن الله.`;
    } else if (isAskingHeatwaveOrDrought) {
      fallbackReply = `يا حاج، متقلقش خالص، أرضك ودورتك معمول حسابها بالمللي لمواجهة الحرارة وشح المياه!
الدورة التكيفية المعتمدة لحقلك (${sixSeasonPlanAr}) بتعتمد بشكل أساسي على محاصيل مسار C4 المتفوقة في كفاءة استهلاك المياه مع جذور وتدية متعمقة:
1. **الصمود أمام موجات الحر:** هذه المحاصيل بتتحمل درجات حرارة فوق 40°م في ذروة الصيف دون أن يحدث عقم زهري أو انهيار للمحصول.
2. **توفير المياه:** الدورة بتوفر حوالي **${waterSavedPercent}% من مياه الري**، وده معناه إن لو حصة المياه قلت في أي وقت، مخزون التربة والاحتياج القليل للمحصول هيحميك تماماً من الخسارة.
3. **نصيحة ري عملية:** خلال موجات الحر الشديدة، يفضل تشغيل البيفوت بعد غروب الشمس أو في الصباح الباكر بمعدل **${waterPerFeddan} متر مكعب لكل فدان** (${irrigationMm} ملم) لتقليل الفاقد بالتبخر.`;
    } else if (isAskingAcronyms) {
      fallbackReply = `يا حاج، عين العقل إنك بتسأل وعايز تفهم كل تفصيلة في خدمتك!
سيبك من الأسماء الأكاديمية الصعبة، دي اختصارات لأدوات بنشوف بيها أرضك من أقمار ناسا الصناعية عشان نخدمك بالبلدي:
1. **الـ NDVI (مؤشر الخضار):** دي كاميرا من الفضاء بتشوف خضار ورق الزرع وتعرف هل النبات بيكبر ومجموعه الخضري سليم ومصحصح ولا فيه اصفرار.
2. **الـ ESI (مؤشر عرق وعطش النبات):** دي حساسات حرارية بتقيس هل الزرع بيتنفس ويعرق طبيعي ويبرد نفسه، ولا قفل مسامه ومكتوم وعطشان قبل ما عيونك تلاحظ العطش بأسبوعين كاملين!
3. **الـ TOPSIS (الميزان الذكي):** دي خوارزمية بتوزن كل الاختيارات (أعلى ربح مالي + أقل استهلاك ميه + أحسن صحة وتغذية للتربة) وتختارلك أنسب دورة تكسبك وتطمنك.`;
    } else if (isAskingWhyOrUrea) {
      fallbackReply = `أهلاً بك يا طيب في أرضك المباركة!
اخترنا لحضرتك الدورة التكيفية دي بالذات (${sixSeasonPlanAr}) لعدة أسباب علمية ومادية مباشرة:
1. **توفير الكيماوي (اليوريا):** الدورة بتوفر لحضرتك بدقة حوالي **${ureaBagsSaved} شيكارة يوريا لكل فدان** (وفر نقدي يقارب **${fertSavingsEgp} جنيه مصري لكل فدان**) بفضل تثبيت النيتروجين الحيوي الطبيعي في التربة.
2. **كسر كتمة باطن الأرض:** الجذور الوتدية العميقة للمحاصيل بتخترق الطبقة الصماء وتفكك انضغاط التربة وتفتح مسارات الصرف للجذور.
3. **وفر المياه:** توفير **${waterSavedPercent}% من مياه الري** مع تعظيم العائد الإنتاجي الصافي لحقلك.`;
    } else {
      fallbackReply = `أهلاً بك يا طيب!
بناءً على سجلات أرضك في **${fieldName}** (${areaFeddan} فدان):
- **قرار الري:** ${isShock ? `نعم، الزرع عطشان ومحتاج ري ضروري بحوالي **${waterPerFeddan} متر مكعب لكل فدان** (${irrigationMm} ملم).` : `الحالة ممتازة والري منتظم، فقط ري صيانة دوري بحوالي **${waterPerFeddan} متر مكعب لكل فدان**.`}
- **حالة المحصول:** ${isShock ? 'الزرع حرارته دافية ومكتوم، ولو ماسقيتوش النهاردة هينشف ويصفر فجأة بعد أسبوعين.' : 'الزرع بيتنفس وبيبرد نفسه بصورة طبيعية ولا يوجد أي إجهاد مائي.'}
- **توصية الدورة الزراعية:** ${sixSeasonPlanAr} توفر ${waterSavedPercent}% من مياه الري، وتوفر ${ureaBagsSaved} شيكارة يوريا/فدان.
- **أفضل وقت للري:** مع طراوة الصباح الباكر أو قبل الغروب لتجنب فقدان المياه بالتبخر.`;
    }

    return NextResponse.json({
      success: true,
      reply: fallbackReply,
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
