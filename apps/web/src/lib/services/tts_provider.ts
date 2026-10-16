/**
 * Indic TTS Provider Interface
 * Supports AI4Bharat Indic-TTS and Bhashini OpenAPI (https://tts.bhashini.ai/openapi/ui/)
 * Model weight licensing: AI4Bharat models are licensed under MIT / CC-BY-4.0.
 * Server credentials, audio streaming/base64 handling, and graceful browser voice fallback.
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
  readonly name = "bhashini";

  async synthesize(req: TTSRequest): Promise<TTSResponse> {
    const apiKey =
      process.env.BHASHINI_API_KEY?.trim() ||
      process.env.BHASHINI_TTS_KEY?.trim();
    const userId = process.env.BHASHINI_USER_ID?.trim();
    const pipelineId = process.env.BHASHINI_PIPELINE_ID?.trim();

    if (!apiKey) {
      return {
        provider: "bhashini",
        available: false,
        message: "BHASHINI_API_KEY not configured. Falling back to browser native speech synthesis.",
      };
    }

    const langName =
      req.language === "mr"
        ? "Marathi"
        : req.language === "hi"
        ? "Hindi"
        : req.language;

    // 1. Try Bhashini OpenAPI v2 direct synthesize endpoint (https://tts.bhashini.ai/openapi/ui/)
    try {
      const openApiRes = await fetch("https://tts.bhashini.ai/v2/synthesize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          text: req.text,
          language: langName,
          voiceName: req.gender === "male" ? "Male1" : "Female1",
          samplingRate: 16000,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (openApiRes.ok) {
        const contentType = openApiRes.headers.get("content-type") || "";
        if (contentType.includes("audio/") || contentType.includes("octet-stream")) {
          const buffer = await openApiRes.arrayBuffer();
          const base64Audio = Buffer.from(buffer).toString("base64");
          return {
            provider: "bhashini",
            available: true,
            audioBase64: base64Audio,
          };
        } else {
          const json = await openApiRes.json();
          if (json.audioBase64 || json.audioContent) {
            return {
              provider: "bhashini",
              available: true,
              audioBase64: json.audioBase64 || json.audioContent,
            };
          }
        }
      }
    } catch (err: any) {
      console.warn("Bhashini OpenAPI synthesize endpoint attempt failed:", err?.message);
    }

    // 2. Try Dhruva inference pipeline if pipeline credentials are provided
    if (userId && pipelineId) {
      try {
        const pipelineRes = await fetch(
          "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
          {
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
          }
        );

        if (pipelineRes.ok) {
          const data = await pipelineRes.json();
          const base64Audio = data.pipelineResponse?.[0]?.output?.[0]?.audioContent;
          if (base64Audio) {
            return {
              provider: "bhashini",
              available: true,
              audioBase64: base64Audio,
            };
          }
        }
      } catch (err: any) {
        console.warn("Bhashini Dhruva pipeline inference attempt failed:", err?.message);
      }
    }

    return {
      provider: "bhashini",
      available: false,
      message: "Bhashini TTS service unavailable or credentials invalid",
    };
  }
}

export class AI4BharatIndicTTSProvider implements ITTSProvider {
  readonly name = "ai4bharat";

  async synthesize(req: TTSRequest): Promise<TTSResponse> {
    const ttsUrl = process.env.INDIC_TTS_URL?.trim();

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

  // Check Bhashini pipeline / OpenAPI if configured
  if (process.env.BHASHINI_API_KEY || process.env.BHASHINI_TTS_KEY) {
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
