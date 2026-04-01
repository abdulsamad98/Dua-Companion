// This tells Next.js that this component runs on the client side (in the browser)
"use client";

import { useState, useEffect } from "react";
import categoryToNames from "./categoryToNames.json";
import propheticStories from "./propheticStories.json";
import problemBasedDhikr from "./problemBasedDhikr.json";
import nameMeanings from "./nameMeanings.json";
import quranDuas from "./quranDuas.json";

// Type definitions for three-layer format (Arabic, transliteration, English)
type ThreeLayer = {
  ar: string;
  transliteration: string;
  en: string;
};

type TwoLayer = {
  ar: string;
  en: string;
};

// Qur'anic Dua database type
type QuranDua = {
  id: string;
  categoryTags: string[];
  emotionalTags: string[];
  arabic: string;
  transliteration: string;
  translation: string;
  surahName: string;
  surahNumber: number;
  ayahStart: number;
  ayahEnd: number;
};

// High-level user intent types (will be used in later phases)
type EmotionalTheme =
  | "fear"
  | "hope"
  | "guilt"
  | "stress"
  | "gratitude"
  | "loss"
  | "confusion";

type NeedCategory =
  | "forgiveness"
  | "rizq"
  | "protection"
  | "guidance"
  | "health"
  | "family"
  | "marriage"
  | "exams"
  | "oppression"
  | "hereafter"
  | "general";

type FocusPerson =
  | "self"
  | "mother"
  | "father"
  | "parents"
  | "spouse"
  | "child"
  | "friend"
  | "deceased";

type HereafterTone = "balanced" | "fear" | "hope";

type UserIntent = {
  // Main need that should shape most sections
  primaryCategory: NeedCategory;
  // Other needs detected from UI + text
  secondaryCategories: NeedCategory[];
  // High-level emotional themes from the text (stress, fear, gratitude, etc.)
  emotionalThemes: EmotionalTheme[];
  // Primary focus person for the dua (self, parents, friend, etc.)
  focusPerson: FocusPerson;
  // All distinct needs (primary + secondary)
  allNeeds: NeedCategory[];
  // All detected focus targets (can include friend AND parents, etc.)
  allFocusPersons: FocusPerson[];
  // Whether the user explicitly appears to be seeking forgiveness for sins
  forgivenessRequested: boolean;
  // How much the user seems to be focused on fear vs hope for the Hereafter
  hereafterTone: HereafterTone;
};

type DuaSectionKind =
  | "praise"
  | "tawhid"
  | "names"
  | "weakness"
  | "forgiveness"
  | "worldly"
  | "hereafter"
  | "for-others"
  | "salawat";

type DuaContentBlock = {
  source: "quran" | "fixed" | "ai-english";
  arabic?: string;
  transliteration?: string;
  translation?: string;
  quranRef?: {
    surahName: string;
    surahNumber: number;
    ayahStart: number;
    ayahEnd: number;
  };
  note?: string;
  // Longer English-only context about who used this dua and in what situation
  contextSummary?: string;
};

type StructuredDuaSection = {
  kind: DuaSectionKind;
  title: string;
  blocks: DuaContentBlock[];
};

type StructuredDua = {
  intent: UserIntent;
  sections: StructuredDuaSection[];
};

// Light personalization mapping: relevant Names of Allah (in transliteration) per primary need
const categoryToDivineNames: Partial<Record<NeedCategory, string[]>> = {
  rizq: ["Ar-Razzāq", "Al-Ghaniyy", "Al-Wahhāb", "Al-Fattāḥ"],
  health: ["Ash-Shāfī", "Ar-Rahmān", "Ar-Rahīm", "Al-Latīf"],
  marriage: ["Al-Wadūd", "Al-Latīf", "Al-Hādī"],
  family: ["Ar-Rahmān", "Ar-Rahīm", "Al-Hafīẓ"],
  exams: ["Al-ʿAlīm", "Al-Hakīm"],
  protection: ["Al-Hafīẓ", "Al-Qawiyy", "Al-Matīn"],
  oppression: ["Al-ʿAdl", "An-Naṣīr"],
};

// Optional simple meanings for some Divine Names (for English explanation only)
const divineNameMeanings: Record<string, string> = {
  "Ar-Razzāq": "The Provider of Sustenance",
  "Al-Ghaniyy": "The Self-Sufficient, Free of Need",
  "Al-Wahhāb": "The Bestower of Gifts",
  "Al-Fattāḥ": "The Opener of Doors",
  "Ash-Shāfī": "The Healer",
  "Ar-Rahmān": "The Entirely Merciful",
  "Ar-Rahīm": "The Especially Merciful",
  "Al-Latīf": "The Subtle and Gentle",
  "Al-Wadūd": "The Most Loving",
  "Al-Hādī": "The Guide",
  "Al-Hafīẓ": "The Preserver and Protector",
  "Al-ʿAlīm": "The All-Knowing",
  "Al-Hakīm": "The All-Wise",
  "Al-Qawiyy": "The All-Strong",
  "Al-Matīn": "The Firm and Steadfast",
  "Al-ʿAdl": "The Just",
  "An-Naṣīr": "The Helper and Supporter",
};

// Optional contextual stories for selected Qur'anic duas (English-only, no new Arabic)
const quranDuaContext: Record<
  string,
  {
    speaker?: string;
    contextSummary: string;
  }
> = {
  hereafter_yusuf_12_101_good_death: {
    speaker: "Prophet Yusuf ( عليه السلام )",
    contextSummary:
      "This dua is from Prophet Yusuf (Joseph) after Allah reunited him with his family and showed him the outcome of years of trials. He acknowledges Allah's blessings, asks to die as a Muslim, and to be joined with the righteous.",
  },
  hereafter_furqan_25_65_protection_hell: {
    contextSummary:
      "This dua is from the description of 'the servants of the Most Merciful' in Surah Al-Furqan. They are people who constantly ask Allah to keep them far from the punishment of Hell, recognizing how severe and clinging that punishment is.",
  },
  hereafter_imran_3_9_day_gathering: {
    contextSummary:
      "This dua is from the believers who are conscious of the Day of Gathering. They affirm that Allah will certainly gather all people on a Day about which there is no doubt, and that He never breaks His promise.",
  },
  hereafter_ghafir_40_8_jannah_adn: {
    contextSummary:
      "This dua is made by the angels who carry the Throne and those around it, as they supplicate for the believers. They ask Allah to admit the believers into the eternal Gardens of Eden along with their righteous parents, spouses, and descendants.",
  },
};

// Typed Qur'anic dua data loaded from JSON
const quranDuaData = quranDuas as QuranDua[];

// Helper: filter Qur'anic duas by category tag and optional emotional themes
const getQuranDuasByCategory = (
  category: string,
  intent?: UserIntent,
  limit: number = 3
): QuranDua[] => {
  let matches = quranDuaData.filter((dua) => dua.categoryTags.includes(category));

  // If we have emotional themes, prefer those that share at least one emotionalTag
  if (intent && intent.emotionalThemes.length > 0) {
    const emSet = new Set(intent.emotionalThemes);
    const emotionalMatches = matches.filter((dua) =>
      dua.emotionalTags.some((t) => emSet.has(t as EmotionalTheme))
    );
    if (emotionalMatches.length > 0) {
      matches = emotionalMatches;
    }
  }

  return matches.slice(0, limit);
};

// Section-specific helpers (mapping intent → relevant Qur'anic duas)
const getForgivenessSectionDuas = (intent: UserIntent, limit: number = 3): QuranDua[] => {
  // If user explicitly seems to be seeking forgiveness for sins, prefer more specific forgiveness tags if present
  if (intent.forgivenessRequested) {
    const specificTags = [
      "forgiveness-major-sin",
      "forgiveness-regret",
      "forgiveness-returning",
      "forgiveness-oppression",
      "forgiveness-repeated-sin",
    ];
    for (const tag of specificTags) {
      const matches = getQuranDuasByCategory(tag, intent, limit);
      if (matches.length > 0) {
        return matches;
      }
    }
  }
  // Fallback: general forgiveness duas
  return getQuranDuasByCategory("forgiveness", intent, limit);
};

const getWorldlySectionDuas = (intent: UserIntent, limit: number = 3): QuranDua[] => {
  // Use primaryCategory for worldly needs when it is not purely hereafter/general
  const primary = intent.primaryCategory;
  if (primary && primary !== "hereafter" && primary !== "general") {
    return getQuranDuasByCategory(primary, intent, limit);
  }
  // Fallback: general/worldly-tagged duas if present
  return getQuranDuasByCategory("worldly", intent, limit);
};

const getHereafterSectionDuas = (intent: UserIntent): QuranDua[] => {
  // Always cover all 4 core Hereafter themes every time:
  // 1) Good death, 2) Protection from Hell, 3) Day of Judgement, 4) Highest levels of Jannah
  const requiredTags = [
    "hereafter-good-death",
    "hereafter-protection-hell",
    "hereafter-judgement",
    "hereafter-jannah-high",
  ];

  const results: QuranDua[] = [];

  for (const tag of requiredTags) {
    const matches = getQuranDuasByCategory(tag, intent, 5);
    const pick = matches.find((d) => !results.some((x) => x.id === d.id));
    if (pick) {
      results.push(pick);
      continue;
    }

    // Fallback: any hereafter dua if a specific category is missing from the DB
    const fallbackMatches = getQuranDuasByCategory("hereafter", intent, 10);
    const fallbackPick = fallbackMatches.find((d) => !results.some((x) => x.id === d.id));
    if (fallbackPick) {
      results.push(fallbackPick);
    }
  }

  return results;
};

const getForOthersSectionDuas = (intent: UserIntent, limit: number = 2): QuranDua[] => {
  // For now, reuse family/victory/general categories as "for others" sources if present in the DB.
  const collected: QuranDua[] = [];
  const categoriesInOrder = ["family", "victory", "general"];
  for (const cat of categoriesInOrder) {
    const subset = getQuranDuasByCategory(cat, intent, limit);
    for (const dua of subset) {
      if (!collected.find((d) => d.id === dua.id)) {
        collected.push(dua);
        if (collected.length >= limit) break;
      }
    }
    if (collected.length >= limit) break;
  }
  return collected;
};

// Dev-time validation to help ensure Qur'anic Arabic only comes from the curated DB
const validateStructuredDua = (structured: StructuredDua) => {
  try {
    structured.sections.forEach((section) => {
      section.blocks.forEach((block) => {
        // For Qur'an blocks, ensure reference metadata exists
        if (block.source === "quran") {
          if (!block.quranRef) {
            console.warn(
              "[StructuredDua validation] Qur'an block missing quranRef metadata:",
              section.kind,
              block
            );
          }
        }
        // For AI-English blocks, they should not contain Arabic or transliteration
        if (block.source === "ai-english") {
          if (block.arabic || block.transliteration) {
            console.warn(
              "[StructuredDua validation] ai-english block should not contain Arabic/transliteration:",
              section.kind,
              block
            );
          }
        }
      });
    });
  } catch (err) {
    console.warn("[StructuredDua validation] Error while validating structured dua:", err);
  }
};

type FixedDuaBlocks = {
  praise: ThreeLayer;
  salawat1: ThreeLayer;
  ismAzam: ThreeLayer;
  humility: ThreeLayer;
  salawat2: ThreeLayer;
};

