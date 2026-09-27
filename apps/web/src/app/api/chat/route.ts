import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { llmService } from "@/lib/llm/llm_service";
import prisma from "@rosp/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { messages, currentWord, currentMeaning, currentExample } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array required" }, { status: 400 });
    }

    // Get user's weak words and recent words for rich context if user logged in
    let userContext = "";
    if (user) {
      const recentAttempts = await prisma.reviewAttempt.findMany({
        where: { userId: user.id },
        include: { userWord: { include: { vocabularyWord: true } } },
        orderBy: { reviewedAt: "desc" },
        take: 5,
      });

      const recentWords = recentAttempts
        .map((a) => `${a.userWord.vocabularyWord.word} (${a.correct ? "mastered" : "needs practice"})`)
        .join(", ");

      if (recentWords) {
        userContext = `\nLearner's recent review words: ${recentWords}.`;
      }
    }

    const systemPrompt = `You are Lexi, an encouraging, highly knowledgeable AI language tutor and vocabulary coach for the LinguaPulse Language Learning app.
Current Word in Focus: "${currentWord || "General Vocabulary"}"
Meaning: "${currentMeaning || "N/A"}"
Example: "${currentExample || "N/A"}"
${userContext}

Your mission:
- Help the user deeply understand vocabulary, nuances, collocations, and etymology.
- Offer vivid mnemonics, real-world conversational examples, and concise quizzes when asked.
- Keep responses engaging, supportive, and formatted in clean markdown with bullet points or bold highlights.
- If the user asks for a quiz or reminder, test them interactively and give feedback on their answer.`;

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({
        reply: "Groq API key is not configured. Please ensure GROQ_API_KEY is set in your environment.",
      });
    }

    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    const model = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: 0.5,
        max_tokens: 600,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => "");
      console.error("Groq chat error:", groqRes.status, errText);
      return NextResponse.json({
        reply: "I'm having a brief connection issue reaching Groq. Please try asking again in a moment!",
      });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || "I didn't quite catch that. Could you ask again?";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
