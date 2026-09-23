import prisma from "@rosp/db";
import { CreateVocabularyWordInput, VocabularyWordQueryParams } from "@rosp/shared";

export async function searchVocabularyWords(params: VocabularyWordQueryParams) {
  const { query, language, cefrLevel, page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where = {
    ...(query && {
      OR: [
        { word: { contains: query, mode: "insensitive" as const } },
        { meaning: { contains: query, mode: "insensitive" as const } },
      ],
    }),
    ...(language && { language }),
    ...(cefrLevel && { cefrLevel }),
  };

  const [words, total] = await Promise.all([
    prisma.vocabularyWord.findMany({
      where,
      skip,
      take: limit,
      orderBy: { word: "asc" },
    }),
    prisma.vocabularyWord.count({ where }),
  ]);

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
  return prisma.vocabularyWord.create({
    data: {
      word: data.word,
      language: data.language,
      meaning: data.meaning,
      example: data.example,
      partOfSpeech: data.partOfSpeech,
      cefrLevel: data.cefrLevel,
      frequency: data.frequency,
      frequencyRank: data.frequencyRank,
      source: data.source,
    },
  });
}