// Build the new structured dua model (8 sections) using intent + fixed blocks + Qur'anic dua DB
const buildStructuredDua = (
  intent: UserIntent,
  fixed: FixedDuaBlocks,
  personalDuaText: string
): StructuredDua => {
  const sections: StructuredDuaSection[] = [];
  const usedDuaIds = new Set<string>();

  const mapQuranDuasToBlocks = (duas: QuranDua[], note: string): DuaContentBlock[] => {
    return duas.reduce<DuaContentBlock[]>((acc, d) => {
      if (usedDuaIds.has(d.id)) {
        return acc;
      }
      usedDuaIds.add(d.id);
       const ctx = quranDuaContext[d.id];
      acc.push({
        source: "quran",
        arabic: d.arabic,
        transliteration: d.transliteration,
        translation: d.translation,
        quranRef: {
          surahName: d.surahName,
          surahNumber: d.surahNumber,
          ayahStart: d.ayahStart,
          ayahEnd: d.ayahEnd,
        },
        note,
        contextSummary: ctx?.contextSummary,
      });
      return acc;
    }, []);
  };

  // 1. Praise Allah
  sections.push({
    kind: "praise",
    title: "Praise Allah",
    blocks: [
      {
        source: "fixed",
        arabic: fixed.praise.ar,
        transliteration: fixed.praise.transliteration,
        translation: fixed.praise.en,
        note: "Fixed praise block",
      },
      {
        source: "fixed",
        arabic: fixed.ismAzam.ar,
        transliteration: fixed.ismAzam.transliteration,
        translation: fixed.ismAzam.en,
        note: "Ism-ul-Aʿẓam dua",
      },
    ],
  });

  // 2. Tawhid (English-only fixed statement to avoid introducing new Arabic)
  sections.push({
    kind: "tawhid",
    title: "Declare Tawḥīd",
    blocks: [
      {
        source: "fixed",
        translation:
          "You are Allah, there is no deity except You. You are the First and the Last, the Most High and the Most Near.",
        note: "Fixed tawhid statement (English only).",
      },
    ],
  });

  // 3. Call Upon Allah by His Beautiful Names
  const namesBlocks: DuaContentBlock[] = [
    {
      source: "fixed",
      arabic: "يَا اللّٰهُ، يَا رَحْمٰنُ، يَا رَحِيمُ",
      transliteration: "Ya Allah, Ya Rahman, Ya Rahim",
      translation: "O Allah, O Most Merciful, O Most Compassionate.",
      note: "Calling upon Allah by His Beautiful Names (fixed vocative).",
    },
  ];

  // Collect Names of Allah relevant to ALL detected needs (rizq, health, etc.)
  const extraNameSet = new Set<string>();
  const needsToUse = intent.allNeeds && intent.allNeeds.length > 0 ? intent.allNeeds : [intent.primaryCategory];
  for (const need of needsToUse) {
    const namesForNeed = categoryToDivineNames[need];
    if (namesForNeed) {
      namesForNeed.forEach((n) => extraNameSet.add(n));
    }
  }

  const extraNames = Array.from(extraNameSet);
  if (extraNames.length > 0) {
    // Build a "Ya ..." style line with optional short meanings
    const detailedNamePhrases = extraNames.map((name) => {
      const meaning = divineNameMeanings[name];
      return meaning ? `${name} (${meaning})` : name;
    });

    namesBlocks.push({
      source: "ai-english",
      translation: `Ya ${detailedNamePhrases.join(", Ya ")}`,
      note: "Calling upon Allah by relevant Names (transliteration with meanings).",
    });

    namesBlocks.push({
      source: "ai-english",
      translation: `O Allah, I call upon You by Your beautiful Names: ${extraNames.join(
        ", "
      )}.`,
      note: "Summary of the relevant Divine Names connected to your situation.",
    });
  }

  sections.push({
    kind: "names",
    title: "Call Upon Allah by His Beautiful Names",
    blocks: namesBlocks,
  });

  // 4. Confess Weakness
  const weaknessBlocks: DuaContentBlock[] = [
    {
      source: "fixed",
      arabic: fixed.humility.ar,
      transliteration: fixed.humility.transliteration,
      translation: fixed.humility.en,
      note: "Humility & weakness block",
    },
  ];

  const weaknessPhrases: string[] = [];

  switch (intent.primaryCategory) {
    case "rizq":
      weaknessPhrases.push(
        "I am overwhelmed and unable to manage my financial affairs without Your help."
      );
      break;
    case "health":
      weaknessPhrases.push(
        "My body is weak and I am in desperate need of Your healing and mercy."
      );
      break;
    case "marriage":
      weaknessPhrases.push(
        "I feel weak and lost in choosing what is best for my marriage and future spouse."
      );
      break;
    case "exams":
      weaknessPhrases.push(
        "My knowledge, focus, and memory are limited; I depend completely on You for success."
      );
      break;
    case "family":
      weaknessPhrases.push(
        "I feel weak in handling my family matters and I cannot put things right without Your guidance."
      );
      break;
    case "protection":
      weaknessPhrases.push(
        "I am vulnerable and exposed without Your protection."
      );
      break;
    default:
      break;
  }

  if (
    intent.emotionalThemes.includes("fear") ||
    intent.emotionalThemes.includes("stress") ||
    intent.emotionalThemes.includes("loss")
  ) {
    weaknessPhrases.push(
      "My heart is restless and afraid; only You can give me true tranquility and strength."
    );
  }

  if (weaknessPhrases.length > 0) {
    weaknessBlocks.push({
      source: "ai-english",
      translation: weaknessPhrases.join(" "),
      note: "Personalized confession of weakness based on your situation.",
    });
  }

  sections.push({
    kind: "weakness",
    title: "Confess Weakness",
    blocks: weaknessBlocks,
  });

  // 4. Ask Forgiveness (Qur'anic duas tagged as forgiveness)
  const forgivenessDuas = getForgivenessSectionDuas(intent);
  const forgivenessBlocks: DuaContentBlock[] = [];

  // Small contextual English line linking hardship with seeking forgiveness
  forgivenessBlocks.push({
    source: "ai-english",
    translation:
      "O Allah, forgive my sins and shortcomings that may have contributed to this difficulty I am facing.",
    note: "Contextual link between your hardship and seeking forgiveness (English only).",
  });

  forgivenessBlocks.push(
    ...mapQuranDuasToBlocks(
      forgivenessDuas,
      "Qur'anic dua for forgiveness"
    )
  );

  sections.push({
    kind: "forgiveness",
    title: "Ask Forgiveness",
    blocks: forgivenessBlocks,
  });

  // 5. Worldly Needs
  const worldlyDuas = getWorldlySectionDuas(intent);
  const worldlyBlocks: DuaContentBlock[] = [];

  if (personalDuaText && personalDuaText.trim().length > 0) {
    worldlyBlocks.push({
      source: "ai-english",
      translation: personalDuaText.trim(),
      note: "Your detailed request in your own words.",
    });
  }

  worldlyBlocks.push(
    ...mapQuranDuasToBlocks(
      worldlyDuas,
      "Qur'anic dua for worldly matters"
    )
  );

  sections.push({
    kind: "worldly",
    title: "Ask for Worldly Needs",
    blocks: worldlyBlocks,
  });

  // 6. Hereafter Success
  const hereafterDuas = getHereafterSectionDuas(intent);
  sections.push({
    kind: "hereafter",
    title: "Ask for Hereafter Success",
    blocks: mapQuranDuasToBlocks(
      hereafterDuas,
      "Qur'anic dua for hereafter success"
    ),
  });

  // 7. For Others / Ummah
  const othersDuas = getForOthersSectionDuas(intent);
  const othersBlocks: DuaContentBlock[] = [];

  let othersLine: string | null = null;
  const focus = intent.focusPerson;

  // Prefer specific focus (mother, father, parents, etc.) if detected
  if (focus === "mother") {
    if (intent.primaryCategory === "health") {
      othersLine = "Grant complete shifāʾ, ease, and a long life in Your obedience to my mother.";
    } else {
      othersLine = "Have mercy on my mother, forgive her, and grant her goodness in this world and the Hereafter.";
    }
  } else if (focus === "father") {
    if (intent.primaryCategory === "health") {
      othersLine = "Grant complete shifāʾ, strength, and well-being to my father.";
    } else {
      othersLine = "Have mercy on my father, forgive him, and grant him goodness in this world and the Hereafter.";
    }
  } else if (focus === "parents") {
    othersLine =
      "Forgive my parents, have mercy on them as they raised me when I was small, and grant them the best of both worlds.";
  } else if (focus === "spouse") {
    if (intent.primaryCategory === "marriage" || intent.primaryCategory === "family") {
      othersLine =
        "Bless my spouse and our marriage with love, mercy, and tranquility, and keep us firm upon Your obedience.";
    } else {
      othersLine =
        "Grant goodness, guidance, and protection to my spouse in all aspects of their life.";
    }
  } else if (focus === "child") {
    if (intent.primaryCategory === "health") {
      othersLine = "Grant complete shifāʾ, protection, and a righteous future to my child.";
    } else {
      othersLine =
        "Make my children righteous, obedient to You, a source of coolness for our eyes, and protect them from harm.";
    }
  } else if (focus === "friend") {
    othersLine =
      "Grant guidance, relief, and goodness to the one I am making this dua for, and make our friendship a means of pleasing You.";
  } else if (focus === "deceased") {
    othersLine =
      "Forgive the one who has passed away, expand their grave, raise their rank, and join us together in the highest levels of Jannah.";
  } else if (intent.primaryCategory === "health") {
    othersLine = "Grant complete shifāʾ and ease to all those who are sick and in pain.";
  } else if (intent.primaryCategory === "rizq") {
    othersLine = "Relieve the debts and financial burdens of all those who are struggling.";
  } else if (intent.primaryCategory === "marriage") {
    othersLine =
      "Grant righteous spouses and tranquility in marriage to all those longing for halal companionship.";
  } else if (intent.primaryCategory === "exams") {
    othersLine =
      "Grant clarity, understanding, and success to all students and seekers of knowledge.";
  }

  if (othersLine) {
    othersBlocks.push({
      source: "ai-english",
      translation: othersLine,
      note: "Personalized dua for others facing similar hardship.",
    });
  }

  othersBlocks.push(
    ...mapQuranDuasToBlocks(
      othersDuas,
      "Qur'anic dua for others and the Ummah"
    )
  );

  sections.push({
    kind: "for-others",
    title: "Duʿā for Others & the Ummah",
    blocks: othersBlocks,
  });

  // 8. Ṣalawāt
  sections.push({
    kind: "salawat",
    title: "End with Ṣalawāt",
    blocks: [
      {
        source: "fixed",
        arabic: fixed.salawat1.ar,
        transliteration: fixed.salawat1.transliteration,
        translation: fixed.salawat1.en,
        note: "Salawat on the Prophet ﷺ",
      },
      {
        source: "fixed",
        arabic: fixed.salawat2.ar,
        transliteration: fixed.salawat2.transliteration,
        translation: fixed.salawat2.en,
        note: "Closing salawat on the Prophet ﷺ",
      },
    ],
  });

  return {
    intent,
    sections,
  };
};

// Updated GeneratedDua type with mandatory structure
type GeneratedDua = {
  // 1. Praise Allah
  praise: ThreeLayer;
  // 2. Salāh upon Prophet Muhammad ﷺ
  salawat1: ThreeLayer;
  // 3. Ism-ul-A'ẓam Dua (fixed wording)
  ismAzam: ThreeLayer;
  // 4. Calling Allah by relevant Names
  names: ThreeLayer;
  // 5. Humility & weakness
  humility: ThreeLayer;
  // 6. User's personal Dua section (free language, user input)
  personalDua: string;
  // 7. Clear request
  request: ThreeLayer;
  // 8. Tawakkul (trust in Allah)
  trust: ThreeLayer;
  // 9. Salāh again
  salawat2: ThreeLayer;
  // 10. Āmīn
  ameen: ThreeLayer;
  // Problem-Based Dhikr & Dua
  problemBasedDhikr: ThreeLayer[];
  problemBasedDua: ThreeLayer[];
  // Prophetic Story
  propheticStory: {
    prophet: string;
    story: ThreeLayer;
    incident: ThreeLayer;
    outcome: ThreeLayer;
  };
};

// Data structure for "Why Dua Is Not Answered" section
type WhyNotAnsweredPoint = {
  id: string;
  title: string;
  description: string;
  source: "quran" | "hadith" | "scholarly";
  sourceText: string;
};

type WhyNotAnsweredCategory = {
  id: string;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  points: WhyNotAnsweredPoint[];
};

const whyNotAnsweredData: WhyNotAnsweredCategory[] = [
  {
    id: "halal-accountability",
    title: "Halal & Accountability",
    description: "Your foundation matters",
    color: "orange",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    points: [
      {
        id: "haram-sustenance",
        title: "Consuming Haram (Income, Food, Clothing)",
        description: "Dua is blocked when income, food, or clothing comes from haram sources (unlawful earnings, oppressive income, cheating).",
        source: "hadith",
        sourceText: "Sahih Muslim"
      },
      {
        id: "oppression-injustice",
        title: "Oppression (Ẓulm) of Others",
        description: "Cheating, hurting people, or taking rights unjustly prevents Dua from being answered.",
        source: "hadith",
        sourceText: "Hadith"
      },
      {
        id: "ignoring-rights",
        title: "Ignoring the Rights of Others",
        description: "Unpaid debts, broken promises, or injustice in dealings can block Dua.",
        source: "scholarly",
        sourceText: "Scholarly Explanation"
      },
      {
        id: "unpaid-debts",
        title: "Unpaid Debts & Cheating",
        description: "Financial obligations and dishonest dealings create barriers to answered Dua.",
        source: "hadith",
        sourceText: "Hadith"
      }
    ]
  },
  {
    id: "heart-faith",
    title: "Heart & Faith State",
    description: "Dua is worship, not words",
    color: "red",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
    points: [
      {
        id: "distracted-heart",
        title: "A Heedless or Distracted Heart",
        description: "Dua made without presence of heart is not accepted. The tongue speaks but the heart is absent.",
        source: "hadith",
        sourceText: "Tirmidhi (Hasan)"
      },
      {
        id: "weak-tawakkul",
        title: "Weak Tawakkul (Trust in Allah)",
        description: "Asking without belief or depending only on means without trusting Allah weakens Dua.",
        source: "quran",
        sourceText: "Qur'an 40:60"
      },
      {
        id: "lack-sincerity",
        title: "Lack of Sincerity (Ikhlāṣ)",
        description: "Dua for showing off or without humility lacks the sincerity needed for acceptance.",
        source: "quran",
        sourceText: "Qur'an 98:5"
      },
      {
        id: "arrogance-pride",
        title: "Arrogance & Pride",
        description: "Feeling self-sufficient or looking down on others prevents Dua acceptance.",
        source: "quran",
        sourceText: "Qur'an 7:55"
      }
    ]
  },
  {
    id: "actions-dua",
    title: "Actions vs Dua",
    description: "Dua must align with deeds",
    color: "yellow",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-300",
    points: [
      {
        id: "neglecting-obligations",
        title: "Neglecting Obligatory Acts (Farḍ)",
        description: "Abandoning ṣalāh, not paying zakāh, neglecting fasting, or disobeying parents. Obligations come before Dua.",
        source: "scholarly",
        sourceText: "Scholars: Obligations come before Dua"
      },
      {
        id: "persisting-sins",
        title: "Persisting in Major Sins Without Repentance",
        description: "Arrogance, immorality, or public sinning without seeking forgiveness blocks Dua.",
        source: "quran",
        sourceText: "Qur'an 42:30"
      },
      {
        id: "constant-disobedience",
        title: "Living in Constant Disobedience",
        description: "Making Dua while continuing rebellion. Dua needs alignment with action.",
        source: "scholarly",
        sourceText: "Scholars: Dua needs alignment with action"
      },
      {
        id: "not-seeking-halal",
        title: "Not Seeking Halal Means Along With Dua",
        description: "Tie your camel, then trust Allah. Dua without effort ≠ true reliance.",
        source: "hadith",
        sourceText: "Hadith: Tie your camel, then trust Allah"
      }
    ]
  },
  {
    id: "wrong-types",
    title: "Wrong Types of Dua",
    description: "Not every request is accepted",
    color: "purple",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    points: [
      {
        id: "asking-for-sin",
        title: "Asking for Sin or Haram",
        description: "Requesting wrongdoing, injustice, or desiring sinful outcomes cannot be accepted.",
        source: "hadith",
        sourceText: "Muslim"
      },
      {
        id: "impatience",
        title: "Impatience and Losing Hope",
        description: "Saying 'I made Dua but nothing happened' or setting deadlines for Allah shows lack of trust.",
        source: "hadith",
        sourceText: "Bukhari & Muslim"
      },
      {
        id: "cutting-family",
        title: "Cutting Family Ties",
        description: "Ignoring parents, breaking kinship bonds, or ongoing family disputes prevent Dua acceptance.",
        source: "hadith",
        sourceText: "Hadith"
      },
      {
        id: "only-in-hardship",
        title: "Making Dua Only in Hardship",
        description: "Remembering Allah only during difficulty, forgetting Him in ease.",
        source: "quran",
        sourceText: "Qur'an 10:12"
      },
      {
        id: "against-decree",
        title: "Dua Against Allah's Decree",
        description: "Resisting divine wisdom or rejecting qadr emotionally.",
        source: "scholarly",
        sourceText: "Scholarly Explanation"
      }
    ]
  },
  {
    id: "divine-wisdom",
    title: "Divine Wisdom",
    description: "This is not your fault",
    color: "green",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    points: [
      {
        id: "delay-wisdom",
        title: "Delay Due to Divine Wisdom",
        description: "This is NOT rejection. Allah delays Dua to protect you, prepare you, or give you something better in timing.",
        source: "quran",
        sourceText: "Qur'an 2:216"
      },
      {
        id: "answered-differently",
        title: "Dua Already Answered in Another Form",
        description: "Allah answers Dua by: granting it, delaying it, or removing harm instead. Many Duas are stored for the Akhirah or exchanged for protection.",
        source: "hadith",
        sourceText: "Hadith"
      },
      {
        id: "self-injustice",
        title: "Asking While Being Unjust to Yourself",
        description: "Ignoring self-reform or refusing to change sinful habits while asking for help.",
        source: "scholarly",
        sourceText: "Scholarly Explanation"
      },
      {
        id: "not-following-adab",
        title: "Not Following Adab (Etiquette) of Dua",
        description: "Not mandatory, but affects acceptance: not praising Allah, not sending ṣalāh on Prophet ﷺ, or rushing Dua.",
        source: "scholarly",
        sourceText: "Scholarly Explanation"
      }
    ]
  }
];

// Data for "Times & Situations When Dua Is More Likely to Be Accepted"
type BestTimeItem = {
  id: string;
  number: number;
  title: string;
  why: string[];
  proof: string;
  references: string;
  authenticity: string;
  duaText?: string;
  extra?: string;
};

