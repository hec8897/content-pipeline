import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { STUB_IMAGE_BASE64 } from './stub-image';
import type { LlmRequest } from './types';

// 텍스트 폴백 체인: 메인 → mini. parse/JSON 실패 / 429 / 5xx 발생 시 다음 모델.
const TEXT_MODEL_FALLBACKS = ['gpt-5', 'gpt-5-mini'];

// 이미지 모델: 단일. 실패 시 503 throw (폴백 없음).
const IMAGE_MODEL = 'gpt-image-1';

type ImageGenMode = 'stub' | 'openai';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly client: OpenAI;
  private readonly imageGenMode: ImageGenMode;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOrThrow<string>('OPENAI_API_KEY');
    this.client = new OpenAI({ apiKey });
    // stub = 고정 sample PNG (cost $0, 플럼빙 검증용)
    // openai = gpt-image-1 (medium, 1024×1024)
    const raw = this.config.get<string>('IMAGE_GEN_MODE') ?? 'openai';
    this.imageGenMode = raw === 'stub' ? 'stub' : 'openai';
    this.logger.log(`IMAGE_GEN_MODE=${this.imageGenMode}`);
  }

  async generateText(request: LlmRequest): Promise<string> {
    const { value } = await this.generateValidated(request, (raw) => raw);
    return value;
  }

  // parse 실패도 모델 폴백 트리거 — JSON/zod 검증을 폴백 루프 안으로 끌어들임.
  async generateValidated<T>(
    request: LlmRequest,
    parse: (raw: string) => T,
  ): Promise<{ value: T; modelUsed: string }> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (request.system) {
      messages.push({ role: 'system', content: request.system });
    }
    for (const m of request.messages) {
      messages.push({ role: m.role, content: m.content });
    }

    let lastError: unknown;
    for (const modelName of TEXT_MODEL_FALLBACKS) {
      try {
        // gpt-5 family 는 temperature default(1) 만 지원 — LlmRequest.temperature 는 의도적
        // 무시. 인터페이스 자체는 향후 다른 모델 호환을 위해 유지.
        const completion = await this.client.chat.completions.create({
          model: modelName,
          messages,
          ...(request.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        });
        const text = completion.choices[0]?.message?.content?.trim();
        if (!text) throw new Error(`empty response from ${modelName}`);
        const value = parse(text);
        return { value, modelUsed: modelName };
      } catch (err) {
        lastError = err;
        this.logger.warn(`openai ${modelName} failed: ${(err as Error).message}`);
      }
    }
    throw new ServiceUnavailableException(
      `OpenAI all text models failed: ${(lastError as Error)?.message ?? 'unknown'}`,
    );
  }

  // 카드 배경 이미지 생성. 응답은 클라 in-memory 만 (DB/Storage 저장 X).
  async generateImage(args: {
    prompt: string;
  }): Promise<{ imageBase64: string; modelUsed: string }> {
    if (this.imageGenMode === 'stub') {
      return { imageBase64: STUB_IMAGE_BASE64, modelUsed: 'stub' };
    }
    try {
      const response = await this.client.images.generate({
        model: IMAGE_MODEL,
        prompt: args.prompt,
        size: '1024x1024',
        quality: 'medium',
        n: 1,
      });
      const b64 = response.data?.[0]?.b64_json;
      if (!b64) throw new Error(`empty b64_json from ${IMAGE_MODEL}`);
      return { imageBase64: b64, modelUsed: IMAGE_MODEL };
    } catch (err) {
      this.logger.warn(`openai image ${IMAGE_MODEL} failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        `OpenAI image gen failed: ${(err as Error).message ?? 'unknown'}`,
      );
    }
  }
}
