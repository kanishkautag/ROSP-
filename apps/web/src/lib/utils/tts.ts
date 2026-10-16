/**
 * Multilingual Pronunciation Engine
 * Supports: English (en), Hindi (hi), Marathi (mr)
 *
 * Prioritization:
 * 1. Licensed native speaker audio (Wikimedia Commons, Common Voice, or local asset).
 * 2. AI4Bharat / Bhashini Indic TTS service provider.
 * 3. Browser SpeechSynthesis fallback IF AND ONLY IF a genuine voice for the language is available.
 * 4. Useful unavailable state: Never speak Hindi or Marathi in an English voice!
 */

export interface PronunciationOptions {
  text: string;
  language?: string | null;
  pronunciationUrl?: string | null;
  onStatusChange?: (status: {
    state: "playing" | "success" | "unavailable" | "error";
    source?: "native-audio" | "indic-tts" | "browser-voice" | "none";
    message?: string;
  }) => void;
}

export function getLanguageConfig(language: string) {
  const code = (language || "en").toLowerCase();
  if (code === "hi" || code.startsWith("hi")) {
    return { bcp47: "hi-IN", fallbackName: "Hindi", rate: 0.85 };
  }
  if (code === "mr" || code.startsWith("mr")) {
    return { bcp47: "mr-IN", fallbackName: "Marathi", rate: 0.85 };
  }
  return { bcp47: "en-US", fallbackName: "English", rate: 0.9 };
}

export function hasNativeVoiceAvailable(language: string, voices: Array<{ name: string; lang: string }>): boolean {
  const code = (language || "en").toLowerCase();
  if (code === "hi" || code.startsWith("hi")) {
    return voices.some(
      (v) =>
        (v.lang === "hi-IN" || v.lang === "hi" || v.lang.startsWith("hi-") || v.name.toLowerCase().includes("hindi")) &&
        !v.lang.startsWith("en")
    );
  }
  if (code === "mr" || code.startsWith("mr")) {
    return voices.some(
      (v) =>
        (v.lang === "mr-IN" || v.lang === "mr" || v.lang.startsWith("mr-") || v.name.toLowerCase().includes("marathi")) &&
        !v.lang.startsWith("en")
    );
  }
  return voices.some((v) => v.lang.startsWith("en"));
}

export async function playPronunciation({
  text,
  language = "en",
  pronunciationUrl,
  onStatusChange,
}: PronunciationOptions): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const langCode = (language || "en").toLowerCase();
  const isHindi = langCode === "hi" || langCode.startsWith("hi");
  const isMarathi = langCode === "mr" || langCode.startsWith("mr");

  // Priority 1: Licensed Native Speaker Audio URL
  if (pronunciationUrl && pronunciationUrl.trim()) {
    try {
      onStatusChange?.({ state: "playing", source: "native-audio", message: "Playing native speaker recording" });
      const audio = new Audio(pronunciationUrl);
      await audio.play();
      onStatusChange?.({ state: "success", source: "native-audio", message: "Native recording played" });
      return true;
    } catch (audioErr) {
      console.warn("Direct audio playback failed, trying TTS pipeline:", audioErr);
    }
  }

  // Priority 2: AI4Bharat / Bhashini Server-Side Provider
  if (isHindi || isMarathi) {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: langCode }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.available && (data.audioBase64 || data.audioUrl)) {
          onStatusChange?.({ state: "playing", source: "indic-tts", message: "Playing Indic TTS audio" });
          const src = data.audioUrl || `data:audio/wav;base64,${data.audioBase64}`;
          const audio = new Audio(src);
          await audio.play();
          onStatusChange?.({ state: "success", source: "indic-tts", message: "Indic TTS played" });
          return true;
        }
      }
    } catch {
      // Proceed to browser voice fallback
    }
  }

  // Priority 3: Browser SpeechSynthesis with Strict Language Voice Matching
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();

      if (isMarathi) {
        utterance.lang = "mr-IN";
        utterance.rate = 0.85;

        const mrVoice = voices.find(
          (v) =>
            v.lang === "mr-IN" ||
            v.lang === "mr" ||
            v.lang.startsWith("mr-") ||
            v.name.toLowerCase().includes("marathi") ||
            v.name.toLowerCase().includes("aarohi") ||
            v.name.toLowerCase().includes("manohar")
        );

        if (!mrVoice) {
          // Do NOT speak Marathi with English voice!
          const msg = "No Marathi (mr-IN) voice installed on your system. Please install the Marathi language pack or enable cloud Indic TTS.";
          console.warn(msg);
          onStatusChange?.({
            state: "unavailable",
            source: "none",
            message: msg,
          });
          return false;
        }

        utterance.voice = mrVoice;
      } else if (isHindi) {
        utterance.lang = "hi-IN";
        utterance.rate = 0.85;

        const hiVoice = voices.find(
          (v) =>
            v.lang === "hi-IN" ||
            v.lang === "hi" ||
            v.lang.startsWith("hi-") ||
            v.name.toLowerCase().includes("hindi") ||
            v.name.toLowerCase().includes("hemant") ||
            v.name.toLowerCase().includes("kalpana") ||
            v.name.toLowerCase().includes("madhur") ||
            v.name.toLowerCase().includes("swara")
        );

        if (!hiVoice) {
          // Do NOT speak Hindi with English voice!
          const msg = "No Hindi (hi-IN) voice installed on your system. Please install the Hindi language pack or enable cloud Indic TTS.";
          console.warn(msg);
          onStatusChange?.({
            state: "unavailable",
            source: "none",
            message: msg,
          });
          return false;
        }

        utterance.voice = hiVoice;
      } else {
        // English
        utterance.lang = "en-US";
        utterance.rate = 0.9;
        const enVoice = voices.find(
          (v) => v.lang.startsWith("en") && !v.name.toLowerCase().includes("indian")
        ) || voices.find((v) => v.lang.startsWith("en"));

        if (enVoice) utterance.voice = enVoice;
      }

      onStatusChange?.({ state: "playing", source: "browser-voice", message: "Speaking via system voice" });
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.error("Browser speech synthesis error:", err);
    }
  }

  // Priority 4: Unavailable state
  onStatusChange?.({
    state: "unavailable",
    source: "none",
    message: `Pronunciation for ${langCode.toUpperCase()} is unavailable on this device.`,
  });
  return false;
}

/**
 * Convenience wrapper for components
 */
export function speakWord(
  text: string,
  language?: string | null,
  pronunciationUrl?: string | null
) {
  playPronunciation({
    text,
    language,
    pronunciationUrl,
    onStatusChange: (status) => {
      if (status.state === "unavailable" && status.message) {
        // Log friendly note in console for debugging
        console.info(`[Pronunciation Status] ${status.message}`);
      }
    },
  });
}
