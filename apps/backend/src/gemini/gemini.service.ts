import { GenerateContentRequest, GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI, Modality } from '@google/genai';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { STUB_IMAGE_BASE64 } from './stub-image';

const MODEL_FALLBACKS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

// image-gen 전용 모델 리스트. 0.24 SDK 가 IMAGE 모달리티 미지원이라 신규 @google/genai 로 호출.
// 모델 ID 는 Google API ListModels 로 확인 — `-preview` 접미사 유무 주의 (2.5-flash-image 는 GA, 3.1 은 preview).
const IMAGE_MODEL_FALLBACKS = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview'];

type ImageGenMode = 'stub' | 'pollinations' | 'gemini';

const POLLINATIONS_TIMEOUT_MS = 60_000;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenerativeAI;
  private readonly imageClient: GoogleGenAI;
  private readonly imageGenMode: ImageGenMode;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOrThrow<string>('GEMINI_API_KEY');
    this.client = new GoogleGenerativeAI(apiKey);
    this.imageClient = new GoogleGenAI({ apiKey });
    // stub = 고정 sample PNG (cost $0, 플럼빙 검증).
    // pollinations = 무료 community Flux/SD endpoint, 키 없음, 토픽 반영됨.
    // gemini = 나노바나나 — paid tier 필요. 결제 켜고 IMAGE_GEN_MODE=gemini 하면 즉시 교체.
    const raw = this.config.get<string>('IMAGE_GEN_MODE') ?? 'stub';
    this.imageGenMode = raw === 'gemini' || raw === 'pollinations' ? raw : 'stub';
    this.logger.log(`IMAGE_GEN_MODE=${this.imageGenMode}`);
  }

  async generateText(request: GenerateContentRequest): Promise<string> {
    const { value } = await this.generateValidated(request, (raw) => raw);
    return value;
  }

  // parse 실패도 모델 폴백 트리거 — JSON/zod 검증을 폴백 루프 안으로 끌어들임.
  async generateValidated<T>(
    request: GenerateContentRequest,
    parse: (raw: string) => T,
  ): Promise<{ value: T; modelUsed: string }> {
    let lastError: unknown;
    for (const modelName of MODEL_FALLBACKS) {
      try {
        const model = this.client.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(request);
        const text = result.response.text().trim();
        if (!text) throw new Error(`empty response from ${modelName}`);
        const value = parse(text);
        return { value, modelUsed: modelName };
      } catch (err) {
        lastError = err;
        this.logger.warn(`gemini ${modelName} failed: ${(err as Error).message}`);
      }
    }
    throw new ServiceUnavailableException(
      `Gemini all models failed: ${(lastError as Error)?.message ?? 'unknown'}`,
    );
  }

  // cover/outro 카드 배경 즉석 생성용. 모드별로 prompt 형태가 달라서 양쪽 다 받음.
  // 응답 base64 는 frontend React state 에만 보관 (DB / Storage 저장 X — 메모리 룰 [project_infra_defer]).
  async generateImage(args: {
    geminiPrompt: string;
    geminiSystemInstruction?: string;
    fluxPrompt: string;
  }): Promise<{ imageBase64: string; modelUsed: string }> {
    if (this.imageGenMode === 'stub') {
      return { imageBase64: STUB_IMAGE_BASE64, modelUsed: 'stub' };
    }
    if (this.imageGenMode === 'pollinations') {
      return this.generateImagePollinations(args.fluxPrompt);
    }
    let lastError: unknown;
    for (const modelName of IMAGE_MODEL_FALLBACKS) {
      try {
        const response = await this.imageClient.models.generateContent({
          model: modelName,
          contents: args.geminiPrompt,
          config: {
            responseModalities: [Modality.IMAGE],
            ...(args.geminiSystemInstruction
              ? { systemInstruction: args.geminiSystemInstruction }
              : {}),
          },
        });
        const data = response.data;
        if (!data) throw new Error(`empty inline data from ${modelName}`);
        return { imageBase64: data, modelUsed: modelName };
      } catch (err) {
        lastError = err;
        this.logger.warn(`gemini image ${modelName} failed: ${(err as Error).message}`);
      }
    }
    throw new ServiceUnavailableException(
      `Gemini image gen all models failed: ${(lastError as Error)?.message ?? 'unknown'}`,
    );
  }

  // Pollinations.ai — community Flux endpoint, 키/가입 없음. URL 안에 prompt 인코딩.
  // Flux 는 영어 위주 + 첫 ~75 토큰만 강하게 반영 → 한국어 prompt 를 Gemini text 로
  // 영어 visual 키워드로 먼저 정제 (free tier, ~1s) 후 Pollinations 에 전송.
  private async generateImagePollinations(
    koreanPrompt: string,
  ): Promise<{ imageBase64: string; modelUsed: string }> {
    let englishPrompt: string;
    try {
      englishPrompt = await this.generateText({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `다음 한국어 이미지 설명을 Stable Diffusion / Flux 에 던질 짧은 영어 visual 키워드 prompt 로 변환해줘.

규칙:
- 주제(subject) 에 해당하는 명사/동작을 가장 앞에 배치
- "minimalist pastel illustration, korean instagram aesthetic, soft warm colors, square 1:1, no text, no faces" 스타일 디스크립터를 끝에 포함
- 30~50 단어 이내, 단일 라인, 콤마 구분
- 설명/접두사/마크다운 일체 없이 키워드 prompt 한 줄만 출력

한국어 입력:
"""${koreanPrompt}"""

영어 키워드 prompt:`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.3 },
      });
      englishPrompt = englishPrompt.trim().replace(/^["']|["']$/g, '');
      this.logger.log(`flux prompt (translated): ${englishPrompt}`);
    } catch (err) {
      this.logger.warn(
        `Korean→English translation failed, sending Korean as-is: ${(err as Error).message}`,
      );
      englishPrompt = koreanPrompt;
    }

    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(englishPrompt)}?width=1024&height=1024&model=flux&nologo=true`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), POLLINATIONS_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) {
        throw new ServiceUnavailableException(
          `Pollinations failed: ${res.status} ${res.statusText}`,
        );
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      return { imageBase64: buffer.toString('base64'), modelUsed: 'pollinations:flux' };
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      throw new ServiceUnavailableException(
        `Pollinations error: ${(err as Error).message ?? 'unknown'}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
