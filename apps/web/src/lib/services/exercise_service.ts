import prisma from "@rosp/db";
import { ExerciseRequestInput } from "@rosp/shared";
import { llmService } from "../llm/llm_service";

export async function generateExerciseForWord(input: ExerciseRequestInput) {
  const word = await prisma.vocabularyWord.findUnique({
    where: { id: input.vocabularyWordId },
  });

  if (!word) {
    throw new Error("Vocabulary word not found");
  }

  const generated = await llmService.generateExercise({
    word: word.word,
    language: input.targetLanguage || word.language,
    meaning: word.meaning,
    example: word.example,
    exerciseType: input.type,
  });

  const providerType = llmService.getProviderName() as "OLLAMA" | "GROQ";
  const modelName = llmService.getModelName();

  const exercise = await prisma.exercise.create({
    data: {
      type: input.type as "FILL_BLANK" | "MULTIPLE_CHOICE" | "SENTENCE_CONSTRUCTION",
      question: generated.question,
      answer: generated.answer,
      explanation: generated.explanation,
      provider: providerType,
      model: modelName,
    },
  });

  return {
    ...exercise,
    options: generated.options,
  };
}
