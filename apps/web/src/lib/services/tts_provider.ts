/**
 * Indic TTS Provider Interface
 * Supports AI4Bharat Indic-TTS and Bhashini API providers behind a clean abstraction.
 * Model weight licensing: AI4Bharat models are licensed under MIT / CC-BY-4.0.
 * To avoid bundling multi-gigabyte PyTorch/ONNX model weights inside Next.js,
 * TTS operates as an external service provider with client-side licensed audio & browser fallback.
 */

export interface TTSRequest {
  text: string;
  language: "en" | "hi" | "mr" | string;
  gender?: "male" | "female";
}

export interface TTSResponse {
  audioBase64?: string;
  audioUrl?: string;
  provider: "ai4bharat" | "bhashini" | "browser_fallback";
  available: boolean;
  message?: string;
}

export interface ITTSProvider {
  name: string;
  synthesize(req: TTSRequest): Promise<TTSResponse>;
}

export class BhashiniIndicTTSProvider implements ITTSProvider {
  name = "bhashini";

  async synthesize(req: TTSRequest): Promise<TTSResponse> {
    const apiKey = process.env.BHASHINI_API_KEY;
    const userId = process.env.BHASHINI_USER_ID;
    const pipelineId = process.env.BHASHINI_PIPELINE_ID;

    if (!apiKey || !userId || !pipelineId) {
      return {
        provider: "bhashini",
        available: false,
        message: "BHASHINI_API_KEY not configured. Falling back to browser native speech synthesis.",
      };
    }

    try {
      const res = await fetch("https://dhruva-api.bhashini.gov.in/services/inference/pipeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
          userID: userId,
        },
        body: JSON.stringify({
          pipelineTasks: [
            {
              taskType: "tts",
              config: {
                language: { sourceLanguage: req.language },
                gender: req.gender || "female",
              },
            },
          ],
          inputData: {
            input: [{ source: req.text }],
          },
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        return {
          provider: "bhashini",
          available: false,
          message: `Bhashini API returned status ${res.status}`,
        };
      }

      const data = await res.json();
      const base64Audio = data.pipelineResponse?.[0]?.output?.[0]?.audioContent;

      if (base64Audio) {
        return {
          provider: "bhashini",
          available: true,
          audioBase64: base64Audio,
        };
      }
    } catch (err: any) {
      console.warn("Bhashini TTS request failed:", err?.message);
    }

    return {
      provider: "bhashini",
      available: false,
      message: "TTS inference pipeline unavailable",
    };
  }
}

export class AI4BharatIndicTTSProvider implements ITTSProvider {
  name = "ai4bharat";

  async synthesize(req: TTSRequest): Promise<TTSResponse> {
    const ttsUrl = process.env.INDIC_TTS_URL;

    if (!ttsUrl) {
      return {
        provider: "ai4bharat",
        available: false,
        message: "INDIC_TTS_URL not configured. Model weights hosted externally under MIT license.",
      };
    }

    try {
      const res = await fetch(`${ttsUrl}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: req.text,
          language: req.language,
          gender: req.gender || "female",
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioContent || data.audioUrl) {
          return {
            provider: "ai4bharat",
            available: true,
            audioBase64: data.audioContent,
            audioUrl: data.audioUrl,
          };
        }
      }
    } catch (err: any) {
      console.warn("AI4Bharat Indic-TTS request failed:", err?.message);
    }

    return {
      provider: "ai4bharat",
      available: false,
      message: "AI4Bharat endpoint not reachable",
    };
  }
}

export async function synthesizeSpeech(req: TTSRequest): Promise<TTSResponse> {
  // Check AI4Bharat custom endpoint first if configured
  if (process.env.INDIC_TTS_URL) {
    const provider = new AI4BharatIndicTTSProvider();
    const result = await provider.synthesize(req);
    if (result.available) return result;
  }

  // Check Bhashini pipeline if configured
  if (process.env.BHASHINI_API_KEY) {
    const provider = new BhashiniIndicTTSProvider();
    const result = await provider.synthesize(req);
    if (result.available) return result;
  }

  return {
    provider: "browser_fallback",
    available: false,
    message: "No cloud Indic TTS provider configured. Using licensed audio or local browser speech synthesis.",
  };
}
