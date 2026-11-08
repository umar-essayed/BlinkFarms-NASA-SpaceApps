// ==============================================================================
// BlinkFarms — Farmer AI Conversational Engine
// Empathetic, Jargon-Free, Practical Agricultural Intelligence
// ==============================================================================

import { ChatMessage, FlashDroughtTelemetry, RotationStrategy, FieldMemoryState, Language } from './types';

export function getInitialBotGreeting(lang: Language, fieldName: string): ChatMessage {
  if (lang === 'ar') {
    return {
      id: 'greeting_ar',
      sender: 'assistant',
      timestamp: 'الآن',
      text: `أهلاً بك يا طيب! أنا مساعدك الزراعي الذكي في **BlinkFarms**. أنا هنا عشان أترجم لك صور أقمار ناسا الفضائية لنصائح عملية تفيدك في أرضك (${fieldName}). تقدر تسألني عن حالة الزرع اللحظية، ميعاد وكمية الري، أو أفضل المحاصيل اللي تزرعها السنين الجاية عشان توفر مية وتكسب أكتر.`,
      suggestedAction: {
        actionType: 'show_alert',
        labelAr: 'فحص حرارة وعطش الزرع الآن',
        labelEn: 'Check Canopy Stress & Water Need',
      }
    };
  }

  return {
    id: 'greeting_en',
    sender: 'assistant',
    timestamp: 'Now',
    text: `Hello! I am your **BlinkFarms** agricultural advisor. I translate NASA satellite observations into practical, everyday advice for your field (${fieldName}). Ask me about real-time crop thirst, optimal irrigation volume, or the most profitable crop rotations for your next 3 years.`,
    suggestedAction: {
      actionType: 'show_alert',
      labelAr: 'فحص حرارة وعطش الزرع الآن',
      labelEn: 'Check Canopy Stress & Water Need',
    }
  };
}

