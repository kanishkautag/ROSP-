import { PrismaClient, Algorithm } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

const sampleWords = [
  {
    word: "apple",
    language: "en",
    meaning: "a round fruit with red or green skin and firm white flesh",
    example: "She ate a crisp red apple for breakfast.",
    partOfSpeech: "noun",
    cefrLevel: "A1",
    frequency: 85.5,
    frequencyRank: 1200,
    source: "Oxford 3000",
  },
  {
    word: "house",
    language: "en",
    meaning: "a building made for people to live in, usually for one family",
    example: "They bought a charming house near the park.",
    partOfSpeech: "noun",
    cefrLevel: "A1",
    frequency: 92.1,
    frequencyRank: 450,
    source: "Oxford 3000",
  },
  {
    word: "beautiful",
    language: "en",
    meaning: "pleasing the senses or mind aesthetically; having beauty",
    example: "The sunset over the mountains was exceptionally beautiful.",
    partOfSpeech: "adjective",
    cefrLevel: "A1",
    frequency: 78.4,
    frequencyRank: 1650,
    source: "Oxford 3000",
  },
  {
    word: "important",
    language: "en",
    meaning: "of great significance or value; likely to have a profound effect",
    example: "Consistent daily practice is important when mastering a language.",
    partOfSpeech: "adjective",
    cefrLevel: "A2",
    frequency: 88.0,
    frequencyRank: 600,
    source: "Oxford 3000",
  },
  {
    word: "language",
    language: "en",
    meaning: "a system of communication consisting of words, sounds, and grammar",
    example: "Learning a new language opens doors to different cultures.",
    partOfSpeech: "noun",
    cefrLevel: "A2",
    frequency: 82.3,
    frequencyRank: 950,
    source: "Oxford 3000",
  },
];

async function main() {
  console.log("Seeding development database...");

  const defaultPasswordHash = await hashPassword("password123");

  // 1. Create or get development user with password
  const devUser = await prisma.user.upsert({
    where: { email: "dev@rosp.local" },
    update: {
      passwordHash: defaultPasswordHash,
    },
    create: {
      email: "dev@rosp.local",
      name: "Development User",
      passwordHash: defaultPasswordHash,
      image: "https://avatar.vercel.sh/dev@rosp.local",
    },
  });
  console.log(`Development user ready: ${devUser.id} (${devUser.email}) with password "password123"`);

  // 2. Create or get default WordList
  let wordList = await prisma.wordList.findFirst({
    where: {
      userId: devUser.id,
      name: "English Basics",
    },
  });

  if (!wordList) {
    wordList = await prisma.wordList.create({
      data: {
        userId: devUser.id,
        name: "English Basics",
        description: "Essential foundation vocabulary for language learners",
      },
    });
  }
  console.log(`Word list ready: ${wordList.id} (${wordList.name})`);

  // 3. Insert vocabulary words, link to list, and initialize user learning state
  for (const item of sampleWords) {
    let wordRecord = await prisma.vocabularyWord.findFirst({
      where: {
        word: item.word,
        language: item.language,
      },
    });

    if (!wordRecord) {
      wordRecord = await prisma.vocabularyWord.create({
        data: item,
      });
    }

    // Link word to list
    await prisma.wordListItem.upsert({
      where: {
        wordListId_vocabularyWordId: {
          wordListId: wordList.id,
          vocabularyWordId: wordRecord.id,
        },
      },
      update: {},
      create: {
        wordListId: wordList.id,
        vocabularyWordId: wordRecord.id,
      },
    });

    // Create user word relationship
    const userWord = await prisma.userWord.upsert({
      where: {
        userId_vocabularyWordId: {
          userId: devUser.id,
          vocabularyWordId: wordRecord.id,
        },
      },
      update: {},
      create: {
        userId: devUser.id,
        vocabularyWordId: wordRecord.id,
      },
    });

    // Initialize learning state
    await prisma.learningState.upsert({
      where: {
        userWordId: userWord.id,
      },
      update: {},
      create: {
        userWordId: userWord.id,
        algorithm: Algorithm.SM2,
        repetitions: 0,
        interval: 1.0,
        easeFactor: 2.5,
        nextReviewAt: new Date(),
      },
    });
  }

  console.log("Database seeded successfully with 5 initial vocabulary items.");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
