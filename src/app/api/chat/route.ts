import { NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Groq Model Cascade (Primary: Flagship GPT-OSS 120B -> Fallback: GPT-OSS 20B)
const CANDIDATE_GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
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
1. التحدث باللغة العربية البسيطة والمحترمة الودودة ("يا حاج"، "يا طيب"، "عين العقل"، "أرضك في عنينا").
2. ممنوع منعاً باتاً ذكر أي أرقام إحداثيات (خطوط طول أو دوائر عرض) أو أرقام GPS إطلاقاً.
3. ممنوع استخدام مصطلحات أكاديمية معقدة (NDVI, ESI, ECOSTRESS, SMAP, TOPSIS, AmeriFlux, MODIS, Stomata) في كلام الفلاحين. إذا سألك المزارع عنها، ترجمها فوراً بالبلدي وبدون تعقيد:
   - NDVI: مؤشر اخضرار الورق وصحة النبات.
   - ESI: مؤشر عرق النبات وعطشه المبكر.
   - TOPSIS: الميزان الذكي لاختيار أحسن دورة زراعية.
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

    // Build multi-turn messages for OpenAI-compatible Groq endpoint
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemInstruction },
    ];

    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-8)) {
        if (h && h.content) {
          messages.push({
            role: h.sender === 'assistant' || h.role === 'assistant' ? 'assistant' : 'user',
            content: h.content,
          });
        }
      }
    }

    // Add current user prompt
    messages.push({
      role: 'user',
      content: message,
    });

    let replyText: string | null = null;
    let successfulModel = '';

    // Cascade try across Groq candidate models
    for (const modelName of CANDIDATE_GROQ_MODELS) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName,
            messages,
            temperature: 0.6,
            max_tokens: 1200,
          }),
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          replyText = data.choices?.[0]?.message?.content || null;
          if (replyText) {
            successfulModel = modelName;
            break;
          }
        } else {
          const errText = await groqRes.text();
          console.warn(`Groq ${modelName} returned status ${groqRes.status}:`, errText);
        }
      } catch (err: any) {
        console.warn(`Failed attempt with Groq ${modelName}:`, err.message);
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

    // If both Groq models fail, return honest connection error (No canned scripts or fake fallbacks)
    const connectionErrorMsg = lang === 'ar'
      ? 'عذراً يا طيب، حدث خطأ مؤقت في الاتصال بالخادم. يرجى التأكد من اتصال الإنترنت والمحاولة مرة أخرى.'
      : 'Sorry, a temporary connection error occurred. Please check your internet connection and try again.';

    return NextResponse.json(
      {
        success: false,
        error: 'Groq API connection error',
        reply: connectionErrorMsg,
      },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        reply: 'حدث خطأ في النظام الداخلي، يرجى إعادة المحاولة.',
      },
      { status: 500 }
    );
  }
}
