import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@rosp/db";
import { searchVocabularyWords } from "../apps/web/src/lib/services/vocabulary_service";
import { getDashboardStats } from "../apps/web/src/lib/services/user_service";
import { getLanguageConfig, hasNativeVoiceAvailable } from "../apps/web/src/lib/utils/tts";

describe("Multilingual Vocabulary and Curricula Validation", () => {
  it("verifies independent curricula across en, hi, and mr", async () => {
    const hindiCount = await prisma.vocabularyWord.count({ where: { language: "hi" } });
    const marathiCount = await prisma.vocabularyWord.count({ where: { language: "mr" } });
    const englishCount = await prisma.vocabularyWord.count({ where: { language: "en" } });

    assert.ok(hindiCount >= 300, `Expected at least 300 Hindi words, found ${hindiCount}`);
    assert.ok(marathiCount >= 30, `Expected at least 30 Marathi words, found ${marathiCount}`);
    assert.ok(englishCount >= 90, `Expected at least 90 English words, found ${englishCount}`);
  });

  it("ensures Hindi and Marathi have distinct linguistic properties for shared concepts", async () => {
    // Concept: water
    // Hindi: पानी (paani, masculine)
    // Marathi: पाणी (paani, neuter)
    const hindiWater = await prisma.vocabularyWord.findFirst({
      where: { language: "hi", word: "पानी" },
    });
    const marathiWater = await prisma.vocabularyWord.findFirst({
      where: { language: "mr", word: "पाणी" },
    });

    assert.ok(hindiWater, "Hindi word पानी must exist");
    assert.ok(marathiWater, "Marathi word पाणी must exist");

    assert.equal(hindiWater.gender, "masculine");
    assert.equal(marathiWater.gender, "neuter");
    assert.notEqual(hindiWater.word, marathiWater.word, "Native spelling must be preserved (न vs ण)");
    assert.equal(hindiWater.language, "hi");
    assert.equal(marathiWater.language, "mr");
  });

  it("filters vocabulary by required topics", async () => {
    const requiredTopics = [
      "greetings",
      "family",
      "food",
      "travel",
      "numbers",
      "daily conversation",
      "common verbs",
      "college",
      "shopping",
    ];

    for (const topic of requiredTopics) {
      const count = await prisma.vocabularyWord.count({ where: { topic } });
      assert.ok(count > 0, `Topic ${topic} should contain vocabulary items (found ${count})`);
    }
  });

  it("supports dual-script search: native script and Roman transliteration", async () => {
    // 1. Search in native Devanagari script: 'नमस्ते'
    const devanagariSearch = await searchVocabularyWords({ query: "नमस्ते" });
    assert.ok(devanagariSearch.words.length > 0, "Should find word with Devanagari query नमस्ते");
    assert.ok(devanagariSearch.words.some(w => w.word === "नमस्ते"));

    // 2. Search by Roman transliteration: 'namaste'
    const romanSearch = await searchVocabularyWords({ query: "namaste" });
    assert.ok(romanSearch.words.length > 0, "Should find word with Roman transliteration namaste");
    assert.ok(romanSearch.words.some(w => w.word === "नमस्ते"));

    // 3. Search Marathi 'paani' should match 'पाणी' (romanization: paani)
    const marathiRoman = await searchVocabularyWords({ query: "paani", language: "mr" });
    assert.ok(marathiRoman.words.length > 0, "Should find Marathi पाणी via Roman transliteration paani");
    assert.ok(marathiRoman.words.some(w => w.word === "पाणी"));
  });
});

describe("Pronunciation Fallback Hierarchy", () => {
  it("provides correct language configuration and BCP-47 tags", () => {
    const hiConfig = getLanguageConfig("hi");
    assert.equal(hiConfig.bcp47, "hi-IN");
    assert.equal(hiConfig.fallbackName, "Hindi");

    const mrConfig = getLanguageConfig("mr");
    assert.equal(mrConfig.bcp47, "mr-IN");
    assert.equal(mrConfig.fallbackName, "Marathi");

    const enConfig = getLanguageConfig("en");
    assert.equal(enConfig.bcp47, "en-US");
  });

  it("strictly rejects English voices for Hindi and Marathi speech synthesis", () => {
    const englishOnlyVoices = [
      { name: "Microsoft David", lang: "en-US" },
      { name: "Google US English", lang: "en-US" },
      { name: "Samantha", lang: "en" },
    ];

    // Hindi must NOT accept an English voice
    const hasHindiVoice = hasNativeVoiceAvailable("hi", englishOnlyVoices);
    assert.equal(hasHindiVoice, false, "Must not speak Hindi using English voices");

    // Marathi must NOT accept an English voice
    const hasMarathiVoice = hasNativeVoiceAvailable("mr", englishOnlyVoices);
    assert.equal(hasMarathiVoice, false, "Must not speak Marathi using English voices");

    // When native voices are provided
    const multilingualVoices = [
      ...englishOnlyVoices,
      { name: "Google हिन्दी", lang: "hi-IN" },
      { name: "Microsoft Hemant - Marathi (India)", lang: "mr-IN" },
    ];

    assert.equal(hasNativeVoiceAvailable("hi", multilingualVoices), true);
    assert.equal(hasNativeVoiceAvailable("mr", multilingualVoices), true);
  });
});

describe("Demo Account Historical Consistency", () => {
  it("validates demo user account data matches exact requirements", async () => {
    const user = await prisma.user.findUnique({
      where: { email: "demo@rosp.local" },
      include: {
        dailyActivities: true,
        xpEvents: true,
        userWords: {
          include: {
            reviewAttempts: true,
            learningState: true,
          },
        },
      },
    });

    assert.ok(user, "Demo user demo@rosp.local must exist in database");
    assert.equal(user.timezone, "Asia/Kolkata");
    assert.equal(user.dailyGoal, 10);

    // 14 consecutive active local dates
    assert.equal(user.dailyActivities.length, 14, "Must have exactly 14 daily activities");

    // 10 distinct word reviews per day = 140 review attempts total
    const allAttempts = user.userWords.flatMap(u => u.reviewAttempts);
    assert.equal(allAttempts.length, 140, "Must have exactly 140 review attempts (14 days * 10)");

    // 8 correct first answers per day = 112
    const correctAttempts = allAttempts.filter(a => a.correct).length;
    assert.equal(correctAttempts, 112, "Must have exactly 112 correct first answers");

    // 2 incorrect first answers per day = 28
    const incorrectAttempts = allAttempts.filter(a => !a.correct).length;
    assert.equal(incorrectAttempts, 28, "Must have exactly 28 incorrect first answers");

    // Total XP from ledger must be exactly 1540
    const totalXp = user.xpEvents.reduce((s, e) => s + e.amount, 0);
    assert.equal(totalXp, 1540, "Total XP from ledger must be exactly 1540");

    // Application real calculation verification
    const stats = await getDashboardStats(user.id);
    assert.equal(stats.currentStreak, 14, "Calculated current streak must be 14 days");
    assert.ok(stats.longestStreak >= 14, `Longest streak must be at least 14 days (was ${stats.longestStreak})`);
    assert.equal(stats.xp, 1540, "Calculated total XP must be 1540");
    assert.equal(stats.level, 16, "Calculated level must be 16");
    assert.ok(stats.wordsDueToday > 0, "Currently due words must exist for immediate review");
  });
});
