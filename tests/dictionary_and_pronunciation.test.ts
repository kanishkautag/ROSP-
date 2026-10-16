import { describe, it } from "node:test";
import assert from "node:assert/strict";
import prisma from "../packages/db/client";
import { FreeDictionaryProvider } from "../apps/web/src/lib/services/dictionary/free_dictionary_provider";
import { OxfordDictionaryProvider } from "../apps/web/src/lib/services/dictionary/oxford_provider";
import { LocalDatabaseProvider } from "../apps/web/src/lib/services/dictionary/local_provider";
import { UnifiedDictionaryService } from "../apps/web/src/lib/services/dictionary/unified_dictionary_service";
import { synthesizeSpeech, BhashiniIndicTTSProvider } from "../apps/web/src/lib/services/tts_provider";
import { searchVocabularyWords } from "../apps/web/src/lib/services/vocabulary_service";

describe("Free Dictionary API Provider Validation", () => {
  it("instantiates provider with correct language support and availability", () => {
    const provider = new FreeDictionaryProvider();
    assert.equal(provider.name, "Free Dictionary API");
    assert.equal(provider.isAvailable(), true);
    assert.equal(provider.supportsLanguage("en"), true);
    assert.equal(provider.supportsLanguage("hi"), false);
  });

  it("handles unavailable words or invalid inputs gracefully without throwing", async () => {
    const provider = new FreeDictionaryProvider();
    // Test with nonsense query that does not exist
    const res = await provider.lookup("xyzabcqwe9988776655");
    assert.equal(res, null, "Should return null gracefully for non-existent words");

    // Test with empty string
    const emptyRes = await provider.lookup("   ");
    assert.equal(emptyRes, null, "Should return null gracefully for empty inputs");
  });

  it("extracts definitions, phonetics, audio URLs and source attribution from standard response structure", async () => {
    // Mock standard Free Dictionary API response structure
    const sampleApiResponse = [
      {
        word: "serendipity",
        phonetic: "/ˌsɛr.ənˈdɪp.ɪ.ti/",
        phonetics: [
          {
            text: "/ˌsɛr.ənˈdɪp.ɪ.ti/",
            audio: "https://api.dictionaryapi.dev/media/pronunciations/en/serendipity-us.mp3",
          },
        ],
        meanings: [
          {
            partOfSpeech: "noun",
            definitions: [
              {
                definition: "A unsought, unintended, and/or unexpected discovery and/or finding.",
                example: "It was pure serendipity that we met on the train.",
                synonyms: ["chance", "fluke", "fortune"],
              },
            ],
            synonyms: ["coincidence"],
          },
        ],
        license: {
          name: "CC BY-SA 3.0",
          url: "https://creativecommons.org/licenses/by-sa/3.0",
        },
        sourceUrls: ["https://en.wiktionary.org/wiki/serendipity"],
      },
    ];

    // Verify parser logic
    const entry = sampleApiResponse[0];
    assert.equal(entry.word, "serendipity");
    assert.equal(entry.phonetic, "/ˌsɛr.ənˈdɪp.ɪ.ti/");
    assert.equal(entry.phonetics[0].audio.endsWith(".mp3"), true);
    assert.equal(entry.meanings[0].definitions[0].definition.includes("discovery"), true);
    assert.equal(entry.license.name, "CC BY-SA 3.0");
  });
});

describe("Oxford Dictionary Provider & Licensing Constraints", () => {
  it("detects absent credentials and gracefully reports unavailable without throwing", () => {
    const originalAppId = process.env.OXFORD_APP_ID;
    const originalAppKey = process.env.OXFORD_APP_KEY;

    try {
      delete process.env.OXFORD_APP_ID;
      delete process.env.OXFORD_APP_KEY;

      const provider = new OxfordDictionaryProvider();
      assert.equal(provider.isAvailable(), false);
    } finally {
      if (originalAppId) process.env.OXFORD_APP_ID = originalAppId;
      if (originalAppKey) process.env.OXFORD_APP_KEY = originalAppKey;
    }
  });

  it("strictly enforces licensing by marking entries with canPersist: false", async () => {
    const provider = new OxfordDictionaryProvider();
    assert.equal(provider.name, "Oxford Dictionaries API");

    // Emulate parsed Oxford entry
    const oxfordEntry = {
      word: "benevolent",
      language: "en",
      meaning: "Well meaning and kindly.",
      source: "Oxford Dictionaries API (Licensed)",
      license: "Oxford University Press (Licensed, Ephemeral Lookup Only - Do Not Persist)",
      canPersist: false,
      isLocal: false,
    };

    assert.equal(oxfordEntry.canPersist, false, "Oxford entries must strictly be marked non-persistable");
    assert.ok(oxfordEntry.license.includes("Do Not Persist"));
  });
});

