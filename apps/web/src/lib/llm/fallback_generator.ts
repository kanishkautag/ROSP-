import { ExercisePromptPayload, GeneratedExerciseResult } from "./llm_provider";

const COMMON_DISTRACTOR_WORDS = [
  "water", "house", "friend", "book", "time", "apple", "learn", "travel",
  "challenge", "decide", "culture", "memory", "achieve", "convenient",
  "environment", "opportunity", "efficient", "fluency", "comprehend"
];

const COMMON_DISTRACTOR_DEFINITIONS = [
  "A wheeled motor vehicle used for transportation on roads.",
  "A system of communication consisting of sounds, words, and grammar.",
  "To make a choice from a number of alternatives after consideration.",
  "Fitting in well with a person's needs, activities, or plans; easy to use.",
  "To gain knowledge or skill in something through study or experience.",
  "The circumstances that form the setting for an event or statement.",
  "Achieving maximum productivity with minimum wasted effort or expense."
];

/**
 * Deterministic template-based exercise generator.
 * Guarantees review sessions never fail even when LLM endpoints are offline or unconfigured.
 */
export function generateFallbackExercise(
  payload: ExercisePromptPayload
): GeneratedExerciseResult {
  const { word, meaning, example, exerciseType } = payload;
  const sentence = example || `Learning the word ${word} is important for fluency.`;

  if (exerciseType === "MULTIPLE_CHOICE") {
    // Meaning quiz
    const distractors = COMMON_DISTRACTOR_DEFINITIONS.filter((d) => d !== meaning).slice(0, 3);
    const options = shuffleArray([meaning, ...distractors]);

    return {
      question: `What is the correct meaning of "${word}"?`,
      answer: meaning,
      options,
      explanation: `"${word}" means: ${meaning}`,
      rawResponse: "fallback-deterministic",
    };
  }

  if (exerciseType === "SENTENCE_CONSTRUCTION") {
    // Sentence word unscramble
    const wordsInSentence = sentence
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
      .split(/\s+/)
      .filter(Boolean);
    const shuffledTokens = shuffleArray([...wordsInSentence]);

    return {
      question: `Construct a valid sentence using the word "${word}":`,
      answer: sentence,
      options: shuffledTokens,
      explanation: `Example usage: "${sentence}"`,
      rawResponse: "fallback-deterministic",
    };
  }

  // Default: FILL_BLANK (Cloze deletion)
  const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi");
  const blankedSentence = regex.test(sentence)
    ? sentence.replace(regex, "[___]")
    : `In this sentence, the missing word is [___]: "${meaning}"`;

  const distractors = COMMON_DISTRACTOR_WORDS.filter((w) => w.toLowerCase() !== word.toLowerCase()).slice(0, 3);
  const options = shuffleArray([word, ...distractors]);

  return {
    question: `Fill in the blank with the correct vocabulary word:\n"${blankedSentence}"`,
    answer: word,
    options,
    explanation: `"${word}" fits the context: ${meaning}`,
    rawResponse: "fallback-deterministic",
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
