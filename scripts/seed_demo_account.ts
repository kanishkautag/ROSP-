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

export async function seedSingleAccount(email: string, rawPassword: string) {
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
      name: email === "demo@rosp.local" ? "Demo Learner (Indic & English)" : "Developer Demo (Indic & English)",
      image: `https://avatar.vercel.sh/${email}`,
    },
    create: {
      email,
      passwordHash,
      name: email === "demo@rosp.local" ? "Demo Learner (Indic & English)" : "Developer Demo (Indic & English)",
      timezone,
      dailyGoal,
      image: `https://avatar.vercel.sh/${email}`,
    },
  });

  console.log(`Demo user ready with ID: ${demoUser.id}`);

  // 2. Clear previous demo activity, review attempts, and XP events for clean calculation
  await prisma.xpEvent.deleteMany({ where: { userId: demoUser.id } });
  await prisma.dailyActivity.deleteMany({ where: { userId: demoUser.id } });
  await prisma.reviewAttempt.deleteMany({ where: { userId: demoUser.id } });

  // 3. Fetch vocabulary words across Hindi, Marathi, and English (sample top 50 per language for personal lists)
  const [hindiWords, marathiWords, englishWords] = await Promise.all([
    prisma.vocabularyWord.findMany({ where: { language: "hi" }, take: 60 }),
    prisma.vocabularyWord.findMany({ where: { language: "mr" }, take: 60 }),
    prisma.vocabularyWord.findMany({ where: { language: "en" }, take: 60 }),
  ]);

  if (hindiWords.length === 0 || marathiWords.length === 0 || englishWords.length === 0) {
    throw new Error("Vocabulary not populated. Run pnpm vocab:import-ngsl and pnpm vocab:import-indic first.");
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

  // Create a pool of at least 30 distinct words to cycle through across the 14 days
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

  const reviewAttemptsData: any[] = [];
  const xpEventsData: any[] = [];
  const dailyActivitiesData: any[] = [];

  for (let dayIndex = 0; dayIndex < 14; dayIndex++) {
    const dateStr = consecutiveDates[dayIndex];
    const dayWords: any[] = [];
    for (let w = 0; w < 10; w++) {
      const wordIndex = (dayIndex * 3 + w) % selectedPool.length;
      dayWords.push(selectedPool[wordIndex]);
    }

    const [y, m, d] = dateStr.split("-").map(Number);
    const dateTimestamp = new Date(Date.UTC(y, m - 1, d, 5, 0 + dayIndex, 0));

    let dayXp = 0;

    for (let wordIndex = 0; wordIndex < 10; wordIndex++) {
      const word = dayWords[wordIndex];
      const userWordId = userWordMap.get(word.id);
      if (!userWordId) continue;

      const isCorrect = wordIndex < 8;
      const rating = isCorrect ? 3 : 1;

      if (isCorrect) totalCorrect++;
      else totalIncorrect++;

      reviewAttemptsData.push({
        userId: demoUser.id,
        userWordId,
        rating,
        correct: isCorrect,
        reviewedAt: dateTimestamp,
        previousInterval: 1.0,
        newInterval: isCorrect ? 3.0 : 1.0,
        previousEaseFactor: 2.5,
        newEaseFactor: isCorrect ? 2.6 : 2.3,
      });

      // 2. Award 5 XP for first review of distinct word that day
      const reviewKey = `user_${demoUser.id}_${dateStr}_${word.id}_review`;
      xpEventsData.push({
        userId: demoUser.id,
        amount: 5,
        reason: "WORD_REVIEW",
        idempotencyKey: reviewKey,
        activityDate: dateStr,
        vocabularyWordId: word.id,
        createdAt: dateTimestamp,
      });
      dayXp += 5;

      // 3. Award 5 bonus XP if first answer is correct
      if (isCorrect) {
        const correctKey = `user_${demoUser.id}_${dateStr}_${word.id}_first_correct`;
        xpEventsData.push({
          userId: demoUser.id,
          amount: 5,
          reason: "CORRECT_BONUS",
          idempotencyKey: correctKey,
          activityDate: dateStr,
          vocabularyWordId: word.id,
          createdAt: dateTimestamp,
        });
        dayXp += 5;
      }
    }

    // 4. Award 20 bonus XP for reaching daily goal
    const goalKey = `user_${demoUser.id}_${dateStr}_daily_goal`;
    xpEventsData.push({
      data: undefined,
      userId: demoUser.id,
      amount: 20,
      reason: "DAILY_GOAL",
      idempotencyKey: goalKey,
      activityDate: dateStr,
      vocabularyWordId: null,
      createdAt: dateTimestamp,
    });
    dayXp += 20;

    totalSeededXp += dayXp;

    // 5. DailyActivity record
    dailyActivitiesData.push({
      userId: demoUser.id,
      activityDate: dateStr,
      uniqueWordsReviewed: 10,
      dailyGoalCompletedAt: dateTimestamp,
      xpEarned: dayXp,
      createdAt: dateTimestamp,
    });
  }

  // Batch insert historical data
  console.log(`Batch inserting 140 review attempts for ${email}...`);
  await prisma.reviewAttempt.createMany({ data: reviewAttemptsData });

  console.log(`Batch inserting 266 XP events for ${email}...`);
  await prisma.xpEvent.createMany({ data: xpEventsData });

  console.log(`Batch inserting 14 daily activities for ${email}...`);
  await prisma.dailyActivity.createMany({ data: dailyActivitiesData });

  // 6. Set up LearningState so that several words are currently due for immediate review
  const dueVocabItems = [
    hindiWords[0],
    hindiWords[1],
    marathiWords[0],
    marathiWords[1],
    englishWords[0],
    englishWords[1],
  ].filter(Boolean);

  const pastDueTime = new Date(Date.now() - 3600 * 1000); // 1 hour ago
  const dueUserWordIds = new Set<string>();

  for (const vocab of dueVocabItems) {
    const userWordId = userWordMap.get(vocab.id);
    if (!userWordId) continue;
    dueUserWordIds.add(userWordId);

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

  // Batch insert remaining default learning states
  const remainingLearningStates: any[] = [];
  const futureDueTime = new Date(Date.now() + 86400 * 1000 * 2);

  for (const [, uwId] of userWordMap.entries()) {
    if (!dueUserWordIds.has(uwId)) {
      remainingLearningStates.push({
        userWordId: uwId,
        algorithm: "SM2",
        repetitions: 1,
        interval: 2.0,
        easeFactor: 2.5,
        nextReviewAt: futureDueTime,
      });
    }
  }

  if (remainingLearningStates.length > 0) {
    await prisma.learningState.createMany({
      data: remainingLearningStates,
      skipDuplicates: true,
    });
  }

  console.log(`✓ Completed seeding for ${email}: ${totalSeededXp} XP, 14-day streak, 140 reviews.`);

  return {
    email,
    totalSeededXp,
    totalCorrect,
    totalIncorrect,
    consecutiveDates,
    dueCards: dueVocabItems.length,
  };
}

export async function seedDemoAccount() {
  console.log("=== ROSP Demo Account Fast Batch Seeding Pipeline ===");

  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEMO_SEED) {
    throw new Error("Demo account seeding is strictly disabled in production.");
  }

  const password = process.env.DEMO_USER_PASSWORD || "password123";

  // Seed both canonical demo and dev demo accounts
  const demoResult = await seedSingleAccount("demo@rosp.local", password);
  const devResult = await seedSingleAccount("dev@rosp.local", password);

  return { demoResult, devResult };
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
