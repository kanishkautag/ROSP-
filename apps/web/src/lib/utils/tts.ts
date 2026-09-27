/**
 * Universal Text-to-Speech pronunciation helper supporting English & Hindi (hi-IN)
 * Automatically detects Devanagari Hindi script and sets appropriate voice synthesis.
 */
export function speakWord(text: string, language?: string | null) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Detect Devanagari Hindi characters or explicit "hi" language code
    const isHindi = language === "hi" || /[\u0900-\u097F]/.test(text);

    if (isHindi) {
      utterance.lang = "hi-IN";
      utterance.rate = 0.85;

      const voices = window.speechSynthesis.getVoices();
      const hiVoice = voices.find(
        (v) =>
          v.lang === "hi-IN" ||
          v.lang.startsWith("hi") ||
          v.name.toLowerCase().includes("hindi") ||
          v.name.toLowerCase().includes("hemant") ||
          v.name.toLowerCase().includes("kalpana")
      );
      if (hiVoice) {
        utterance.voice = hiVoice;
      }
    } else {
      utterance.lang = "en-US";
      utterance.rate = 0.9;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("Speech synthesis failed:", err);
  }
}