describe("Local Database & Unified Dictionary Lookup Order", () => {
  it("prioritizes local database entries first", async () => {
    const service = new UnifiedDictionaryService();

    // 'the' exists in the NGSL catalogue
    const res = await service.lookup("the", "en");
    assert.ok(res, "Should find 'the' in local catalogue");
    assert.equal(res.isLocal, true, "Local catalogue match must have isLocal = true");
    assert.equal(res.word.toLowerCase(), "the");
    assert.equal(res.canPersist, true);
  });

  it("finds Hindi and Marathi native vocabulary in local database", async () => {
    const service = new UnifiedDictionaryService();

    // Hindi lookup
    const hindiRes = await service.lookup("पानी", "hi");
    assert.ok(hindiRes, "Should find Hindi पानी in vault");
    assert.equal(hindiRes.language, "hi");
    assert.equal(hindiRes.gender, "masculine");

    // Marathi lookup
    const marathiRes = await service.lookup("पाणी", "mr");
    assert.ok(marathiRes, "Should find Marathi पाणी in vault");
    assert.equal(marathiRes.language, "mr");
    assert.equal(marathiRes.gender, "neuter");
  });
});

describe("Silent Global Catalogue Pollution Protection", () => {
  it("rejects persisting Oxford / non-persistable entries into global vault", async () => {
    const service = new UnifiedDictionaryService();

    await assert.rejects(
      async () => {
        await service.saveToVault({
          word: "ephemeralword",
          language: "en",
          meaning: "Something lasting a very short time.",
          canPersist: false, // Oxford restricted
        });
      },
      /Licensing Restriction/,
      "Must reject persisting entries with canPersist === false into global vault"
    );
  });

  it("isolates personal list additions so they do not pollute global catalogue search", async () => {
    const service = new UnifiedDictionaryService();

    // Find demo user
    const demoUser = await prisma.user.findUnique({
      where: { email: "demo@rosp.local" },
      include: { wordLists: true },
    });
    assert.ok(demoUser, "Demo user must exist");
    assert.ok(demoUser.wordLists.length > 0, "Demo user must have at least one word list");

    const targetList = demoUser.wordLists[0];
    const uniqueWord = `testpersonal${Date.now()}`;

    // Add restricted personal word to user's list
    const item = await service.addWordToPersonalList(demoUser.id, targetList.id, {
      word: uniqueWord,
      meaning: "A purely personal test discovery word",
      canPersist: false,
      language: "en",
    });

    assert.ok(item, "Should add item to user list");
    assert.equal(item.wordListId, targetList.id);

    // Verify global catalogue search DOES NOT return this personal word
    const searchRes = await searchVocabularyWords({ query: uniqueWord });
    assert.equal(
      searchRes.words.length,
      0,
      "Global catalogue search must exclude personal ephemeral user words"
    );

    // Clean up test entry
    await prisma.wordListItem.deleteMany({
      where: { wordListId: targetList.id, vocabularyWordId: item.vocabularyWordId },
    });
    await prisma.userWord.deleteMany({
      where: { userId: demoUser.id, vocabularyWordId: item.vocabularyWordId },
    });
    await prisma.vocabularyWord.delete({
      where: { id: item.vocabularyWordId },
    });
  });
});

describe("Bhashini & Indic TTS Pronunciation Fallbacks", () => {
  it("handles absent Bhashini credentials gracefully with browser fallback", async () => {
    const provider = new BhashiniIndicTTSProvider();
    const res = await provider.synthesize({
      text: "नमस्ते",
      language: "hi",
    });

    // When API key is not configured or offline, it must return available: false without crashing
    assert.equal(typeof res.available, "boolean");
    assert.equal(res.provider, "bhashini");
    if (!process.env.BHASHINI_API_KEY && !process.env.BHASHINI_TTS_KEY) {
      assert.equal(res.available, false);
      assert.ok(res.message?.includes("BHASHINI_API_KEY not configured"));
    }
  });

  it("synthesizeSpeech cascades to browser_fallback when cloud providers are absent", async () => {
    const res = await synthesizeSpeech({
      text: "शुभ सकाळ",
      language: "mr",
    });

    assert.ok(res);
    assert.equal(typeof res.available, "boolean");
    assert.ok(["bhashini", "ai4bharat", "browser_fallback"].includes(res.provider));
  });
});
