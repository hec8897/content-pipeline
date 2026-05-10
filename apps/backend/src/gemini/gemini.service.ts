import { GenerateContentRequest, GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MODEL_FALLBACKS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenerativeAI;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOrThrow<string>('GEMINI_API_KEY');
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateText(request: GenerateContentRequest): Promise<string> {
    let lastError: unknown;
    for (const modelName of MODEL_FALLBACKS) {
      try {
        const model = this.client.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(request);
        const text = result.response.text().trim();
        if (!text) throw new Error(`empty response from ${modelName}`);
        return text;
      } catch (err) {
        lastError = err;
        this.logger.warn(`gemini ${modelName} failed: ${(err as Error).message}`);
      }
    }
    throw new ServiceUnavailableException(
      `Gemini all models failed: ${(lastError as Error)?.message ?? 'unknown'}`,
    );
  }
}
