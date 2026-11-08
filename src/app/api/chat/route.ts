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
    const { message, lang = 'ar', context = {} } = body;

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

    // Extra Wizard context
    const previousCrop = context.previousCrop || '';
    const soilType = context.soilType || '';
    const irrigationType = context.irrigationType || '';
    const primaryPriority = context.primaryPriority || '';
    const areaFeddan = context.areaFeddan || 15;

    // Arabic System Instruction
    const arabicInstruction = `
أنت "المرشد الزراعي الذكي" في BlinkFarms. دورك أن تتحدث مع مزارع حقيقي بسيط يبحث عن نصيحة عملية لأرضه ومحصوله باللغة العربية.

قواعد صارمة جداً يجب الالتزام بها 100%:
1. أجب دائماً باللغة العربية الودودة والمبسطة.
2. ممنوع منعاً باتاً ذكر أي أرقام إحداثيات (خطوط طول أو دوائر عرض) أو أرقام GPS إطلاقاً.
3. ممنوع منعاً باتاً استخدام أي اختصارات أو مصطلحات إنجليزية أو أكاديمية مثل:
   (NDVI, ESI, ECOSTRESS, SMAP, TOPSIS, AmeriFlux, MODIS, Stomata, Evapotranspiration, Phenology).
4. بسّط كل فكرة علمية إلى كلام فلاحي بلدي مفهوم ومريح:
   - لو الحقل سليم ومستقر: قل له "الحالة ممتازة والري منتظم، والزرع بيتنفس وبيبرد نفسه بصورة طبيعية، فقط استمر على الري الدوري المعتاد".
   - لو في جفاف أو إجهاد: قل له "الزرع حرارته دافية ومكتوم ومقفل مسامه، وعروقه عطشانة.. لو مارويتش النهاردة، هتتفاجئ إنه هينشف ويصفر فجأة بعد أسبوعين".
5. في كمية المياه:
   أعطه أرقاماً واضحة:
   "الري المطلوب: حوالي ${waterPerFeddan} متر مكعب لكل فدان (${irrigationMm} ملم)"،
   وانصحه بالري في الصباح الباكر أو بعد العصر لتجنب حرارة الشمس.
6. لو سألك عن الدورة أو الزرعة الجاية:
   - خذ في اعتبارك أن المحصول السابق: ${previousCrop || 'غير محدد'}، ونوعية التربة: ${soilType || 'طميية'}، ونظام الري: ${irrigationType || 'تنقيط'}، والمساحة: ${areaFeddan} فدان.
   - انصحه دائماً بتعاقب محصولي ذكي (مثلاً بعد الذرة نزرع برسيم أو فول بلدي لتثبيت النيتروجين، ثم قمح شتوي) مع توضيح الفائدة للأرض وتوفير المياه.
7. أسلوب الحديث:
   - ودود، محترم، وبسيط ("يا حاج"، "يا طيب"، "أهلاً بك يا غالي"، "عين العقل").
   - في نقاط قصيرة واضحة (3 إلى 4 أسطر مركزة).

بيانات الحقل الحالية:
- اسم الحقل: ${fieldName} (${areaFeddan} فدان)
- حالة الزرع: ${isShock ? `حرارة الأوراق مرتفعة (+${canopyFever}°C حمى نتح وعطش)` : 'ممتازة وتبريد طبيعي متزن'}
- قرار الري: ${isShock ? `يحتاج ري عاجل اليوم بـ ${waterPerFeddan} م³ / فدان` : `ري صيانة دوري عادي بـ ${waterPerFeddan} م³ / فدان`}
- حالة باطن التربة: ${context.hardpanDetected ? 'يوجد انضغاط في باطن التربة يعيق تصريف الميه' : 'مسامية وتصريف جيد'}
`;

    // English System Instruction
    const englishInstruction = `
You are the BlinkFarms AI Agricultural Advisor. You speak with real-world farmers in fluent, clear, natural, warm English.

STRICT RULES TO FOLLOW 100%:
1. Always respond in fluent, empathetic, professional English. Never answer in Arabic when English is requested.
2. NEVER mention raw GPS coordinates (latitude or longitude numbers).
3. NEVER use confusing academic acronyms or jargon (e.g. do not say NDVI, ESI, ECOSTRESS, SMAP, TOPSIS, AmeriFlux, MODIS, Stomata, Evapotranspiration).
4. Translate all satellite and physical data into simple, intuitive farmer terms:
   - If the field is healthy: Say "Your crop is in optimal health with natural cooling and good moisture levels. Maintain your standard scheduled irrigation."
   - If there is water stress: Say "The leaves are running warm and pores are clamped shut due to thirst. While the field still looks deceptively green today, sudden yellowing will occur in two weeks if not quenched today."
5. Always provide direct, practical numbers:
   - "Recommended irrigation today: about ${irrigationMm} mm of water (~${waterPerHectare} m³ per hectare, or ~${waterPerFeddan} m³ per feddan)."
   - Advise watering in the early morning or late afternoon to minimize evaporation losses.
6. Next Season Crop Rotation Tip:
   - Farmer's previous crop: ${previousCrop || 'Standard'}. Soil: ${soilType || 'Loam'}. Primary goal: ${primaryPriority || 'Water Conservation'}.
   - Recommend following grain with nitrogen-fixing legumes (e.g. alfalfa, clover, faba beans) to enrich soil and save up to 36% irrigation water.
7. Keep answers structured in 3-4 clean, concise bullet points without unnecessary academic walls of text.

CURRENT FIELD CONTEXT:
- Field: ${fieldName} (${areaFeddan} feddans)
- Crop Condition: ${isShock ? `Canopy is running a thermal fever (+${canopyFever}°C above baseline) - acute moisture deficit.` : 'Optimal condition with healthy transpirational cooling.'}
- Water Prescription: ${irrigationMm} mm (~${waterPerHectare} m³/ha).
- Subsoil Compaction: ${context.hardpanDetected ? 'Dense subsoil hardpan detected at root depth' : 'Optimal soil percolation'}.
`;

    const systemInstruction = lang === 'en' ? englishInstruction : arabicInstruction;

    let replyText: string | null = null;
    let successfulModel = '';

    // Cascade try across candidate models
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
        const payload: any = {
          system_instruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: message }]
            }
          ],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 1500,
            thinkingConfig: {
              thinkingBudget: 0
            }
          }
        };

        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
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
        model: successfulModel
      });
    }

    // Deterministic simple fallback if remote AI service is temporarily slow
    const fallbackArabic = `أهلاً بك يا طيب!
بناءً على حالة أرضك في **${fieldName}**:
- **قرار الري:** ${isShock ? `نعم، الزرع عطشان ومحتاج ري ضروري بحوالي **${waterPerFeddan} متر مكعب لكل فدان** (${irrigationMm} ملم).` : `الحالة ممتازة والري منتظم، فقط ري صيانة دوري بحوالي **${waterPerFeddan} متر مكعب لكل فدان**.`}
- **حالة المحصول:** ${isShock ? 'الزرع حرارته دافية ومكتوم، ولو ماسقيتوش النهاردة هينشف ويصفر فجأة بعد أسبوعين.' : 'الزرع بيتنفس وبيبرد نفسه بصورة طبيعية ولا يوجد أي إجهاد مائي.'}
- **أفضل وقت للري:** مع طراوة الصباح الباكر أو قبل الغروب عشان الميه متتبخرش في حرارة الشمس.`;

    const fallbackEnglish = `Hello! Based on the conditions of your field in **${fieldName}**:
- **Irrigation Decision:** ${isShock ? `Yes, your crop is under moisture stress and needs **${irrigationMm} mm of water** (~${waterPerHectare} m³/ha) today.` : `Your field is in great shape! Only routine maintenance irrigation of **${irrigationMm} mm** (~${waterPerHectare} m³/ha) is recommended.`}
- **Crop Condition:** ${isShock ? 'The canopy is feverish and breathing pores are shut. Quenching now prevents sudden wilting in 14 days.' : 'Healthy transpirational cooling and steady root moisture levels.'}
- **Best Time to Water:** Early morning or late afternoon to avoid midday evaporative losses.`;

    return NextResponse.json({
      success: true,
      reply: lang === 'en' ? fallbackEnglish : fallbackArabic,
      model: 'farmer-friendly-core'
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
