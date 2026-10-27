import prisma from "@rosp/db";
import { CreateVocabularyWordInput, VocabularyWordQueryParams } from "@rosp/shared";

export async function searchVocabularyWords(params: VocabularyWordQueryParams) {
  const { query, language, topic, cefrLevel, page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  // Unicode normalize search query (NFC standard for Indic Devanagari scripts and Latin)
  const normalizedQuery = query ? query.normalize("NFC").trim() : undefined;

  const where: any = {
    ...(normalizedQuery && {
      OR: [
        { word: { contains: normalizedQuery, mode: "insensitive" } },
        { meaning: { contains: normalizedQuery, mode: "insensitive" } },
        { romanization: { contains: normalizedQuery, mode: "insensitive" } },
        { nativeDefinition: { contains: normalizedQuery, mode: "insensitive" } },
        { example: { contains: normalizedQuery, mode: "insensitive" } },
        { exampleTranslation: { contains: normalizedQuery, mode: "insensitive" } },
      ],
    }),
    ...(language && language !== "ALL" && { language }),
    ...(topic && topic !== "ALL" && { topic }),
    ...(cefrLevel && (cefrLevel as string) !== "ALL" && { cefrLevel }),
    source: {
      notIn: ["user_personal_ephemeral"],
    },
  };

  const [rawWords, total] = await Promise.all([
    prisma.vocabularyWord.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ topic: "asc" }, { word: "asc" }],
    }),
    prisma.vocabularyWord.count({ where }),
  ]);

  // When searching by query, sort results so exact/prefix word matches rank above meaning substring matches
  let words = rawWords;
  if (normalizedQuery) {
    const qLower = normalizedQuery.toLowerCase();
    words = [...rawWords].sort((a, b) => {
      const aWord = a.word.toLowerCase();
      const bWord = b.word.toLowerCase();

      const getScore = (w: typeof a, wordLower: string) => {
        if (wordLower === qLower) return 0;
        if (wordLower.startsWith(qLower)) return 1;
        if (wordLower.includes(qLower)) return 2;
        if (w.romanization && w.romanization.toLowerCase().startsWith(qLower)) return 3;
        return 4;
      };

      const scoreA = getScore(a, aWord);
      const scoreB = getScore(b, bWord);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return aWord.localeCompare(bWord);
    });
  }

  return {
    words,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getVocabularyWordById(id: string) {
  return prisma.vocabularyWord.findUnique({
    where: { id },
  });
}

export async function createVocabularyWord(data: CreateVocabularyWordInput) {
  const normalizedWord = data.word.normalize("NFC").trim();
  const normalizedMeaning = data.meaning.trim();

  return prisma.vocabularyWord.create({
    data: {
      word: normalizedWord,
      language: data.language,
      meaning: normalizedMeaning,
      example: data.example ? data.example.normalize("NFC").trim() : null,
      synonyms: data.synonyms || [],
      partOfSpeech: data.partOfSpeech || null,
      cefrLevel: data.cefrLevel || null,
      frequency: data.frequency ?? null,
      frequencyRank: data.frequencyRank ?? null,
      source: data.source || null,
      romanization: data.romanization ? data.romanization.trim() : null,
      nativeDefinition: data.nativeDefinition ? data.nativeDefinition.normalize("NFC").trim() : null,
      gender: data.gender || null,
      forms: data.forms || null,
      exampleTranslation: data.exampleTranslation ? data.exampleTranslation.trim() : null,
      topic: data.topic || null,
      difficulty: data.difficulty || null,
      pronunciationUrl: data.pronunciationUrl || null,
      sourceUrl: data.sourceUrl || null,
      license: data.license || null,
    },
  });
}