type BestTimesSection = {
  id: string;
  sectionEmoji: string;
  title: string;
  subtitle: string;
  bgColor: string;
  borderColor: string;
  items: BestTimeItem[];
};

const bestTimesData: BestTimesSection[] = [
  {
    id: "sahih",
    sectionEmoji: "🕰️",
    title: "SECTION 1 — STRONGEST AUTHENTIC PROOFS (SAHIH)",
    subtitle: "Supported by Sahih Bukhari, Sahih Muslim, or clear Qur'an evidence.",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    items: [
      {
        id: "last-third-night",
        number: 1,
        title: "Last Third of the Night (Tahajjud Time)",
        why: ["Deep sincerity", "No distractions", "Maximum humility"],
        proof: "The Prophet ﷺ said: \"Our Lord descends every night to the lowest heaven during the last third of the night and says: Who is calling upon Me so that I may answer him? Who is asking Me so that I may give him? Who is seeking My forgiveness so that I may forgive him?\"",
        references: "📖 Sahih Bukhari (1145) • Sahih Muslim (758)",
        authenticity: "Sahih",
      },
      {
        id: "sujood",
        number: 2,
        title: "While in Sujood (Prostration)",
        why: ["Closest position to Allah", "Physical submission reflects spiritual surrender"],
        proof: "The Prophet ﷺ said: \"The closest a servant is to his Lord is while he is in sujood, so increase Dua in it.\"",
        references: "📖 Sahih Muslim (482)",
        authenticity: "Sahih",
      },
      {
        id: "friday-hour",
        number: 3,
        title: "The Special Hour on Friday (Jumu'ah)",
        why: ["Weekly gathering of Muslims", "Day of worship and remembrance", "A specific hour when Dua is accepted"],
        proof: "The Prophet ﷺ said: \"There is a special hour on Friday during which no Muslim asks Allah for something good except that He gives it to him.\"",
        references: "📖 Sahih Bukhari (935) • Sahih Muslim (852). Strongest scholarly opinion: between Asr and Maghrib.",
        authenticity: "Sahih",
      },
      {
        id: "laylatul-qadr",
        number: 4,
        title: "Laylatul Qadr",
        why: ["Better than 1000 months", "Night of decree and mercy"],
        proof: "\"Laylatul Qadr is better than a thousand months.\" (Qur'an 97:3). The Prophet ﷺ taught: Allahumma innaka 'afuwwun tuhibbul 'afwa fa'fu 'anni (O Allah, You are Most Forgiving, and You love forgiveness, so forgive me.)",
        references: "📖 Qur'an 97:3 • Tirmidhi (3513) — graded Sahih",
        authenticity: "Qur'an + Sahih Hadith",
      },
      {
        id: "dua-oppressed",
        number: 5,
        title: "Dua of the Oppressed",
        why: ["No barrier between it and Allah", "Divine justice responds directly"],
        proof: "The Prophet ﷺ said: \"Beware of the Dua of the oppressed, for there is no barrier between it and Allah.\"",
        references: "📖 Sahih Bukhari (2448)",
        authenticity: "Sahih",
      },
      {
        id: "dua-for-others",
        number: 6,
        title: "Dua for Others in Their Absence",
        why: ["No selfish motive", "Pure intention"],
        proof: "The Prophet ﷺ said: \"There is no Muslim who makes Dua for his brother in his absence except that the angel says: Ameen, and for you the same.\"",
        references: "📖 Sahih Muslim (2732)",
        authenticity: "Sahih",
      },
    ],
  },
  {
    id: "hasan",
    sectionEmoji: "🕌",
    title: "SECTION 2 — VERY STRONG (HASAN – ACCEPTED BY SCHOLARS)",
    subtitle: "Authentic but graded Hasan by scholars.",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    items: [
      {
        id: "adhan-iqamah",
        number: 7,
        title: "Between Adhan and Iqamah",
        why: ["Transition from worldly matters to prayer", "Time of obedience"],
        proof: "\"The Dua between the Adhan and the Iqamah is not rejected.\"",
        references: "📖 Abu Dawood (521) • Tirmidhi (212)",
        authenticity: "Hasan Sahih",
      },
      {
        id: "iftar",
        number: 8,
        title: "At the Time of Breaking the Fast (Iftar)",
        why: ["Hunger and patience for Allah", "Sincerity after worship"],
        proof: "\"The fasting person has a Dua at the time of breaking his fast that is not rejected.\"",
        references: "📖 Ibn Majah (1753)",
        authenticity: "Hasan",
      },
      {
        id: "after-obligatory",
        number: 9,
        title: "After Obligatory Prayers",
        why: ["Act of obedience just completed", "Heart softened"],
        proof: "The Prophet ﷺ was asked which Dua is most likely to be heard. He said: \"In the last part of the night and after the obligatory prayers.\"",
        references: "📖 Tirmidhi (3499)",
        authenticity: "Hasan",
      },
      {
        id: "arafah",
        number: 10,
        title: "Day of 'Arafah",
        why: ["Greatest day of forgiveness", "Day of immense mercy"],
        proof: "The Prophet ﷺ said: \"The best Dua is the Dua made on the Day of 'Arafah.\"",
        references: "📖 Tirmidhi (3585)",
        authenticity: "Hasan",
      },
      {
        id: "traveling",
        number: 11,
        title: "While Traveling",
        why: ["Vulnerability", "Reliance on Allah"],
        proof: "Mentioned among three Duas not rejected.",
        references: "📖 Abu Dawood (1536)",
        authenticity: "Hasan",
      },
      {
        id: "raining",
        number: 12,
        title: "When It Is Raining",
        why: ["Mercy descending visibly"],
        proof: "\"Two Duas are not rejected: at the time of the call to prayer and when it is raining.\"",
        references: "📖 Abu Dawood (2540)",
        authenticity: "Hasan",
      },
      {
        id: "parents-children",
        number: 13,
        title: "Dua of Parents for Their Children",
        why: ["Natural mercy", "Deep sincerity"],
        proof: "Included among the Duas not rejected.",
        references: "📖 Abu Dawood (1536)",
        authenticity: "Hasan",
      },
    ],
  },
  {
    id: "quranic",
    sectionEmoji: "📖",
    title: "SECTION 3 — QUR'ANIC PROPHETIC SUPPLICATIONS",
    subtitle: "",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    items: [
      {
        id: "yunus",
        number: 14,
        title: "Dua of Prophet Yunus (AS)",
        why: ["Pure Tawheed", "Admission of wrongdoing", "Complete humility"],
        proof: "No Muslim supplicates with it except that Allah responds.",
        references: "📖 Qur'an 21:87 • Tirmidhi (3505) — Sahih",
        authenticity: "Qur'an + Sahih",
        duaText: "La ilaha illa anta subhanaka inni kuntu minaz-zalimeen",
      },
      {
        id: "after-istighfar",
        number: 15,
        title: "After Istighfar (Seeking Forgiveness)",
        why: ["Sins block Dua", "Istighfar removes the barrier"],
        proof: "\"Seek forgiveness from your Lord… He will send rain upon you in abundance.\" (Qur'an 71:10–12)",
        references: "📖 Qur'an 71:10–12",
        authenticity: "Qur'anic evidence",
      },
    ],
  },
];

