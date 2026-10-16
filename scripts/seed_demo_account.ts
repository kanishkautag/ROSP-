import prisma from "../packages/db/client";
import { getActivityDate, getPreviousDate } from "../apps/web/src/lib/services/streak_service";
import crypto from "crypto";

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export async function seedDemoAccount() {
  console.log("=== ROSP Demo Account Seeding Script ===");

  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEMO_SEED) {
    throw new Error("Demo account seeding is strictly disabled in production.");
  }

  const email = "demo@rosp.local";
  const rawPassword = process.env.DEMO_USER_PASSWORD || "DemoPass2026!";
  const timezone = "Asia/Kolkata";
  const dailyGoal = 10;

  console.log(`Setting up demo user: ${email} (Timezone: ${timezone}, Daily Goal: ${dailyGoal})`);

  const passwordHash = await hashPassword(rawPassword);

  // 1. Create or update Demo User
  const demoUser = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      timezone,
      dailyGoal,
      name: "Demo Learner (Indic & English)",
      image: "https://avatar.vercel.sh/demo@rosp.local",
    },
    create: {
      email,
      passwordHash,
      name: "Demo Learner (Indic & English)",
      timezone,
      dailyGoal,
      image: "https://avatar.vercel.sh/demo@rosp.local",
    },
  });

  console.log(`Demo user ready with ID: ${demoUser.id}`);

  // 2. Clear previous demo activity, review attempts, and XP events for clean calculation
  await prisma.xpEvent.deleteMany({ where: { userId: demoUser.id } });
  await prisma.dailyActivity.deleteMany({ where: { userId: demoUser.id } });
  await prisma.reviewAttempt.deleteMany({ where: { userId: demoUser.id } });

  // 3. Fetch vocabulary words across Hindi, Marathi, and English
  const [hindiWords, marathiWords, englishWords] = await Promise.all([
    prisma.vocabularyWord.findMany({ where: { language: "hi" } }),
    prisma.vocabularyWord.findMany({ where: { language: "mr" } }),
    prisma.vocabularyWord.findMany({ where: { language: "en" } }),
  ]);

  console.log(
    `Available words for demo: Hindi (${hindiWords.length}), Marathi (${marathiWords.length}), English (${englishWords.length})`
  );

  if (hindiWords.length === 0 || marathiWords.length === 0 || englishWords.length === 0) {
    throw new Error("Vocabulary not populated. Run pnpm vocab:ingest first.");
  }

  // 4. Create three separate, independent WordLists for Demo User
  const collections = [
    {
      name: "Hindi Essentials & Conversational (हिंदी)",
      description: "Core Hindi vocabulary, common idioms, and daily conversational expressions.",
      words: hindiWords,
    },
    {
      name: "Marathi Native Lexicon & Grammar (मराठी)",
      description: "Authentic Marathi vocabulary with gender, verb forms, and cultural expressions.",
      words: marathiWords,
    },
    {
      name: "English Academic & Conversational (English)",
      description: "Essential academic and conversational lexicon for proficient English learners.",
      words: englishWords,
    },
  ];

  const allDemoWords: any[] = [];
  const userWordMap = new Map<string, string>(); // vocabularyWordId -> userWordId

  for (const col of collections) {
    let list = await prisma.wordList.findFirst({
      where: { userId: demoUser.id, name: col.name },
    });

    if (!list) {
      list = await prisma.wordList.create({
        data: {
          userId: demoUser.id,
          name: col.name,
          description: col.description,
        },
      });
    }

    // Link words to list
    const listItems = col.words.map((w) => ({
      wordListId: list!.id,
      vocabularyWordId: w.id,
    }));

    await prisma.wordListItem.createMany({
      data: listItems,
      skipDuplicates: true,
    });

    // Create UserWord records
    const userWordsData = col.words.map((w) => ({
      userId: demoUser.id,
      vocabularyWordId: w.id,
    }));

    await prisma.userWord.createMany({
      data: userWordsData,
      skipDuplicates: true,
    });

    allDemoWords.push(...col.words);
  }

  // Populate userWordMap
  const userWords = await prisma.userWord.findMany({
    where: { userId: demoUser.id },
    select: { id: true, vocabularyWordId: true },
  });
  for (const uw of userWords) {
    userWordMap.set(uw.vocabularyWordId, uw.id);
  }

  // 5. Generate 14 consecutive active local dates ending today in Asia/Kolkata
  const todayStr = getActivityDate(new Date(), timezone);
  const consecutiveDates: string[] = [];

  let currDate = todayStr;
  for (let i = 0; i < 14; i++) {
    consecutiveDates.unshift(currDate); // oldest to newest
    currDate = getPreviousDate(currDate);
  }

  console.log(`Seeding 14 consecutive dates: from ${consecutiveDates[0]} to ${consecutiveDates[13]}`);

  // Create a pool of at least 30 distinct words to cycle through across the 14 days
  // Ensure balanced representation of Hindi, Marathi, and English
  const selectedPool: any[] = [];
  const maxPoolSize = 30;
  for (let i = 0; i < maxPoolSize; i++) {
    if (i % 3 === 0 && marathiWords[Math.floor(i / 3) % marathiWords.length]) {
      selectedPool.push(marathiWords[Math.floor(i / 3) % marathiWords.length]);
    } else if (i % 3 === 1 && hindiWords[Math.floor(i / 3) % hindiWords.length]) {
      selectedPool.push(hindiWords[Math.floor(i / 3) % hindiWords.length]);
    } else {
      selectedPool.push(englishWords[Math.floor(i / 3) % englishWords.length]);
    }
  }

  let totalSeededXp = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;

  for (let dayIndex = 0; dayIndex < 14; dayIndex++) {
    const dateStr = consecutiveDates[dayIndex];
    // Pick 10 distinct words for this date by rotating through the pool
    const dayWords: any[] = [];
    for (let w = 0; w < 10; w++) {
      const wordIndex = (dayIndex * 3 + w) % selectedPool.length;
      dayWords.push(selectedPool[wordIndex]);
    }

    // Parse dateStr to create realistic timestamp in Asia/Kolkata (e.g. 10:30 AM local time)
    const [y, m, d] = dateStr.split("-").map(Number);
    // 10:30 AM in Asia/Kolkata is 05:00 UTC
    const dateTimestamp = new Date(Date.UTC(y, m - 1, d, 5, 0 + dayIndex, 0));

    let dayXp = 0;

    for (let wordIndex = 0; wordIndex < 10; wordIndex++) {
      const word = dayWords[wordIndex];
      const userWordId = userWordMap.get(word.id);
      if (!userWordId) continue;

      // 8 correct, 2 incorrect (words at index 0..7 are correct, 8..9 are incorrect)
      const isCorrect = wordIndex < 8;
      const rating = isCorrect ? 3 : 1;

      if (isCorrect) totalCorrect++;
      else totalIncorrect++;

      // 1. Create ReviewAttempt
      await prisma.reviewAttempt.create({
        data: {
          userId: demoUser.id,
          userWordId,
          rating,
          correct: isCorrect,
          reviewedAt: dateTimestamp,
          previousInterval: 1.0,
          newInterval: isCorrect ? 3.0 : 1.0,
          previousEaseFactor: 2.5,
          newEaseFactor: isCorrect ? 2.6 : 2.3,
        },
      });

      // 2. Award 5 XP for first review of distinct word that day
      const reviewKey = `user_${demoUser.id}_${dateStr}_${word.id}_review`;
      await prisma.xpEvent.create({
        data: {
          userId: demoUser.id,
          amount: 5,
          reason: "WORD_REVIEW",
          idempotencyKey: reviewKey,
          activityDate: dateStr,
          vocabularyWordId: word.id,
          createdAt: dateTimestamp,
        },
      });
      dayXp += 5;

      // 3. Award 5 bonus XP if first answer is correct
      if (isCorrect) {
        const correctKey = `user_${demoUser.id}_${dateStr}_${word.id}_first_correct`;
        await prisma.xpEvent.create({
          data: {
            userId: demoUser.id,
            amount: 5,
            reason: "CORRECT_BONUS",
            idempotencyKey: correctKey,
            activityDate: dateStr,
            vocabularyWordId: word.id,
            createdAt: dateTimestamp,
          },
        });
        dayXp += 5;
      }
    }

    // 4. Award 20 bonus XP for reaching daily goal (10 words >= 10 dailyGoal)
    const goalKey = `user_${demoUser.id}_${dateStr}_daily_goal`;
    await prisma.xpEvent.create({
      data: {
        userId: demoUser.id,
        amount: 20,
        reason: "DAILY_GOAL",
        idempotencyKey: goalKey,
        activityDate: dateStr,
        vocabularyWordId: null,
        createdAt: dateTimestamp,
      },
    });
    dayXp += 20;

    totalSeededXp += dayXp;

    // 5. Create DailyActivity record
    await prisma.dailyActivity.create({
      data: {
        userId: demoUser.id,
        activityDate: dateStr,
        uniqueWordsReviewed: 10,
        dailyGoalCompletedAt: dateTimestamp,
        xpEarned: dayXp,
        createdAt: dateTimestamp,
      },
    });
  }

  // 6. Set up LearningState so that several words are currently due for immediate review
  // Pick 6 words from Hindi, Marathi, and English to be due right now
  const dueVocabItems = [
    hindiWords[0],
    hindiWords[1],
    marathiWords[0],
    marathiWords[1],
    englishWords[0],
    englishWords[1],
  ].filter(Boolean);

  const pastDueTime = new Date(Date.now() - 3600 * 1000); // 1 hour ago
  for (const vocab of dueVocabItems) {
    const userWordId = userWordMap.get(vocab.id);
    if (!userWordId) continue;

    await prisma.learningState.upsert({
      where: { userWordId },
      create: {
        userWordId,
        algorithm: "SM2",
        repetitions: 2,
        interval: 1.0,
        easeFactor: 2.5,
        lastReviewedAt: new Date(Date.now() - 86400 * 1000),
        nextReviewAt: pastDueTime,
      },
      update: {
        repetitions: 2,
        interval: 1.0,
        easeFactor: 2.5,
        lastReviewedAt: new Date(Date.now() - 86400 * 1000),
        nextReviewAt: pastDueTime,
      },
    });
  }

  // Ensure all other userWords have a default learning state
  for (const [vocabId, uwId] of userWordMap.entries()) {
    const existingState = await prisma.learningState.findUnique({
      where: { userWordId: uwId },
    });
    if (!existingState) {
      await prisma.learningState.create({
        data: {
          userWordId: uwId,
          algorithm: "SM2",
          repetitions: 1,
          interval: 2.0,
          easeFactor: 2.5,
          nextReviewAt: new Date(Date.now() + 86400 * 1000 * 2), // due in 2 days
        },
      });
    }
  }

  console.log("=== Demo Account Verification ===");
  console.log(`- Total Seeded XP: ${totalSeededXp} (Target: 1540)`);
  console.log(`- Total Correct First Answers: ${totalCorrect} (Target: 112)`);
  console.log(`- Total Incorrect First Answers: ${totalIncorrect} (Target: 28)`);
  console.log(`- Active Streak Dates: ${consecutiveDates.length} consecutive days`);
  console.log(`- Immediate Due Reviews seeded: ${dueVocabItems.length} cards`);

  return {
    email,
    totalSeededXp,
    totalCorrect,
    totalIncorrect,
    consecutiveDates,
    dueCards: dueVocabItems.length,
  };
}

if (require.main === module) {
  seedDemoAccount()
    .catch((err) => {
      console.error("Demo seeding failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
