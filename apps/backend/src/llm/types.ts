// Provider 중립 LLM 요청 타입. prompt 빌더가 SDK 별 타입과 결합하지 않도록 이 인터페이스만
// 반환하고, LlmService 가 OpenAI Chat Completions / Images 형태로 매핑.
// jsonMode=true 면 service 가 response_format: { type: 'json_object' } 으로 강제.
export interface LlmRequest {
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
  jsonMode?: boolean;
}