export default function Home() {
  const categories = [
    "Rizq",
    "Health",
    "Marriage",
    "Exams",
    "Anxiety",
    "Forgiveness",
    "Guidance",
    "Protection",
  ];

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [personalDuaInput, setPersonalDuaInput] = useState<string>("");
  const [generatedDua, setGeneratedDua] = useState<GeneratedDua | null>(null);
  const [structuredDua, setStructuredDua] = useState<StructuredDua | null>(null);
  const [savedDuas, setSavedDuas] = useState<(GeneratedDua & { id: string; savedAt: string; userInput: string; categories: string[]; name: string })[]>([]);
  const [viewMode, setViewMode] = useState<"welcome" | "generate" | "saved" | "why-not-answered" | "best-times">("welcome");
  const [isSaved, setIsSaved] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [duaName, setDuaName] = useState<string>("");
  const [editingDuaId, setEditingDuaId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [selectedSavedDuaId, setSelectedSavedDuaId] = useState<string>("");
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [whyNotAnsweredSubsection, setWhyNotAnsweredSubsection] = useState<"intro" | "main" | "summary">("intro");
  const [bestTimesSubsection, setBestTimesSubsection] = useState<"intro" | "main" | "summary">("intro");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [moreMenuOpen, setMoreMenuOpen] = useState<boolean>(false);
  const [showAllHereafter, setShowAllHereafter] = useState<boolean>(false);
  const [expandedHereafterStories, setExpandedHereafterStories] = useState<Set<string>>(new Set());

  const getSectionStyleClasses = (kind: DuaSectionKind) => {
    switch (kind) {
      case "praise":
        return {
          container: "bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500",
          title: "text-indigo-700",
          badge: "bg-indigo-600",
        };
      case "tawhid":
        return {
          container: "bg-gradient-to-r from-sky-50 to-cyan-50 border-l-4 border-sky-500",
          title: "text-sky-700",
          badge: "bg-sky-600",
        };
      case "names":
        return {
          container: "bg-gradient-to-r from-teal-50 to-emerald-50 border-l-4 border-teal-500",
          title: "text-teal-700",
          badge: "bg-teal-600",
        };
      case "weakness":
        return {
          container: "bg-gradient-to-r from-rose-50 to-pink-50 border-l-4 border-rose-500",
          title: "text-rose-700",
          badge: "bg-rose-600",
        };
      case "forgiveness":
        return {
          container: "bg-gradient-to-r from-emerald-50 to-teal-50 border-l-4 border-emerald-500",
          title: "text-emerald-700",
          badge: "bg-emerald-600",
        };
      case "worldly":
        return {
          container: "bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500",
          title: "text-amber-700",
          badge: "bg-amber-600",
        };
      case "hereafter":
        return {
          container: "bg-gradient-to-r from-purple-50 to-violet-50 border-l-4 border-purple-500",
          title: "text-purple-700",
          badge: "bg-purple-600",
        };
      case "for-others":
        return {
          container: "bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500",
          title: "text-green-700",
          badge: "bg-green-600",
        };
      case "salawat":
      default:
        return {
          container: "bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500",
          title: "text-indigo-700",
          badge: "bg-indigo-600",
        };
    }
  };

  // Check if onboarding has been shown before and initialize Speech Recognition
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (hasSeenOnboarding === "true") {
      setShowOnboarding(false);
    }

    // Initialize Speech Recognition API
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = "en-US";

        recognitionInstance.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setTranscribedText((prev) => prev + finalTranscript);
            setPersonalDuaInput((prev) => (prev + finalTranscript).trim());
          }
        };

        recognitionInstance.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === "no-speech" || event.error === "aborted") {
            setIsRecording(false);
          }
        };

        recognitionInstance.onend = () => {
          setIsRecording(false);
        };

        setRecognition(recognitionInstance);
      }
    }
  }, []);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognition && isRecording) {
        recognition.stop();
      }
    };
  }, [recognition, isRecording]);

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem("hasSeenOnboarding", "true");
  };


  const handleViewWelcome = () => {
    setViewMode("welcome");
  };


  const handleCategoryChange = (category: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedCategories([...selectedCategories, category]);
    } else {
      setSelectedCategories(selectedCategories.filter((cat) => cat !== category));
    }
  };

  // Handle voice recording
  const handleStartRecording = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      setTranscribedText("");
      recognition.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (recognition) {
      recognition.stop();
      setIsRecording(false);
    }
  };

  const handleClearRecording = () => {
    setTranscribedText("");
  };

  type TextAnalysis = {
    primaryConcerns: string[];
    specificSituations: string[];
    emotions: string[];
    details: string[];
    focusPerson: FocusPerson;
    allFocusPersons: FocusPerson[];
    forgivenessRequested: boolean;
  };

  // Shared text analysis for intent + personal dua wording
  const analyzeTextForIntent = (combinedInput: string): TextAnalysis => {
    const inputLower = combinedInput.toLowerCase();

    const textAnalysis: TextAnalysis = {
      primaryConcerns: [],
      specificSituations: [],
      emotions: [],
      details: [],
      focusPerson: "self",
      allFocusPersons: ["self"],
      forgivenessRequested: false,
    };

    // Comprehensive keyword mapping to understand what user is talking about
    const concernKeywords: Record<string, string[]> = {
      rizq: [
        "money",
        "job",
        "work",
        "income",
        "salary",
        "earn",
        "financial",
        "bills",
        "debt",
        "poor",
        "poverty",
        "sustenance",
        "provision",
        "rizq",
        "wealth",
        "rich",
        "afford",
        "pay",
        "unemployed",
        "employment",
        "career",
      ],
      health: [
        "health",
        "sick",
        "illness",
        "disease",
        "pain",
        "heal",
        "medical",
        "cure",
        "sickness",
        "ill",
        "hospital",
        "doctor",
        "treatment",
        "recovery",
        "well",
        "better",
        "ache",
        "headache",
        "fever",
        "weak",
        "tired",
      ],
      marriage: [
        "marriage",
        "mariage",
        "mirage",
        "marrage",
        "marraige",
        "spouse",
        "wife",
        "husband",
        "wedding",
        "marry",
        "partner",
        "nikah",
        "bride",
        "groom",
        "single",
        "lonely",
        "companion",
        "relationship",
        "good girl",
        "good boy",
      ],
      exams: [
        "exam",
        "test",
        "study",
        "education",
        "learning",
        "knowledge",
        "pass",
        "grade",
        "university",
        "school",
        "college",
        "result",
        "marks",
        "studying",
        "preparation",
      ],
      anxiety: [
        "anxiety",
        "worry",
        "stress",
        "fear",
        "nervous",
        "depressed",
        "sad",
        "worried",
        "afraid",
        "scared",
        "panic",
        "tension",
        "overwhelmed",
        "stressed",
      ],
      forgiveness: [
        "forgive",
        "sin",
        "mistake",
        "wrong",
        "repent",
        "guilt",
        "error",
        "fault",
        "pardon",
        "mercy",
        "regret",
        "transgression",
      ],
      guidance: [
        "guidance",
        "path",
        "right",
        "direction",
        "confused",
        "lost",
        "confusion",
        "help",
        "show",
        "direct",
        "decision",
        "choose",
        "what to do",
        "uncertain",
      ],
      protection: [
        "protect",
        "danger",
        "safe",
        "security",
        "harm",
        "evil",
        "enemy",
        "dangerous",
        "safety",
        "shield",
        "threat",
        "unsafe",
      ],
    };

    // Identify what the text is actually about
    for (const [concernType, keywords] of Object.entries(concernKeywords)) {
      const foundKeywords = keywords.filter(keyword => inputLower.includes(keyword));
      if (foundKeywords.length > 0) {
        textAnalysis.primaryConcerns.push(concernType);
        
        // Extract specific details
        if (concernType === "health") {
          if (inputLower.includes("headache")) textAnalysis.details.push("headache");
          if (inputLower.includes("pain")) textAnalysis.details.push("pain");
          if (inputLower.includes("fever")) textAnalysis.details.push("fever");
          if (inputLower.includes("tired") || inputLower.includes("weak")) textAnalysis.details.push("weakness");
        }
        if (concernType === "rizq") {
          if (inputLower.includes("job") || inputLower.includes("work") || inputLower.includes("employment")) {
            textAnalysis.specificSituations.push("seeking employment");
          }
          if (inputLower.includes("bills") || inputLower.includes("debt")) {
            textAnalysis.specificSituations.push("financial difficulties");
          }
        }
      }
    }

    // Detect emotional state
    if (inputLower.includes("worried") || inputLower.includes("worry") || inputLower.includes("anxious") || inputLower.includes("anxiety")) {
      textAnalysis.emotions.push("worry");
    }
    if (inputLower.includes("stressed") || inputLower.includes("stress") || inputLower.includes("overwhelmed")) {
      textAnalysis.emotions.push("stress");
    }
    if (inputLower.includes("sad") || inputLower.includes("depressed") || inputLower.includes("down")) {
      textAnalysis.emotions.push("sadness");
    }
    if (inputLower.includes("not feeling well") || inputLower.includes("not well") || inputLower.includes("unwell")) {
      textAnalysis.details.push("general illness");
    }

    // Detect if the dua is focused on someone else (mother, father, spouse, child, friend, deceased)
    if (
      inputLower.includes("my mother") ||
      inputLower.includes("my mom") ||
      inputLower.includes("ummi")
    ) {
      textAnalysis.focusPerson = "mother";
      if (!textAnalysis.allFocusPersons.includes("mother")) {
        textAnalysis.allFocusPersons.push("mother");
      }
    } else if (
      inputLower.includes("my father") ||
      inputLower.includes("my dad") ||
      inputLower.includes("abi")
    ) {
      textAnalysis.focusPerson = "father";
      if (!textAnalysis.allFocusPersons.includes("father")) {
        textAnalysis.allFocusPersons.push("father");
      }
    } else if (inputLower.includes("my parents")) {
      textAnalysis.focusPerson = "parents";
      if (!textAnalysis.allFocusPersons.includes("parents")) {
        textAnalysis.allFocusPersons.push("parents");
      }
    } else if (
      inputLower.includes("my wife") ||
      inputLower.includes("my husband") ||
      inputLower.includes("my spouse")
    ) {
      textAnalysis.focusPerson = "spouse";
      if (!textAnalysis.allFocusPersons.includes("spouse")) {
        textAnalysis.allFocusPersons.push("spouse");
      }
    } else if (
      inputLower.includes("my son") ||
      inputLower.includes("my daughter") ||
      inputLower.includes("my child") ||
      inputLower.includes("my kids") ||
      inputLower.includes("my children")
    ) {
      textAnalysis.focusPerson = "child";
      if (!textAnalysis.allFocusPersons.includes("child")) {
        textAnalysis.allFocusPersons.push("child");
      }
    } else if (
      inputLower.includes("my friend") ||
      inputLower.includes("my brother") ||
      inputLower.includes("my sister")
    ) {
      textAnalysis.focusPerson = "friend";
      if (!textAnalysis.allFocusPersons.includes("friend")) {
        textAnalysis.allFocusPersons.push("friend");
      }
    }

    if (
      inputLower.includes("who passed away") ||
      inputLower.includes("who has passed away") ||
      inputLower.includes("who died") ||
      inputLower.includes("who has died") ||
      inputLower.includes("late ")
    ) {
      textAnalysis.focusPerson = "deceased";
      if (!textAnalysis.allFocusPersons.includes("deceased")) {
        textAnalysis.allFocusPersons.push("deceased");
      }
    }

    // Detect whether the user seems to be explicitly asking forgiveness for sins
    if (
      inputLower.includes("forgive me") ||
      inputLower.includes("forgive my sins") ||
      inputLower.includes("i did a sin") ||
      inputLower.includes("i have sinned") ||
      inputLower.includes("haram") ||
      inputLower.includes("major sin") ||
      inputLower.includes("zina") ||
      inputLower.includes("porn") ||
      inputLower.includes("alcohol") ||
      inputLower.includes("drinking") ||
      inputLower.includes("gambling") ||
      inputLower.includes("wronged") ||
      inputLower.includes("i did wrong") ||
      inputLower.includes("bad habit")
    ) {
      textAnalysis.forgivenessRequested = true;
    }

    return textAnalysis;
  };

  // Function to analyze user input and generate meaningful dua
  const generatePersonalDua = (userInput: string, categories: string[], transcribedText: string = ""): string => {
    // FOCUSED/HYBRID APPROACH: Prioritize text input, use categories as supporting context
    
    // Combine manual input with transcribed text from voice recording
    const combinedInput = (userInput.trim() + " " + transcribedText.trim()).trim();
    
    if (!combinedInput && categories.length === 0) {
      return "";
    }

    const textAnalysis = analyzeTextForIntent(combinedInput);

    // STEP 2: Include ALL selected categories (focused/hybrid approach)
    // We'll prioritize text, but integrate all categories naturally
    const allCategories = [...categories]; // Use all selected categories
    const categoryMatchMap: Record<string, string> = {
      "Rizq": "rizq",
      "Health": "health",
      "Marriage": "marriage",
      "Exams": "exams",
      "Anxiety": "anxiety",
      "Forgiveness": "forgiveness",
      "Guidance": "guidance",
      "Protection": "protection",
    };

    // STEP 3: Build focused dua - prioritize text content, integrate categories naturally
    let duaText = "O Allah, ";

    // Opening: Acknowledge the situation from text (or categories if no text)
    const hasMultipleConcerns = textAnalysis.primaryConcerns.length > 1;
    const hasSpecificDetails = textAnalysis.details.length > 0 || textAnalysis.specificSituations.length > 0;
    const hasTextInput = combinedInput.trim().length > 0;
    
    if (hasSpecificDetails || hasMultipleConcerns) {
      duaText += "I come before You during this ";
      if (hasSpecificDetails && textAnalysis.specificSituations.length > 0) {
        duaText += textAnalysis.specificSituations[0];
        if (textAnalysis.details.length > 0) {
          duaText += ` while experiencing ${textAnalysis.details.join(" and ")}`;
        }
      } else if (textAnalysis.details.length > 0) {
        duaText += `time when I am experiencing ${textAnalysis.details.join(" and ")}`;
      } else {
        duaText += "difficult time";
      }
      duaText += ". ";
    } else if (textAnalysis.primaryConcerns.length > 0) {
      duaText += "I come before You with my need and request. ";
    } else if (!hasTextInput && allCategories.length > 0) {
      // No text input, but categories selected - start with categories
      duaText += "I come before You with my needs and requests. ";
    }

    // Build dua based on primary concerns from TEXT
    const duaRequests: string[] = [];

    // Handle Health concerns (prioritize if in text)
    if (textAnalysis.primaryConcerns.includes("health")) {
      if (textAnalysis.details.length > 0) {
        if (textAnalysis.details.includes("headache")) {
          duaRequests.push("I ask You for complete healing and relief from this headache that troubles me");
        } else if (textAnalysis.details.includes("pain")) {
          duaRequests.push("I ask You for relief from this pain and complete healing");
        } else {
          duaRequests.push("I ask You for complete healing and to restore my health and wellness");
        }
      } else {
        duaRequests.push("I ask You for complete healing and good health");
      }
    }

    // Handle Rizq/Job concerns (prioritize if in text)
    if (textAnalysis.primaryConcerns.includes("rizq")) {
      if (textAnalysis.specificSituations.includes("seeking employment")) {
        duaRequests.push("I ask You for a suitable job that provides halal rizq and eases my financial concerns");
      } else if (textAnalysis.specificSituations.includes("financial difficulties")) {
        duaRequests.push("I ask You for sufficient provision and ease in my financial matters");
      } else {
        duaRequests.push("I ask You for sufficient rizq and halal provision");
      }
    }

    // Handle Marriage (if in text)
    if (textAnalysis.primaryConcerns.includes("marriage")) {
      duaRequests.push("I ask You for a righteous spouse and a blessed marriage");
    }

    // Handle Exams (if in text)
    if (textAnalysis.primaryConcerns.includes("exams")) {
      duaRequests.push("I ask You for success in my studies and ease in my exams");
    }

    // Handle Forgiveness (if in text)
    if (textAnalysis.primaryConcerns.includes("forgiveness")) {
      duaRequests.push("I ask You for forgiveness and Your mercy");
    }

    // Handle Guidance (if in text)
    if (textAnalysis.primaryConcerns.includes("guidance")) {
      duaRequests.push("I ask You for guidance on the straight path and clarity in my decisions");
    }

    // Add primary requests to dua
    if (duaRequests.length > 0) {
      duaText += duaRequests.join(". ") + ". ";
    }

    // STEP 4: Integrate ALL selected categories naturally (focused/hybrid approach)
    // Categories enhance the dua based on text context, but all are included
    if (allCategories.length > 0) {
      const categoryAdditions: string[] = [];

      allCategories.forEach(cat => {
        const catKey = categoryMatchMap[cat] || cat.toLowerCase();
        const isInText = textAnalysis.primaryConcerns.includes(catKey);
        
        // If category matches text, enhance it contextually
        // If category doesn't match text, still include it but relate it to the situation
        switch(cat) {
          case "Protection":
            // Make protection context-aware based on text
            if (textAnalysis.primaryConcerns.includes("rizq")) {
              categoryAdditions.push("protect me in my search from difficulties and harm");
            } else if (textAnalysis.primaryConcerns.includes("health")) {
              categoryAdditions.push("protect my health from further harm and grant me healing");
            } else if (textAnalysis.primaryConcerns.length > 0) {
              categoryAdditions.push("protect me in all aspects of my life and from all harm");
            } else {
              categoryAdditions.push("protect me from all harm and evil");
            }
            break;
            
          case "Health":
            // Only add if not already covered by text
            if (!isInText) {
              if (textAnalysis.primaryConcerns.includes("rizq")) {
                categoryAdditions.push("grant me good health as I seek provision");
              } else {
                categoryAdditions.push("grant me good health and complete healing");
              }
            }
            break;
            
          case "Rizq":
            // Only add if not already covered by text
            if (!isInText) {
              if (textAnalysis.primaryConcerns.includes("health")) {
                categoryAdditions.push("grant me sufficient rizq and provision");
              } else {
                categoryAdditions.push("grant me sufficient halal rizq and provision");
              }
            }
            break;
            
          case "Marriage":
            if (isInText) {
              // Already covered in text section
            } else {
              categoryAdditions.push("grant me a righteous spouse and a blessed marriage");
            }
            break;
            
          case "Exams":
            if (isInText) {
              // Already covered in text section
            } else {
              categoryAdditions.push("grant me success in my studies and ease in my exams");
            }
            break;
            
          case "Anxiety":
            if (textAnalysis.emotions.includes("worry") || textAnalysis.emotions.includes("stress") || isInText) {
              categoryAdditions.push("grant me peace of mind and relief from all worries and anxiety");
            } else if (textAnalysis.primaryConcerns.length > 0) {
              categoryAdditions.push("grant me peace of mind and tranquility");
            }
            break;
            
          case "Forgiveness":
            if (isInText) {
              // Already covered in text section
            } else {
              categoryAdditions.push("grant me forgiveness and Your mercy");
            }
            break;
            
          case "Guidance":
            if (isInText) {
              // Already covered in text section
            } else {
              if (textAnalysis.primaryConcerns.length > 0) {
                categoryAdditions.push("guide me in all my affairs and decisions");
              } else {
                categoryAdditions.push("grant me guidance on the straight path");
              }
            }
            break;
        }
      });

      if (categoryAdditions.length > 0) {
        duaText += "O Allah, " + categoryAdditions.join(". ") + ". ";
      }
    }

    // Handle emotional needs naturally
    if (textAnalysis.emotions.length > 0 && !textAnalysis.primaryConcerns.includes("anxiety")) {
      if (textAnalysis.emotions.includes("worry") || textAnalysis.emotions.includes("stress")) {
        duaText += "Grant me peace of mind and relief from worry. ";
      } else if (textAnalysis.emotions.includes("sadness")) {
        duaText += "Grant me comfort and peace in my heart. ";
      }
    }

    // Closing
    duaText += "Grant me what is best for me in this world and the next. Accept my dua and answer it in the way that is most beneficial for me.";

    return duaText;
  };

  // Function to find the most relevant category based on user input (prioritizing personal dua input)
  const findMostRelevantCategory = (): string => {
    // Prioritize matching based on personal dua input if available
    if (personalDuaInput.trim().length > 0) {
      const inputLower = personalDuaInput.toLowerCase();
      const categoryKeywords: Record<string, string[]> = {
        Rizq: ["rizq", "money", "sustenance", "provision", "job", "income", "financial", "wealth", "poverty", "poor", "rich", "earn", "salary"],
        Health: ["health", "sick", "illness", "disease", "pain", "heal", "medical", "cure", "sickness", "ill", "hospital", "doctor"],
        Marriage: ["marriage", "spouse", "wife", "husband", "wedding", "marry", "partner", "nikah", "bride", "groom"],
        Exams: ["exam", "test", "study", "education", "learning", "knowledge", "exam", "test", "pass", "grade", "university", "school"],
        Anxiety: ["anxiety", "worry", "stress", "fear", "nervous", "depressed", "sad", "worried", "afraid", "scared", "panic"],
        Forgiveness: ["forgive", "sin", "mistake", "wrong", "repent", "guilt", "error", "fault", "pardon", "mercy"],
        Guidance: ["guidance", "path", "right", "direction", "confused", "lost", "confusion", "help", "show", "direct"],
        Protection: ["protect", "danger", "safe", "security", "harm", "evil", "enemy", "dangerous", "safety", "shield"],
      };

      // Count matches for each category
      const categoryScores: Record<string, number> = {};
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        const matches = keywords.filter(keyword => inputLower.includes(keyword)).length;
        if (matches > 0) {
          categoryScores[category] = matches;
        }
      }

      // Return category with highest score
      if (Object.keys(categoryScores).length > 0) {
        const bestMatch = Object.entries(categoryScores).reduce((a, b) => 
          a[1] > b[1] ? a : b
        );
        return bestMatch[0];
      }
    }
    
    // If no match from personal input, use first selected category
    if (selectedCategories.length > 0) {
      return selectedCategories[0];
    }

    // Default to first category
    return categories[0];
  };

  const uiCategoryToNeedCategory: Record<string, NeedCategory> = {
    Rizq: "rizq",
    Health: "health",
    Marriage: "marriage",
    Exams: "exams",
    Anxiety: "general",
    Forgiveness: "forgiveness",
    Guidance: "guidance",
    Protection: "protection",
  };

  const detectUserIntent = (
    selectedCategoriesForIntent: string[],
    personalText: string,
    transcribedTextForIntent: string
  ): UserIntent => {
    const combinedInput = (personalText.trim() + " " + transcribedTextForIntent.trim()).trim();
    const textAnalysis = analyzeTextForIntent(combinedInput);

    // 1. Collect NeedCategories from UI selections
    const initialNeeds: NeedCategory[] = [];
    for (const uiCat of selectedCategoriesForIntent) {
      const mapped = uiCategoryToNeedCategory[uiCat];
      if (mapped && !initialNeeds.includes(mapped)) {
        initialNeeds.push(mapped);
      }
    }

    // 2. Add categories inferred from text analysis
    for (const concern of textAnalysis.primaryConcerns) {
      let mapped: NeedCategory | null = null;
      switch (concern) {
        case "rizq":
          mapped = "rizq";
          break;
        case "health":
          mapped = "health";
          break;
        case "marriage":
          mapped = "marriage";
          break;
        case "exams":
          mapped = "exams";
          break;
        case "anxiety":
          mapped = "general";
          break;
        case "forgiveness":
          mapped = "forgiveness";
          break;
        case "guidance":
          mapped = "guidance";
          break;
        case "protection":
          mapped = "protection";
          break;
        default:
          mapped = null;
      }
      if (mapped && !initialNeeds.includes(mapped)) {
        initialNeeds.push(mapped);
      }
    }

    // 3. Choose primaryCategory (prioritise strong text signals where appropriate)
    let primaryCategory: NeedCategory = "general";
    if (initialNeeds.length > 0) {
      // If text clearly indicates marriage, prioritise it
      if (textAnalysis.primaryConcerns.includes("marriage")) {
        primaryCategory = "marriage";
      }
      // If text clearly indicates health, prioritise it
      else if (textAnalysis.primaryConcerns.includes("health")) {
        primaryCategory = "health";
      }
      // If text clearly indicates rizq/provision, prioritise it
      else if (textAnalysis.primaryConcerns.includes("rizq")) {
        primaryCategory = "rizq";
      }
      // If forgiveness is present and text shows guilt/sadness/worry, prioritise forgiveness
      else if (
        initialNeeds.includes("forgiveness") &&
        textAnalysis.emotions.some((e) => e === "sadness" || e === "worry" || e === "guilt")
      ) {
        primaryCategory = "forgiveness";
      } else {
        primaryCategory = initialNeeds[0];
      }
    }

    const secondaryCategories = initialNeeds.filter((c) => c !== primaryCategory);

    // 4. Map textAnalysis.emotions to EmotionalTheme[]
    const emotionalThemes: EmotionalTheme[] = [];
    if (textAnalysis.emotions.includes("worry") || textAnalysis.emotions.includes("stress")) {
      if (!emotionalThemes.includes("stress")) emotionalThemes.push("stress");
    }
    if (textAnalysis.emotions.includes("sadness") || textAnalysis.emotions.includes("loss")) {
      if (!emotionalThemes.includes("loss")) emotionalThemes.push("loss");
    }
    if (textAnalysis.emotions.includes("guilt")) {
      if (!emotionalThemes.includes("guilt")) emotionalThemes.push("guilt");
    }

    // 5. Derive hereafter tone
    let hereafterTone: HereafterTone = "balanced";
    if (emotionalThemes.includes("loss") || emotionalThemes.includes("guilt") || emotionalThemes.includes("stress")) {
      hereafterTone = "fear";
    } else if (emotionalThemes.includes("gratitude") || emotionalThemes.includes("hope")) {
      hereafterTone = "hope";
    }

    return {
      primaryCategory,
      secondaryCategories,
      emotionalThemes,
      focusPerson: textAnalysis.focusPerson,
      allNeeds: initialNeeds,
      allFocusPersons: textAnalysis.allFocusPersons,
      forgivenessRequested: textAnalysis.forgivenessRequested,
      hereafterTone,
    };
  };

  const generateDua = (): GeneratedDua => {
    // Detect high-level user intent (for future structured dua generation)
    const intent = detectUserIntent(selectedCategories, personalDuaInput, transcribedText);
    console.log("Detected user intent:", intent);

    // Find the most relevant category for prophetic story and problem-based content
    const relevantCategory = findMostRelevantCategory();

    // 1. PRAISE ALLAH
    const praise: ThreeLayer = {
      ar: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
      transliteration: "Alhamdulillahi rabbi al-'alamin",
      en: "All praise is due to Allah, Lord of the worlds.",
    };

    // 2. SALĀH UPON PROPHET MUHAMMAD ﷺ
    const salawat1: ThreeLayer = {
      ar: "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ",
      transliteration: "Allahumma salli 'ala Muhammad wa 'ala ali Muhammad, kama sallayta 'ala Ibrahim wa 'ala ali Ibrahim",
      en: "O Allah, send blessings upon Muhammad and the family of Muhammad, as You sent blessings upon Ibrahim and the family of Ibrahim.",
    };

    // 3. ISM-UL-A'ẒAM DUʿĀʾ (FIXED WORDING)
    const ismAzam: ThreeLayer = {
      ar: `اللَّهُمَّ إِنِّي أَسْأَلُكَ بِأَنَّكَ أَنْتَ اللَّهُ،
لَا إِلَٰهَ إِلَّا أَنْتَ،
الْأَحَدُ، الصَّمَدُ،
الَّذِي لَمْ يَلِدْ وَلَمْ يُولَدْ،
وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ`,
      transliteration: `Allahumma inni as'aluka bi-annaka Anta Allah,
La ilaha illa Anta,
Al-Ahad, As-Samad,
Alladhi lam yalid wa lam yoolad,
wa lam yakun lahu kufuwan ahad`,
      en: `O Allah, I ask You by the fact that You are Allah.
There is no deity except You.
The One, the Self-Sufficient.
He neither begets nor is born,
and there is none comparable to Him.`,
    };

    // 4. CALLING ALLAH BY RELEVANT NAMES
    let collectedNames: string[] = [];
    selectedCategories.forEach((category) => {
      const names = categoryToNames[category as keyof typeof categoryToNames];
      if (Array.isArray(names)) {
        collectedNames.push(...names);
      }
    });

    const uniqueNames = Array.from(new Set(collectedNames));

    // Build transliteration with meanings
    const transliterationWithMeanings = uniqueNames.length > 0
      ? `Ya Allah, ${uniqueNames.map((name) => {
          const meaning = nameMeanings[name as keyof typeof nameMeanings] || name;
          return `Ya ${name} (${meaning})`;
        }).join(", ")}`
      : "Ya Allah";
    
    const names: ThreeLayer = {
      ar: uniqueNames.length > 0
        ? `يَا اللَّهُ، ${uniqueNames.map((name) => `يَا ${name}`).join("، ")}`
        : "يَا اللَّهُ",
      transliteration: transliterationWithMeanings,
      en: uniqueNames.length > 0
        ? `O Allah, I call upon You by Your beautiful Names: ${uniqueNames.join(", ")}.`
        : "O Allah, I call upon You.",
    };

    // 5. HUMILITY & WEAKNESS
    const humility: ThreeLayer = {
      ar: `إِنِّي ضَعِيفٌ وَأَنْتَ الْقَوِيُّ،
وَإِنِّي فَقِيرٌ إِلَى رَحْمَتِكَ،
وَأَنْتَ الْغَنِيُّ الْحَمِيدُ`,
      transliteration: `Inni da'ifun wa anta al-qawiyy,
wa inni faqirun ila rahmatika,
wa anta al-ghaniyyu al-hamid`,
      en: `I am weak and You are the All-Powerful.
I am in need of Your mercy,
and You are the Self-Sufficient, the Praiseworthy.`,
    };

    // 6. USER'S PERSONAL DUʿĀʾ SECTION (generated based on user input, transcribed text, and categories)
    const personalDua = generatePersonalDua(personalDuaInput, selectedCategories, transcribedText);

    // 7. CLEAR REQUEST
    const requestEn = selectedCategories.length > 0
      ? `Grant me goodness and ease regarding my needs: ${selectedCategories.join(", ")}.
Make it beneficial for my dunya and my akhirah.`
      : "Grant me goodness and ease in all my affairs. Make it beneficial for my dunya and my akhirah.";
    
    const request: ThreeLayer = {
      ar: `اللَّهُمَّ أَعْطِنِي الْخَيْرَ وَالْيُسْرَ فِي حَاجَتِي،
وَاجْعَلْهُ نَافِعًا لِي فِي دُنْيَايَ وَآخِرَتِي`,
      transliteration: `Allahumma a'tini al-khayra wa al-yusra fi hajati,
wa-j'alhu nafi'an li fi dunyaya wa akhirati`,
      en: requestEn,
    };

    // 8. TAWAKKUL (TRUST IN ALLAH)
    const trust: ThreeLayer = {
      ar: `أَتَوَكَّلُ عَلَى حِكْمَتِكَ وَقَضَائِكَ،
أَنْتَ أَعْلَمُ بِمَا هُوَ خَيْرٌ لِي،
وَأَثِقُ بِكَ ثِقَةً كَامِلَةً`,
      transliteration: `Aatawakkalu 'ala hikmatika wa qada'ika,
anta a'lamu bi-ma huwa khayrun li,
wa athiq bi-ka thiqatan kamilatan`,
      en: "I trust Your wisdom and decree. You know what is best for me, and I place my trust in You.",
    };

    // 9. SALĀH AGAIN
    const salawat2: ThreeLayer = {
      ar: "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ",
      transliteration: "Allahumma salli 'ala Muhammad wa 'ala ali Muhammad, kama sallayta 'ala Ibrahim wa 'ala ali Ibrahim, innaka hamidun majid",
      en: "O Allah, send blessings upon Muhammad and the family of Muhammad, as You sent blessings upon Ibrahim and the family of Ibrahim. Indeed, You are Praiseworthy and Glorious.",
    };

    // 10. ĀMĪN
    const ameen: ThreeLayer = {
      ar: "آمِينَ",
      transliteration: "Ameen",
      en: "Ameen (O Allah, accept this supplication).",
    };

    // Build the new structured dua model (stored separately for future UI updates)
    const structured = buildStructuredDua(
      intent,
      {
        praise,
        salawat1,
        ismAzam,
        humility,
        salawat2,
      },
      personalDua
    );
    setStructuredDua(structured);
    console.log("Structured dua (new model):", structured);

    // PROBLEM-BASED DHIKR & DUʿĀʾ
    const problemDhikrData = problemBasedDhikr[relevantCategory as keyof typeof problemBasedDhikr];
    const problemBasedDhikrList: ThreeLayer[] = problemDhikrData?.dhikr || [];
    const problemBasedDuaList: ThreeLayer[] = problemDhikrData?.dua || [];

    // PROPHETIC STORY
    const storyData = propheticStories[relevantCategory as keyof typeof propheticStories];
    const propheticStory = storyData
      ? {
          prophet: storyData.prophet,
          story: storyData.story,
          incident: storyData.incident,
          outcome: storyData.outcome,
        }
      : {
          prophet: "Musa (AS)",
          story: {
            ar: "",
            transliteration: "",
            en: "",
          },
          incident: {
            ar: "",
            transliteration: "",
            en: "",
          },
          outcome: {
            ar: "",
            transliteration: "",
            en: "",
          },
        };

    return {
      praise,
      salawat1,
      ismAzam,
      names,
      humility,
      personalDua: personalDua,
      request,
      trust,
      salawat2,
      ameen,
      problemBasedDhikr: problemBasedDhikrList,
      problemBasedDua: problemBasedDuaList,
      propheticStory,
    };
  };

  const handleGenerateDua = () => {
    const dua = generateDua();
    setGeneratedDua(dua);
    console.log("Generated dua:", dua);
  };

  const handleReset = () => {
    setSelectedCategories([]);
    setPersonalDuaInput("");
    setGeneratedDua(null);
    setIsSaved(false);
  };


  // Load saved duas from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("savedDuas");
    if (saved) {
      try {
        setSavedDuas(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading saved duas:", e);
      }
    }
  }, []);

  // Check if current dua is saved
  useEffect(() => {
    if (generatedDua) {
      const currentDuaId = generateDuaId(generatedDua, personalDuaInput, selectedCategories);
      const isCurrentlySaved = savedDuas.some(dua => dua.id === currentDuaId);
      setIsSaved(isCurrentlySaved);
    } else {
      setIsSaved(false);
    }
  }, [generatedDua, savedDuas, personalDuaInput, selectedCategories]);

  // Generate unique ID for dua
  const generateDuaId = (dua: GeneratedDua, input: string, cats: string[]): string => {
    return `${Date.now()}-${input.substring(0, 20)}-${cats.join(",")}`;
  };

  // Save dua to localStorage
  const handleSaveDua = () => {
    if (!generatedDua) return;
    
    // Check if already saved
    const currentDuaId = generateDuaId(generatedDua, personalDuaInput, selectedCategories);
    const existingDua = savedDuas.find(dua => dua.id === currentDuaId);
    
    if (existingDua) {
      // Already saved, just show modal to update name if needed
      setShowNameModal(true);
      setDuaName(existingDua.name || "");
    } else {
      // New save - show modal to get name
      setShowNameModal(true);
      // Generate default name based on categories or user input
      const defaultName = selectedCategories.length > 0 
        ? `${selectedCategories.join(", ")} Dua`
        : personalDuaInput.substring(0, 30) || "My Dua";
      setDuaName(defaultName);
    }
  };

  // Confirm save with name
  const confirmSaveDua = () => {
    if (!generatedDua) return;

    const duaId = generateDuaId(generatedDua, personalDuaInput, selectedCategories);
    const existingIndex = savedDuas.findIndex(dua => dua.id === duaId);
    
    const duaToSave = {
      ...generatedDua,
      id: duaId,
      savedAt: existingIndex >= 0 ? savedDuas[existingIndex].savedAt : new Date().toISOString(),
      userInput: personalDuaInput,
      categories: [...selectedCategories],
      name: duaName.trim() || "My Dua",
    };

    let updatedSaved;
    if (existingIndex >= 0) {
      // Update existing
      updatedSaved = [...savedDuas];
      updatedSaved[existingIndex] = duaToSave;
    } else {
      // Add new
      updatedSaved = [...savedDuas, duaToSave];
    }
    
    setSavedDuas(updatedSaved);
    localStorage.setItem("savedDuas", JSON.stringify(updatedSaved));
    setIsSaved(true);
    setShowNameModal(false);
    setDuaName("");
  };

  // Remove dua from saved
  const handleUnsaveDua = () => {
    if (!generatedDua) return;

    const currentDuaId = generateDuaId(generatedDua, personalDuaInput, selectedCategories);
    const updatedSaved = savedDuas.filter(dua => dua.id !== currentDuaId);
    setSavedDuas(updatedSaved);
    localStorage.setItem("savedDuas", JSON.stringify(updatedSaved));
    setIsSaved(false);
  };

  // Toggle card expansion for "Why Not Answered" section
  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  // Get source badge component
  const getSourceBadge = (source: "quran" | "hadith" | "scholarly") => {
    switch (source) {
      case "quran":
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">📖 Qur'an</span>;
      case "hadith":
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">📖 Hadith</span>;
      case "scholarly":
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">🧠 Scholars</span>;
    }
  };

  // Delete saved dua
  const handleDeleteSavedDua = (id: string) => {
    const updatedSaved = savedDuas.filter(dua => dua.id !== id);
    setSavedDuas(updatedSaved);
    localStorage.setItem("savedDuas", JSON.stringify(updatedSaved));
  };

  // Start editing name
  const handleStartEditName = (id: string, currentName: string) => {
    setEditingDuaId(id);
    setEditingName(currentName);
  };

  // Save edited name
  const handleSaveName = (id: string) => {
    const updatedSaved = savedDuas.map(dua => 
      dua.id === id ? { ...dua, name: editingName.trim() || "My Dua" } : dua
    );
    setSavedDuas(updatedSaved);
    localStorage.setItem("savedDuas", JSON.stringify(updatedSaved));
    setEditingDuaId(null);
    setEditingName("");
  };

  // Cancel editing name
  const handleCancelEditName = () => {
    setEditingDuaId(null);
    setEditingName("");
  };


  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo Section */}
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md flex-shrink-0">
                <span className="text-white text-xl font-bold">DC</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 whitespace-nowrap">Dua Companion</h1>
            </div>
            
            {/* Navigation Bar */}
            <nav className="flex items-center gap-1 flex-1 justify-end flex-wrap">
              {/* Primary Navigation Items */}
              <button
                onClick={() => {
                  setViewMode("welcome");
                  setMoreMenuOpen(false);
                }}
                className={`px-3 py-2 text-sm md:text-base font-medium transition-colors duration-200 rounded-lg whitespace-nowrap ${
                  viewMode === "welcome"
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                }`}
                title="Welcome"
              >
                Welcome
              </button>
              <button
                onClick={() => {
                  setDisclaimerOpen(!disclaimerOpen);
                  setMoreMenuOpen(false);
                }}
                className="px-3 py-2 text-sm md:text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 transition-colors duration-200 rounded-lg whitespace-nowrap"
                title="Disclaimers"
              >
                Disclaimers
              </button>
              <button
                onClick={() => {
                  setViewMode(viewMode === "best-times" ? "welcome" : "best-times");
                  if (viewMode !== "best-times") setBestTimesSubsection("intro");
                  setMoreMenuOpen(false);
                }}
                className={`px-3 py-2 text-sm md:text-base font-medium transition-colors duration-200 rounded-lg whitespace-nowrap ${
                  viewMode === "best-times"
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                }`}
                title="Times & Situations When Dua Is More Likely to Be Accepted"
              >
                Best Times
              </button>
              <button
                onClick={() => {
                  setViewMode(viewMode === "saved" ? "welcome" : "saved");
                  setMoreMenuOpen(false);
                }}
                className={`relative px-3 py-2 text-sm md:text-base font-medium transition-colors duration-200 rounded-lg whitespace-nowrap ${
                  viewMode === "saved"
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                }`}
                title="Saved Duas"
              >
                Saved Duas
                {savedDuas.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                    {savedDuas.length}
                  </span>
                )}
              </button>

              {/* More Dropdown Menu */}
              <div className="relative">
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={`px-3 py-2 text-sm md:text-base font-medium transition-colors duration-200 rounded-lg flex items-center gap-1 whitespace-nowrap ${
                    moreMenuOpen
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                  }`}
                  title="More Options"
                >
                  More
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-3 w-3 md:h-4 md:w-4 transition-transform duration-200 ${moreMenuOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {moreMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-fadeIn">
                    <button
                      onClick={() => {
                        if (viewMode === "why-not-answered") {
                          setViewMode("welcome");
                          setWhyNotAnsweredSubsection("intro");
                        } else {
                          setViewMode("why-not-answered");
                          setWhyNotAnsweredSubsection("intro");
                        }
                        setMoreMenuOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors duration-150 ${
                        viewMode === "why-not-answered"
                          ? "bg-indigo-50 text-indigo-600"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Why Dua Not Answered
                    </button>
                  </div>
                )}
              </div>

              {/* Structure Your Dua CTA Button (Like BrandSwift's "Get A Proposal") */}
              <button
                onClick={() => {
                  setViewMode("generate");
                  setMoreMenuOpen(false);
                }}
                className="ml-1 px-4 md:px-6 py-2 text-xs md:text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 whitespace-nowrap"
                title="Structure Your Dua"
              >
                Structure Your Dua
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Close dropdown when clicking outside */}
      {moreMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMoreMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        <div className="w-full bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-gray-100">
        
        {/* Welcome Page (Landing Page) */}
        {viewMode === "welcome" && (
          <div className="mt-8">
            {/* Hero Section */}
            <div className="text-center mb-12 animate-fadeIn">
              {/* Welcome Title */}
              <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Welcome to Dua Friend
              </h1>

              {/* Subtitle */}
              <p className="text-gray-600 text-lg md:text-xl mb-3 font-medium">
                A gentle assistant for Islamic supplication
              </p>

              {/* Main Description */}
              <p className="text-gray-700 text-base md:text-lg mb-8 leading-relaxed max-w-2xl mx-auto">
                Help you make Dua with sincerity, adab, and trust in Allah. Express your needs in your own words and receive a complete, structured dua following authentic Islamic practices.
              </p>
            </div>

            {/* Key Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 animate-fadeIn">
              {/* Feature 1: Structured Dua */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 shadow-lg border-2 border-indigo-100 hover:border-indigo-300 transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Structured Dua</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Follows the mandatory Islamic dua structure with proper adab, including praise, salawat, and tawakkul.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 2: Personal Expression */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-lg border-2 border-purple-100 hover:border-purple-300 transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Personal Expression</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Express your dua in your own words. Type or use voice recording to describe your needs naturally.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 3: Problem-Based Guidance */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 shadow-lg border-2 border-emerald-100 hover:border-emerald-300 transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Problem-Based Guidance</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Receive relevant dhikr, dua, and Qurʾānic motivation with prophetic stories that relate to your situation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 4: Save & Organize */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 shadow-lg border-2 border-amber-100 hover:border-amber-300 transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Save & Organize</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Save your duas with custom names and access them anytime. Organize multiple duas for different needs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* How It Works Section */}
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 md:p-10 shadow-xl border-2 border-indigo-100 mb-12 animate-fadeIn">
              <h2 className="text-3xl font-extrabold text-center text-gray-800 mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                How It Works
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Step 1 */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg text-white text-2xl font-bold">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Select Categories</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Choose from categories like Rizq, Health, Marriage, Protection, and more that relate to your needs.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg text-white text-2xl font-bold">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Express Your Dua</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Write or speak your dua in your own words. Describe your situation, needs, or problems naturally.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg text-white text-2xl font-bold">
                    3
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Receive Structured Dua</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Get a complete dua following Islamic structure, with relevant guidance, dhikr, and Qurʾānic motivation.
                  </p>
                </div>
              </div>
            </div>

            {/* Trust & Transparency Note */}
            <div className="text-center mb-8 animate-fadeIn">
              <p className="text-gray-500 text-sm md:text-base italic max-w-2xl mx-auto leading-relaxed">
                <span className="font-semibold text-gray-600">Important:</span> This app helps you organize Dua. It does not replace scholars, fatwā, or personal worship. Assistance only. Reliance is upon Allah alone.
              </p>
            </div>
          </div>
        )}

        {viewMode === "generate" && (
          <>
            <p className="text-gray-600 text-center mb-8 text-lg">
              Select categories and express your dua in your own words
        </p>

        {/* Categories section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {categories.map((category) => (
            <label
              key={category}
              className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                selectedCategories.includes(category)
                  ? "border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-md"
                  : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="checkbox"
                name="category"
                value={category}
                checked={selectedCategories.includes(category)}
                onChange={(event) => handleCategoryChange(category, event.target.checked)}
                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
              />
              <span className={`text-lg font-semibold ${
                selectedCategories.includes(category) ? "text-indigo-700" : "text-gray-700"
              }`}>
                {category}
              </span>
              {selectedCategories.includes(category) && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </label>
          ))}
        </div>

        {/* Personal Dua Input */}
        <div className="mb-6">
          <label htmlFor="personalDua" className="block text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Express your dua or problem in your own language:
          </label>
          
          {/* Recording Controls */}
          <div className="flex gap-2 mb-3">
            {!isRecording ? (
              <button
                type="button"
                onClick={handleStartRecording}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 font-medium"
                title="Start Voice Recording"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Record Voice
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopRecording}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 font-medium animate-pulse"
                title="Stop Recording"
              >
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span>Stop Recording</span>
              </button>
            )}
            {transcribedText && (
              <button
                type="button"
                onClick={handleClearRecording}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 text-sm font-medium"
                title="Clear Recording"
              >
                Clear Recording
              </button>
            )}
          </div>

          {isRecording && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm animate-pulse">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Recording... Speak now. Your words will appear in the text box below.</span>
            </div>
          )}

          <textarea
            id="personalDua"
            value={personalDuaInput}
            onChange={(e) => setPersonalDuaInput(e.target.value)}
            placeholder="Write your dua, problem, or need here in your own words... Or click 'Record Voice' above to speak it instead."
            className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-y min-h-[120px] text-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
          />
          
          {transcribedText && (
            <p className="mt-2 text-xs text-gray-500 italic flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Transcribed: "{transcribedText}"
            </p>
          )}
        </div>

        {/* Structure Your Dua and Reset buttons */}
        <div className="flex gap-4">
        <button
          type="button"
          onClick={handleGenerateDua}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed transform hover:scale-105 flex items-center justify-center gap-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          Structure Your Dua
        </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-gray-600 hover:to-gray-700 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        </div>

        {/* Display the generated dua (structured model) */}
        {viewMode === "generate" && structuredDua && generatedDua && (
          <div className="mt-8 p-6 md:p-8 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-2 border-green-300 rounded-2xl shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                  Your Dua
                </h2>
              </div>
              <button
                type="button"
                onClick={isSaved ? handleUnsaveDua : handleSaveDua}
                className={`p-3 rounded-xl transition-all duration-300 transform hover:scale-110 shadow-lg ${
                  isSaved
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100 border-2 border-gray-300"
                }`}
                title={isSaved ? "Unsave Dua" : "Save Dua"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill={isSaved ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </button>
            </div>

            {/* Name Modal */}
            {showNameModal && (
              <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border-2 border-indigo-100 transform animate-slideIn">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Name Your Dua
                    </h3>
                  </div>
                  <input
                    type="text"
                    value={duaName}
                    onChange={(e) => setDuaName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmSaveDua();
                      if (e.key === "Escape") {
                        setShowNameModal(false);
                        setDuaName("");
                      }
                    }}
                    placeholder="Enter a name for this dua..."
                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 mb-6 text-lg font-medium shadow-md transition-all duration-200"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={confirmSaveDua}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNameModal(false);
                        setDuaName("");
                      }}
                      className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-gray-500 hover:to-gray-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-green-200 text-gray-800 leading-relaxed space-y-8 shadow-inner">
              
              {/* 1. Praise Allah */}
              <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-l-4 border-blue-500">
                <h3 className="text-lg font-bold text-indigo-700 mb-3 flex items-center gap-2">
                  <span className="bg-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">1</span>
                  Praise Allah
                </h3>
                <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                  {generatedDua.praise.ar}
                </div>
                <div className="text-gray-700 italic">
                  {generatedDua.praise.transliteration}
                </div>
                <div className="text-gray-600">
                  {generatedDua.praise.en}
                </div>
              </div>

              {/* 2. Salāh upon Prophet Muhammad ﷺ */}
              <div className="space-y-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-l-4 border-purple-500">
                <h3 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
                  <span className="bg-purple-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">2</span>
                  Salāh upon Prophet Muhammad ﷺ
                </h3>
                <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                  {generatedDua.salawat1.ar}
                </div>
                <div className="text-gray-700 italic">
                  {generatedDua.salawat1.transliteration}
                </div>
                <div className="text-gray-600">
                  {generatedDua.salawat1.en}
                </div>
              </div>

              {/* 3. Ism-ul-A'ẓam Dua */}
              <div className="space-y-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-l-4 border-emerald-500">
                <h3 className="text-lg font-bold text-emerald-700 mb-3 flex items-center gap-2">
                  <span className="bg-emerald-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">3</span>
                  Ism-ul-A'ẓam Dua
                </h3>
                <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                  {generatedDua.ismAzam.ar}
                </div>
                <div className="text-gray-700 italic">
                  {generatedDua.ismAzam.transliteration}
                </div>
                <div className="text-gray-600">
                  {generatedDua.ismAzam.en}
                </div>
              </div>

              {/* 4. Calling Allah by relevant Names */}
              <div className="space-y-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-l-4 border-amber-500">
                <h3 className="text-lg font-bold text-amber-700 mb-3 flex items-center gap-2">
                  <span className="bg-amber-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">4</span>
                  Calling Allah by Relevant Names
                </h3>
                  <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                    {generatedDua.names.ar}
                  </div>
                  <div className="text-gray-700 italic">
                    {generatedDua.names.transliteration}
                  </div>
                  <div className="text-gray-600">
                    {generatedDua.names.en}
                  </div>
                </div>

              {/* 5. Humility & weakness */}
              <div className="space-y-3 p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border-l-4 border-rose-500">
                <h3 className="text-lg font-bold text-rose-700 mb-3 flex items-center gap-2">
                  <span className="bg-rose-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">5</span>
                  Humility & Weakness
                </h3>
                <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                  {generatedDua.humility.ar}
                </div>
                <div className="text-gray-700 italic">
                  {generatedDua.humility.transliteration}
                </div>
                <div className="text-gray-600">
                  {generatedDua.humility.en}
                </div>
              </div>

              {/* 6. User's personal Dua section */}
              {generatedDua.personalDua && (
                <div className="space-y-3 p-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl border-l-4 border-sky-500">
                  <h3 className="text-lg font-bold text-sky-700 mb-3 flex items-center gap-2">
                    <span className="bg-sky-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">6</span>
                    Your Personal Dua
                  </h3>
                  <div className="text-gray-700 font-medium bg-white p-4 rounded-lg border-2 border-sky-200 shadow-sm">
                    {generatedDua.personalDua}
                  </div>
                </div>
              )}

              {/* 7. Clear request */}
              <div className="space-y-3 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border-l-4 border-violet-500">
                <h3 className="text-lg font-bold text-violet-700 mb-3 flex items-center gap-2">
                  <span className="bg-violet-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">7</span>
                  Clear Request
                </h3>
                <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                  {generatedDua.request.ar}
                </div>
                <div className="text-gray-700 italic">
                  {generatedDua.request.transliteration}
                </div>
                <div className="text-gray-600">
                  {generatedDua.request.en}
                </div>
              </div>

              {/* 8. Tawakkul (trust in Allah) */}
              <div className="space-y-3 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border-l-4 border-indigo-500">
                <h3 className="text-lg font-bold text-indigo-700 mb-3 flex items-center gap-2">
                  <span className="bg-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">8</span>
                  Tawakkul (Trust in Allah)
                </h3>
                <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                  {generatedDua.trust.ar}
                </div>
                <div className="text-gray-700 italic">
                  {generatedDua.trust.transliteration}
                </div>
                <div className="text-gray-600">
                  {generatedDua.trust.en}
                </div>
              </div>

              {/* 9. Salāh again */}
              <div className="space-y-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-l-4 border-purple-500">
                <h3 className="text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
                  <span className="bg-purple-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">9</span>
                  Salāh upon Prophet Muhammad ﷺ Again
                </h3>
                <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                  {generatedDua.salawat2.ar}
                </div>
                <div className="text-gray-700 italic">
                  {generatedDua.salawat2.transliteration}
                </div>
                <div className="text-gray-600">
                  {generatedDua.salawat2.en}
                </div>
              </div>

              {/* 10. Āmīn */}
              <div className="space-y-3 p-4 pt-6 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border-l-4 border-green-500 border-t-4 mt-4">
                <h3 className="text-lg font-bold text-green-700 mb-3 flex items-center gap-2">
                  <span className="bg-green-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">10</span>
                  Āmīn
                </h3>
                <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                  {generatedDua.ameen.ar}
                </div>
                <div className="text-gray-700 italic text-lg">
                  {generatedDua.ameen.transliteration}
                </div>
                <div className="text-gray-600">
                  {generatedDua.ameen.en}
                </div>
              </div>
            </div>

            {/* Problem-Based Dhikr, Dua & Qurʾānic Motivation */}
            <div className="mt-8 bg-white p-6 rounded-lg border border-green-300">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                Problem-Based Dhikr, Dua & Qurʾānic Motivation
              </h2>

              {/* Relevant Dhikr */}
              {generatedDua.problemBasedDhikr.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-indigo-700 mb-3">Relevant Dhikr (Remembrance)</h3>
                  {generatedDua.problemBasedDhikr.map((dhikr, index) => (
                    <div key={index} className="mb-4 space-y-2 p-4 bg-blue-50 rounded-lg">
                <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                        {dhikr.ar}
                </div>
                <div className="text-gray-700 italic">
                        {dhikr.transliteration}
                </div>
                <div className="text-gray-600">
                        {dhikr.en}
                </div>
              </div>
                  ))}
            </div>
              )}

              {/* Relevant Dua */}
              {generatedDua.problemBasedDua.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-indigo-700 mb-3">Relevant Dua</h3>
                  {generatedDua.problemBasedDua.map((dua, index) => (
                    <div key={index} className="mb-4 space-y-2 p-4 bg-green-50 rounded-lg">
                      <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                        {dua.ar}
                      </div>
                      <div className="text-gray-700 italic">
                        {dua.transliteration}
                      </div>
                      <div className="text-gray-600">
                        {dua.en}
                      </div>
                    </div>
                  ))}
          </div>
        )}

              {/* Prophetic Story */}
              {generatedDua.propheticStory.story.ar && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-indigo-700 mb-3">
                    Qurʾānic Motivation: The Story of {generatedDua.propheticStory.prophet}
                  </h3>

                  {/* Quranic Verse */}
                  <div className="mb-4 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                    <h4 className="font-semibold text-gray-800 mb-2">Qurʾānic Verse:</h4>
                    <div dir="rtl" className="text-right text-lg font-bold text-gray-900 mb-2">
                      {generatedDua.propheticStory.story.ar}
                    </div>
                    <div className="text-gray-700 italic mb-2">
                      {generatedDua.propheticStory.story.transliteration}
                    </div>
                    <div className="text-gray-600">
                      {generatedDua.propheticStory.story.en}
                    </div>
                  </div>

                  {/* Incident/Story */}
                  <div className="mb-4 p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">The Story:</h4>
                    <div dir="rtl" className="text-right text-lg font-bold text-gray-900 mb-2">
                      {generatedDua.propheticStory.incident.ar}
                    </div>
                    <div className="text-gray-700 italic mb-2">
                      {generatedDua.propheticStory.incident.transliteration}
                    </div>
                    <div className="text-gray-600">
                      {generatedDua.propheticStory.incident.en}
                    </div>
                  </div>

                  {/* Outcome/Lesson */}
                  <div className="p-4 bg-emerald-50 rounded-lg border-l-4 border-emerald-500">
                    <h4 className="font-semibold text-gray-800 mb-2">How They Overcame & The Outcome:</h4>
                    <div dir="rtl" className="text-right text-lg font-bold text-gray-900 mb-2">
                      {generatedDua.propheticStory.outcome.ar}
                    </div>
                    <div className="text-gray-700 italic mb-2">
                      {generatedDua.propheticStory.outcome.transliteration}
                    </div>
                    <div className="text-gray-600">
                      {generatedDua.propheticStory.outcome.en}
                    </div>
                  </div>
                </div>
              )}

              {/* New structured dua view (8-section model) */}
              {structuredDua && (
                <div className="mt-10 pt-6 border-t-2 border-green-200 space-y-8">
                  <h3 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
                    <span className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                      ✨
                    </span>
                    Structured Dua (Prophetic Flow)
                  </h3>
                  <div className="space-y-6">
                    {structuredDua.sections.map((section, index) => {
                      const styles = getSectionStyleClasses(section.kind);
                      const isHereafterSection = section.kind === "hereafter";
                      const blocksToShow =
                        isHereafterSection && !showAllHereafter
                          ? section.blocks.slice(0, Math.min(2, section.blocks.length))
                          : section.blocks;

                      return (
                        <div
                          key={section.kind}
                          className={`space-y-3 p-4 rounded-xl ${styles.container}`}
                        >
                          <h4 className={`text-lg font-bold mb-3 flex items-center gap-2 ${styles.title}`}>
                            <span
                              className={`${styles.badge} text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold`}
                            >
                              {index + 1}
                            </span>
                            {section.title}
                          </h4>
                          {blocksToShow.map((block, blockIndex) => {
                            const storyKey = `${section.kind}-${blockIndex}`;
                            const isStoryExpanded = expandedHereafterStories.has(storyKey);
                            return (
                              <div
                                key={blockIndex}
                                className="space-y-2 bg-white/80 rounded-lg p-3 border border-gray-100"
                              >
                                {block.arabic && (
                                  <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                                    {block.arabic}
                                  </div>
                                )}
                                {block.transliteration && (
                                  <div className="text-gray-700 italic">
                                    {block.transliteration}
                                  </div>
                                )}
                                {block.translation && (
                                  <div className="text-gray-600">
                                    {block.translation}
                                  </div>
                                )}
                                {block.quranRef && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {block.quranRef.surahName} ({block.quranRef.surahNumber}:{block.quranRef.ayahStart}
                                    {block.quranRef.ayahEnd !== block.quranRef.ayahStart
                                      ? `–${block.quranRef.ayahEnd}`
                                      : ""}
                                    )
                                  </div>
                                )}
                                {block.note && (
                                  <div className="text-xs text-gray-500 italic">
                                    {block.note}
                                  </div>
                                )}
                                {isHereafterSection && block.contextSummary && (
                                  <div className="mt-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExpandedHereafterStories((prev) => {
                                          const next = new Set(Array.from(prev));
                                          if (next.has(storyKey)) {
                                            next.delete(storyKey);
                                          } else {
                                            next.add(storyKey);
                                          }
                                          return next;
                                        });
                                      }}
                                      className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-800"
                                    >
                                      <span>{isStoryExpanded ? "Hide story behind this dua" : "Show story behind this dua"}</span>
                                      <span className={`transform transition-transform ${isStoryExpanded ? "rotate-180" : ""}`}>
                                        ▼
                                      </span>
                                    </button>
                                    {isStoryExpanded && (
                                      <div className="mt-1 text-xs text-gray-600">
                                        {block.contextSummary}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {isHereafterSection && section.blocks.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setShowAllHereafter((prev) => !prev)}
                              className="mt-1 text-xs text-indigo-700 font-semibold flex items-center gap-1 hover:text-indigo-900"
                            >
                              <span>{showAllHereafter ? "Show fewer Hereafter duas" : "Show more Hereafter duas"}</span>
                              <span className={`transform transition-transform ${showAllHereafter ? "rotate-180" : ""}`}>
                                ▼
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

          </>
        )}

        {viewMode === "saved" && (
          /* Saved Duas View */
          <div className="mt-4">
            {savedDuas.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mx-auto text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                <p className="text-gray-600 text-lg">No saved duas yet</p>
                <p className="text-gray-500 text-sm mt-2">
                  Structure and save duas to view them here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Dropdown Selector */}
                <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 shadow-lg">
                  <label htmlFor="duaSelector" className="block text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Select Saved Dua
                  </label>
                  <select
                    id="duaSelector"
                    value={selectedSavedDuaId}
                    onChange={(e) => setSelectedSavedDuaId(e.target.value)}
                    className="w-full px-5 py-4 border-2 border-indigo-300 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-gray-800 font-semibold shadow-md hover:shadow-xl transition-all duration-200 bg-white text-lg"
                  >
                    <option value="">-- Choose a saved dua --</option>
                    {savedDuas.map((savedDua) => (
                      <option key={savedDua.id} value={savedDua.id}>
                        {savedDua.name || "My Dua"} - {new Date(savedDua.savedAt).toLocaleDateString()} {savedDua.categories.length > 0 && `(${savedDua.categories.join(", ")})`}
                      </option>
                    ))}
                  </select>
                  {savedDuas.length > 0 && (
                    <p className="text-sm text-gray-600 mt-3 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {savedDuas.length} dua{savedDuas.length !== 1 ? 's' : ''} saved
                    </p>
                  )}
                </div>

                {/* Display Selected Dua */}
                {selectedSavedDuaId && (() => {
                  const savedDua = savedDuas.find(dua => dua.id === selectedSavedDuaId);
                  if (!savedDua) return null;
                  return (
                  <div
                    className="bg-white border-2 border-gray-200 rounded-2xl p-6 md:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 animate-fadeIn"
                  >
                    <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-200">
                      <div className="flex-1">
                        {/* Dua Name - Editable */}
                        {editingDuaId === savedDua.id ? (
                          <div className="flex items-center gap-3 mb-4">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveName(savedDua.id);
                                if (e.key === "Escape") handleCancelEditName();
                              }}
                              className="flex-1 px-4 py-3 border-2 border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 text-xl font-bold shadow-lg transition-all"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveName(savedDua.id)}
                              className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                              title="Save"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditName}
                              className="p-3 bg-gray-400 text-white rounded-xl hover:bg-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110"
                              title="Cancel"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                              </svg>
                            </div>
                            <h3 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                              {savedDua.name || "My Dua"}
                            </h3>
                            <button
                              type="button"
                              onClick={() => handleStartEditName(savedDua.id, savedDua.name || "My Dua")}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200 transform hover:scale-110"
                              title="Rename"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-gray-500">
                            {new Date(savedDua.savedAt).toLocaleDateString()}
                          </span>
                          {savedDua.categories.length > 0 && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                              {savedDua.categories.join(", ")}
                            </span>
                          )}
                        </div>
                        {savedDua.userInput && (
                          <p className="text-sm text-gray-600 italic mb-3">
                            "{savedDua.userInput}"
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedDua(savedDua.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                        title="Delete"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Display the complete saved dua */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg shadow-md p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                        Saved Dua
                      </h3>
                      
                      <div className="bg-white p-6 rounded-lg border border-green-300 text-gray-800 leading-relaxed space-y-6">
                        
                        {/* 1. Praise Allah */}
                        <div className="space-y-2">
                          <h4 className="text-lg font-semibold text-indigo-700 mb-2">1. Praise Allah</h4>
                          <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                            {savedDua.praise.ar}
                          </div>
                          <div className="text-gray-700 italic">
                            {savedDua.praise.transliteration}
                          </div>
                          <div className="text-gray-600">
                            {savedDua.praise.en}
                          </div>
                        </div>

                        {/* 2. Salāh upon Prophet Muhammad ﷺ */}
                        <div className="space-y-2">
                          <h4 className="text-lg font-semibold text-indigo-700 mb-2">2. Salāh upon Prophet Muhammad ﷺ</h4>
                          <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                            {savedDua.salawat1.ar}
                          </div>
                          <div className="text-gray-700 italic">
                            {savedDua.salawat1.transliteration}
                          </div>
                          <div className="text-gray-600">
                            {savedDua.salawat1.en}
                          </div>
                        </div>

                        {/* 3. Ism-ul-A'ẓam Dua */}
                        <div className="space-y-2">
                          <h4 className="text-lg font-semibold text-indigo-700 mb-2">3. Ism-ul-A'ẓam Dua</h4>
                          <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                            {savedDua.ismAzam.ar}
                          </div>
                          <div className="text-gray-700 italic">
                            {savedDua.ismAzam.transliteration}
                          </div>
                          <div className="text-gray-600">
                            {savedDua.ismAzam.en}
                          </div>
                        </div>

                        {/* 4. Calling Allah by relevant Names */}
                        <div className="space-y-2">
                          <h4 className="text-lg font-semibold text-indigo-700 mb-2">4. Calling Allah by Relevant Names</h4>
                          <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                            {savedDua.names.ar}
                          </div>
                          <div className="text-gray-700 italic">
                            {savedDua.names.transliteration}
                          </div>
                          <div className="text-gray-600">
                            {savedDua.names.en}
                          </div>
                        </div>

                        {/* 5. Humility & weakness */}
                        <div className="space-y-2">
                          <h4 className="text-lg font-semibold text-indigo-700 mb-2">5. Humility & Weakness</h4>
                          <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                            {savedDua.humility.ar}
                          </div>
                          <div className="text-gray-700 italic">
                            {savedDua.humility.transliteration}
                          </div>
                          <div className="text-gray-600">
                            {savedDua.humility.en}
                          </div>
                        </div>

                        {/* 6. User's personal Dua section */}
                        {savedDua.personalDua && (
                          <div className="space-y-2">
                            <h4 className="text-lg font-semibold text-indigo-700 mb-2">6. Your Personal Dua</h4>
                            <div className="text-gray-700 font-medium bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                              {savedDua.personalDua}
                            </div>
                          </div>
                        )}

                        {/* 7. Clear request */}
                        <div className="space-y-2">
                          <h4 className="text-lg font-semibold text-indigo-700 mb-2">7. Clear Request</h4>
                          <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                            {savedDua.request.ar}
                          </div>
                          <div className="text-gray-700 italic">
                            {savedDua.request.transliteration}
                          </div>
                          <div className="text-gray-600">
                            {savedDua.request.en}
                          </div>
                        </div>

                        {/* 8. Tawakkul (trust in Allah) */}
                        <div className="space-y-2">
                          <h4 className="text-lg font-semibold text-indigo-700 mb-2">8. Tawakkul (Trust in Allah)</h4>
                          <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                            {savedDua.trust.ar}
                          </div>
                          <div className="text-gray-700 italic">
                            {savedDua.trust.transliteration}
                          </div>
                          <div className="text-gray-600">
                            {savedDua.trust.en}
                          </div>
                        </div>

                        {/* 9. Salāh again */}
                        <div className="space-y-2">
                          <h4 className="text-lg font-semibold text-indigo-700 mb-2">9. Salāh upon Prophet Muhammad ﷺ Again</h4>
                          <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                            {savedDua.salawat2.ar}
                          </div>
                          <div className="text-gray-700 italic">
                            {savedDua.salawat2.transliteration}
                          </div>
                          <div className="text-gray-600">
                            {savedDua.salawat2.en}
                          </div>
                        </div>

                        {/* 10. Āmīn */}
                        <div className="space-y-2 pt-4 border-t border-green-200">
                          <h4 className="text-lg font-semibold text-indigo-700 mb-2">10. Āmīn</h4>
                          <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                            {savedDua.ameen.ar}
                          </div>
                          <div className="text-gray-700 italic text-lg">
                            {savedDua.ameen.transliteration}
                          </div>
                          <div className="text-gray-600">
                            {savedDua.ameen.en}
                          </div>
                        </div>
                      </div>

                      {/* Problem-Based Dhikr, Dua & Qurʾānic Motivation */}
                      <div className="mt-8 bg-white p-6 rounded-lg border border-green-300">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                          Problem-Based Dhikr, Dua & Qurʾānic Motivation
                        </h3>

                        {/* Relevant Dhikr */}
                        {savedDua.problemBasedDhikr && savedDua.problemBasedDhikr.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-xl font-semibold text-indigo-700 mb-3">Relevant Dhikr (Remembrance)</h4>
                            {savedDua.problemBasedDhikr.map((dhikr, index) => (
                              <div key={index} className="mb-4 space-y-2 p-4 bg-blue-50 rounded-lg">
                                <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                                  {dhikr.ar}
                                </div>
                                <div className="text-gray-700 italic">
                                  {dhikr.transliteration}
                                </div>
                                <div className="text-gray-600">
                                  {dhikr.en}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Relevant Dua */}
                        {savedDua.problemBasedDua && savedDua.problemBasedDua.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-xl font-semibold text-indigo-700 mb-3">Relevant Dua</h4>
                            {savedDua.problemBasedDua.map((dua, index) => (
                              <div key={index} className="mb-4 space-y-2 p-4 bg-green-50 rounded-lg">
                                <div dir="rtl" className="text-right text-lg font-bold text-gray-900">
                                  {dua.ar}
                                </div>
                                <div className="text-gray-700 italic">
                                  {dua.transliteration}
                                </div>
                                <div className="text-gray-600">
                                  {dua.en}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Prophetic Story */}
                        {savedDua.propheticStory && savedDua.propheticStory.story && savedDua.propheticStory.story.ar && (
                          <div className="mb-6">
                            <h4 className="text-xl font-semibold text-indigo-700 mb-3">
                              Qurʾānic Motivation: The Story of {savedDua.propheticStory.prophet}
                            </h4>

                            {/* Quranic Verse */}
                            <div className="mb-4 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                              <h5 className="font-semibold text-gray-800 mb-2">Qurʾānic Verse:</h5>
                              <div dir="rtl" className="text-right text-lg font-bold text-gray-900 mb-2">
                                {savedDua.propheticStory.story.ar}
                              </div>
                              <div className="text-gray-700 italic mb-2">
                                {savedDua.propheticStory.story.transliteration}
                              </div>
                              <div className="text-gray-600">
                                {savedDua.propheticStory.story.en}
                              </div>
                            </div>

                            {/* Incident/Story */}
                            <div className="mb-4 p-4 bg-purple-50 rounded-lg">
                              <h5 className="font-semibold text-gray-800 mb-2">The Story:</h5>
                              <div dir="rtl" className="text-right text-lg font-bold text-gray-900 mb-2">
                                {savedDua.propheticStory.incident.ar}
                              </div>
                              <div className="text-gray-700 italic mb-2">
                                {savedDua.propheticStory.incident.transliteration}
                              </div>
                              <div className="text-gray-600">
                                {savedDua.propheticStory.incident.en}
                              </div>
                            </div>

                            {/* Outcome/Lesson */}
                            <div className="p-4 bg-emerald-50 rounded-lg border-l-4 border-emerald-500">
                              <h5 className="font-semibold text-gray-800 mb-2">How They Overcame & The Outcome:</h5>
                              <div dir="rtl" className="text-right text-lg font-bold text-gray-900 mb-2">
                                {savedDua.propheticStory.outcome.ar}
                              </div>
                              <div className="text-gray-700 italic mb-2">
                                {savedDua.propheticStory.outcome.transliteration}
                              </div>
                              <div className="text-gray-600">
                                {savedDua.propheticStory.outcome.en}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Why Dua Is Not Answered Section */}
        {viewMode === "why-not-answered" && (
          <div className="mt-4 max-w-4xl mx-auto">
            {/* Intro Screen */}
            {whyNotAnsweredSubsection === "intro" && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-12 border-2 border-blue-200 shadow-xl">
                <div className="text-center space-y-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h2 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                    Why Dua Is Not Answered
                  </h2>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg text-left max-w-2xl mx-auto">
                    <p className="text-lg font-semibold text-gray-800 mb-3 flex items-start gap-2">
                      <span className="text-2xl">❗</span>
                      <span>Delay does NOT mean rejection</span>
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      Allah answers Dua in different ways — sometimes later, sometimes differently, sometimes by protection. 
                      Understanding these factors helps us reflect and improve, not blame ourselves.
                    </p>
                  </div>
                  <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg text-left max-w-2xl mx-auto">
                    <p className="text-sm font-semibold text-gray-800 mb-2 flex items-start gap-2">
                      <span className="text-xl">🚨</span>
                      <span>Important Reminder</span>
                    </p>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      This content is for self-reflection, not self-blame. Not all unanswered Dua are due to sin. 
                      Allah answers with wisdom, and delay often means protection or better timing.
                    </p>
                  </div>
                  <button
                    onClick={() => setWhyNotAnsweredSubsection("main")}
                    className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-8 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-lg"
                  >
                    Understand the Reasons →
                  </button>
                </div>
              </div>
            )}

            {/* Main Content Screen */}
            {whyNotAnsweredSubsection === "main" && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    Factors That Prevent Dua From Being Answered
                  </h2>
                  <p className="text-gray-600">Click on each card to learn more</p>
                </div>

                {/* Categories */}
                {whyNotAnsweredData.map((category) => (
                  <div key={category.id} className={`${category.bgColor} rounded-2xl p-6 border-2 ${category.borderColor} shadow-lg`}>
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">{category.title}</h3>
                      <p className="text-gray-600 italic">{category.description}</p>
                    </div>

                    <div className="space-y-4">
                      {category.points.map((point) => {
                        const isExpanded = expandedCards.has(point.id);
                        return (
                          <div
                            key={point.id}
                            className="bg-white rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden"
                          >
                            <button
                              onClick={() => toggleCard(point.id)}
                              className="w-full p-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                            >
                              <div className="flex-1 flex items-start gap-4">
                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${category.bgColor} border-2 ${category.borderColor} flex items-center justify-center font-bold text-gray-800`}>
                                  {category.points.indexOf(point) + 1}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-bold text-lg text-gray-800 mb-2">{point.title}</h4>
                                  <div className="flex items-center gap-2">
                                    {getSourceBadge(point.source)}
                                    <span className="text-xs text-gray-500">{point.sourceText}</span>
                                  </div>
                                </div>
                              </div>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`h-6 w-6 text-gray-400 transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {isExpanded && (
                              <div className="px-5 pb-5 pt-0 animate-fadeIn">
                                <div className="pl-14">
                                  <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-indigo-500">
                                    <p className="text-gray-700 leading-relaxed">{point.description}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Navigation Buttons */}
                <div className="flex gap-4 justify-center pt-8">
                  <button
                    onClick={() => setWhyNotAnsweredSubsection("intro")}
                    className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    ← Back to Intro
                  </button>
                  <button
                    onClick={() => setWhyNotAnsweredSubsection("summary")}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    View Summary →
                  </button>
                </div>
              </div>
            )}

            {/* Summary Screen */}
            {whyNotAnsweredSubsection === "summary" && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 md:p-12 border-2 border-green-200 shadow-xl">
                <div className="text-center space-y-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-6">
                    Scholar's Summary
                  </h2>
                  <div className="bg-white rounded-xl p-8 border-2 border-green-300 shadow-lg max-w-3xl mx-auto">
                    <p className="text-xl md:text-2xl text-gray-700 leading-relaxed italic mb-6">
                      "When the heart is sincere, obligations are fulfilled, and sustenance is halal — 
                      Dua is never lost."
                    </p>
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-semibold">Scholars' Wisdom</span>
                    </div>
                  </div>
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg text-left max-w-2xl mx-auto">
                    <p className="text-lg font-semibold text-gray-800 mb-3 flex items-start gap-2">
                      <span className="text-2xl">✅</span>
                      <span>Remember: Delay ≠ Rejection</span>
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      Many Duas are stored for the Akhirah, exchanged for protection, or delayed for better timing. 
                      Trust in Allah's wisdom and continue making Dua with sincerity and patience.
                    </p>
                  </div>
                  <div className="flex gap-4 justify-center pt-6">
                    <button
                      onClick={() => setWhyNotAnsweredSubsection("main")}
                      className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => {
                        setViewMode("generate");
                        setWhyNotAnsweredSubsection("intro");
                      }}
                      className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg"
                    >
                      Structure Your Dua →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Times & Situations When Dua Is More Likely to Be Accepted */}
        {viewMode === "best-times" && (
          <div className="mt-4 max-w-4xl mx-auto">
            {/* Intro Screen */}
            {bestTimesSubsection === "intro" && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-12 border-2 border-blue-200 shadow-xl">
                <div className="text-center space-y-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                    Times & Situations When Dua Is More Likely to Be Accepted
                  </h2>
                  <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-lg text-left max-w-2xl mx-auto">
                    <p className="text-lg font-semibold text-gray-800 mb-3 flex items-start gap-2">
                      <span className="text-2xl">🕰️</span>
                      <span>Use these moments with sincerity</span>
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      The Prophet ﷺ and the Qur'an highlight specific times and situations when Dua is more likely to be accepted. 
                      Learning them helps us align our supplication with the Sunnah.
                    </p>
                  </div>
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg text-left max-w-2xl mx-auto">
                    <p className="text-sm font-semibold text-gray-800 mb-2 flex items-start gap-2">
                      <span className="text-xl">📖</span>
                      <span>Authenticity</span>
                    </p>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      Content is grouped by strength of evidence: Sahih (strongest), Hasan (very strong), and Qur'anic prophetic supplications.
                    </p>
                  </div>
                  <button
                    onClick={() => setBestTimesSubsection("main")}
                    className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-8 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-lg"
                  >
                    Explore the Times →
                  </button>
                </div>
              </div>
            )}

            {/* Main Content Screen */}
            {bestTimesSubsection === "main" && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    Times & Situations When Dua Is More Likely to Be Accepted
                  </h2>
                  <p className="text-gray-600">Click on each card to learn more</p>
                </div>

                {bestTimesData.map((section) => (
                  <div key={section.id} className={`${section.bgColor} rounded-2xl p-6 border-2 ${section.borderColor} shadow-lg`}>
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <span>{section.sectionEmoji}</span>
                        {section.title}
                      </h3>
                      {section.subtitle && (
                        <p className="text-gray-600 italic">{section.subtitle}</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      {section.items.map((item) => {
                        const isExpanded = expandedCards.has(item.id);
                        return (
                          <div
                            key={item.id}
                            className="bg-white rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden"
                          >
                            <button
                              onClick={() => toggleCard(item.id)}
                              className="w-full p-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                            >
                              <div className="flex-1 flex items-start gap-4">
                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${section.bgColor} border-2 ${section.borderColor} flex items-center justify-center font-bold text-gray-800`}>
                                  {item.number}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-bold text-lg text-gray-800 mb-2">{item.title}</h4>
                                  <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded">
                                    ✅ {item.authenticity}
                                  </span>
                                </div>
                              </div>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`h-6 w-6 text-gray-400 transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {isExpanded && (
                              <div className="px-5 pb-5 pt-0 animate-fadeIn">
                                <div className="pl-14 space-y-4">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-700 mb-1">Why this time is special</p>
                                    <ul className="list-disc list-inside text-gray-700 text-sm space-y-0.5">
                                      {item.why.map((w, i) => (
                                        <li key={i}>{w}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-indigo-500">
                                    <p className="text-sm font-semibold text-gray-700 mb-1">Proof</p>
                                    <p className="text-gray-700 leading-relaxed text-sm">{item.proof}</p>
                                  </div>
                                  {item.duaText && (
                                    <div className="bg-indigo-50 border-l-4 border-indigo-400 p-3 rounded">
                                      <p className="text-gray-800 font-medium text-sm" dir="rtl">{item.duaText}</p>
                                    </div>
                                  )}
                                  <p className="text-gray-500 text-xs">{item.references}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex gap-4 justify-center pt-8">
                  <button
                    onClick={() => setBestTimesSubsection("intro")}
                    className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    ← Back to Intro
                  </button>
                  <button
                    onClick={() => setBestTimesSubsection("summary")}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    View Summary →
                  </button>
                </div>
              </div>
            )}

            {/* Summary Screen */}
            {bestTimesSubsection === "summary" && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 md:p-12 border-2 border-green-200 shadow-xl">
                <div className="text-center space-y-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-6">
                    Key Takeaway
                  </h2>
                  <div className="bg-white rounded-xl p-8 border-2 border-green-300 shadow-lg max-w-3xl mx-auto">
                    <p className="text-xl md:text-2xl text-gray-700 leading-relaxed italic mb-6">
                      "Seize the last third of the night, sujood, the Friday hour, and other blessed moments — 
                      and make Dua with a present heart and trust in Allah."
                    </p>
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">Best Times for Dua</span>
                    </div>
                  </div>
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg text-left max-w-2xl mx-auto">
                    <p className="text-lg font-semibold text-gray-800 mb-3 flex items-start gap-2">
                      <span className="text-2xl">✅</span>
                      <span>Put it into practice</span>
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      Use these times and situations when you make Dua. Combine sincerity, adab, and the structure we provide — 
                      then trust in Allah's wisdom and timing.
                    </p>
                  </div>
                  <div className="flex gap-4 justify-center pt-6">
                    <button
                      onClick={() => setBestTimesSubsection("main")}
                      className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => {
                        setViewMode("generate");
                        setBestTimesSubsection("intro");
                      }}
                      className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg"
                    >
                      Structure Your Dua →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Important Information & Disclaimers Modal */}
        {disclaimerOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" onClick={() => setDisclaimerOpen(false)}>
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 max-w-2xl w-full mx-4 border border-gray-100 animate-slideIn relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Close Button */}
              <button
                onClick={() => setDisclaimerOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2"
                title="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="space-y-4">
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6 text-center">
                  Important Information & Disclaimers
                </h2>

                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <span className="text-xl">🕌</span> Dua Assistance Only
                  </h4>
                  <p className="text-gray-700">
                    This app helps you organize Dua. It does not replace scholars, fatwā, or personal worship.
                  </p>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <span className="text-xl">📖</span> Religious Authenticity
                  </h4>
                  <p className="text-gray-700">
                    Qurʾānic verses and authentic Dua are clearly labeled. Some expressions are meaning-based, not direct quotations.
                  </p>
                </div>

                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <span className="text-xl">🤲</span> No Guaranteed Outcomes
                  </h4>
                  <p className="text-gray-700">
                    Dua is worship. Allah answers in the way and time He knows best. This app does not promise results.
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setDisclaimerOpen(false)}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </main>
  );
}