export function generateFarmerResponse(
  userQuery: string,
  lang: Language,
  telemetry: FlashDroughtTelemetry,
  memory: FieldMemoryState,
  bestStrategy: RotationStrategy
): ChatMessage {
  const q = userQuery.toLowerCase();
  const timestamp = lang === 'ar' ? 'الآن' : 'Now';

  // Topic 1: Why irrigate when green? (NDVI Deception & Flash Drought)
  if (q.includes('أروي') || q.includes('اخضر') || q.includes('أخضر') || q.includes('irrigate') || q.includes('green') || q.includes('thirst') || q.includes('عطش')) {
    if (lang === 'ar') {
      return {
        id: `reply_${Date.now()}`,
        sender: 'assistant',
        timestamp,
        text: `سؤال في وقته يا حاج! عينك والتطبيقات العادية بتشوف الزرع أخضر، لكن قمر ناسا الحراري كشف إن **حرارة ورق النبات زايدة بمقدار ${telemetry.canopyTempAnomalyC}°C عن الطبيعي**. ده معناه إن النبات قفل مسامه عشان يحبس المية ومش قادر يبرّد نفسه، ودي بداية **جفاف ومضي مفاجئ**. لو استنيت لما الورق يصفر، المحصول هيضيع لا قدر الله.\n\n💧 **نصيحتنا:** شغّل الري النهاردة بكمية **${telemetry.prescribedIrrigationMm} ملم** (حوالي **${telemetry.prescribedVolumeM3Ha} م³ للفدان/الهكتار**).`,
        suggestedAction: {
          actionType: 'irrigate_now',
          labelAr: 'اعتماد كمية الري الموصى بها',
          labelEn: 'Confirm Recommended Irrigation',
        }
      };
    } else {
      return {
        id: `reply_${Date.now()}`,
        sender: 'assistant',
        timestamp,
        text: `A very timely question! While standard vegetation indices (NDVI) still show lush green leaves, NASA's thermal sensors detected an internal canopy fever of **+${telemetry.canopyTempAnomalyC}°C**. The plant has shut its stomata to lock in water and stopped transpirational cooling—a clear sign of an imminent **Flash Drought**.\n\n💧 **Recommendation:** Irrigate today with **${telemetry.prescribedIrrigationMm} mm** (~**${telemetry.prescribedVolumeM3Ha} m³/ha**) to protect root-zone vascular health before chlorophyll breakdown occurs in ~14 days.`,
        suggestedAction: {
          actionType: 'irrigate_now',
          labelAr: 'اعتماد كمية الري الموصى بها',
          labelEn: 'Confirm Recommended Irrigation',
        }
      };
    }
  }

  // Topic 2: Crop Rotation Recommendations (FieldShift & TOPSIS)
  if (q.includes('دورة') || q.includes('ازرع') || q.includes('محصول') || q.includes('crop') || q.includes('rotation') || q.includes('plant') || q.includes('next year')) {
    const y1 = bestStrategy.years[0].crop;
    const y2 = bestStrategy.years[1].crop;
    const y3 = bestStrategy.years[2].crop;

    if (lang === 'ar') {
      return {
        id: `reply_${Date.now()}`,
        sender: 'assistant',
        timestamp,
        text: `بعد ما فحصنا طقس بلدكم لـ 30 سنة سابقة ومستوى الرطوبة في الأعماق، أفضل خطة مدروسة لأرضك للـ 3 مواسم القادمة هي: **(${y1.nameAr} ← ${y2.nameAr} ← ${y3.nameAr})**.\n\n🌟 **الفوائد المباشرة:**\n• هتوفر **${bestStrategy.totalWaterSavedPercent}% من مياه الري** مقارنة بالزراعة التقليدية.\n• ${y2.nameAr} هيثبت في أرضك **${bestStrategy.totalNitrogenAddedKgHa} كغ نيتروجين طبيعي** ببلاش يغنيك عن شيكارتين كيماوي.\n• مخاطر عطش وتلف المحصول هتنزل من 74% إلى **${bestStrategy.avgFailureRiskPercent}% فقط**!`,
        suggestedAction: {
          actionType: 'view_rotations',
          labelAr: 'عرض جدول المقارنة الكامل للخيارات الثلاثة',
          labelEn: 'Compare 3 Rotation Strategies',
        }
      };
    } else {
      return {
        id: `reply_${Date.now()}`,
        sender: 'assistant',
        timestamp,
        text: `Based on your subsoil memory and 30 years of NASA POWER climate patterns, your top-ranked 3-year rotation strategy is: **(${y1.nameEn} → ${y2.nameEn} → ${y3.nameEn})**.\n\n🌟 **Key Field Benefits:**\n• Saves **${bestStrategy.totalWaterSavedPercent}% irrigation water** vs. continuous monoculture.\n• Adds **+${bestStrategy.totalNitrogenAddedKgHa} kg N/ha of organic nitrogen** via legume fixation.\n• Reduces drought-induced crop failure risk from 74% down to just **${bestStrategy.avgFailureRiskPercent}%**.`,
        suggestedAction: {
          actionType: 'view_rotations',
          labelAr: 'عرض جدول المقارنة الكامل للخيارات الثلاثة',
          labelEn: 'Compare 3 Rotation Strategies',
        }
      };
    }
  }

  // Topic 3: Subsoil Compaction & Soil Health (Closed Loop Xi_soil_error)
  if (q.includes('تربة') || q.includes('ملوحة') || q.includes('صماء') || q.includes('soil') || q.includes('salinity') || q.includes('hardpan') || q.includes('compaction')) {
    const hardpanMsgAr = memory.hardpanDetected
      ? `تحليل استجابة الري كشف وجود **طبقة صماء مضغوطة (Hardpan)** على عمق ~45 سم بتمنع المية من النزول للأعماق. بننصحك باستخدام محاصيل ذات وتد جذري عميق زي (عباد الشمس أو البرسيم الحجازي) لتفكيكها طبيعياً.`
      : `استجابة التربة للري ممتازة والتصريف في الأعماق طبيعي دون وجود طبقات صماء معيقة.`;

    const hardpanMsgEn = memory.hardpanDetected
      ? `Closed-loop satellite probing detected a dense **subsoil hardpan compaction layer** at ~45 cm impeding root infiltration. We strongly suggest introducing deep taproot crops like sunflower or alfalfa to naturally break this barrier.`
      : `Soil hydraulic percolation is healthy with no restrictive hardpan layers detected.`;

    return {
      id: `reply_${Date.now()}`,
      sender: 'assistant',
      timestamp,
      text: lang === 'ar' ? hardpanMsgAr : hardpanMsgEn,
      suggestedAction: {
        actionType: 'view_rotations',
        labelAr: 'اختيار محاصيل تفكيك التربة',
        labelEn: 'Select Soil-Rebuilding Crops',
      }
    };
  }

  // Default Fallback
  return {
    id: `reply_${Date.now()}`,
    sender: 'assistant',
    timestamp,
    text: lang === 'ar'
      ? `أنا تحت أمرك دائماً! تحب أعرض لك **حجم الري الموصى به اليوم لتفادي الجفاف الومضي**، ولا نراجع **المحاصيل الأنسب لأرضك الموسم القادم**؟`
      : `I am always here to assist! Would you like me to show you the **exact irrigation volume needed today to prevent flash drought**, or explore **the best rotation crops for next season**?`,
    suggestedAction: {
      actionType: 'show_alert',
      labelAr: 'فحص إنذار الجفاف والري',
      labelEn: 'Check Drought Alert & Irrigation',
    }
  };
}
