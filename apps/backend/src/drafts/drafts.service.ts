import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { InterviewHistoryItem } from '@/interview/interview.prompts';
import { LlmService } from '@/llm/llm.service';
import { StorageService } from '@/storage/storage.service';
import type { Database } from '@/supabase/database.types';
import { SupabaseService } from '@/supabase/supabase.service';

import {
  IMAGE_GEN_SYSTEM,
  buildBlogPrompt,
  buildCardImagePrompt,
  buildCardNewsPrompt,
  parseBlogMarkdown,
} from './drafts.prompts';
import {
  type CardNews,
  type CardNewsCard,
  cardNewsSchema,
  type PatchDraftPayload,
  patchDraftSchema,
} from './drafts.schema';

type TopicRow = Database['public']['Tables']['topics']['Row'];
type SessionRow = Database['public']['Tables']['interview_sessions']['Row'];
type MessageRow = Database['public']['Tables']['interview_messages']['Row'];
type DraftRow = Database['public']['Tables']['drafts']['Row'];

export interface DraftState {
  topic: TopicRow;
  draft: DraftRow | null;
}

export interface InterviewQA {
  questionId: string;
  question: string;
  answerId: string | null;
  answer: string | null;
}

export interface InterviewSummary {
  sessionId: string;
  status: SessionRow['status'];
  qa: InterviewQA[];
}

@Injectable()
export class DraftsService {
  private readonly logger = new Logger(DraftsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly llm: LlmService,
    private readonly storage: StorageService,
  ) {}

  async getForTopic(topicId: string, userId: string): Promise<DraftState> {
    const topic = await this.loadOwnedTopic(topicId, userId);
    const draft = await this.loadDraftByTopic(topicId);
    return { topic, draft };
  }

  async getInterviewForDraft(draftId: string, userId: string): Promise<InterviewSummary | null> {
    const draft = await this.loadOwnedDraft(draftId, userId);
    const session = await this.loadLatestSession(draft.topic_id);
    if (!session) return null;

    const messages = await this.loadMessages(session.id);
    const byTurn = new Map<number, { question?: MessageRow; answer?: MessageRow }>();
    for (const m of messages) {
      const slot = byTurn.get(m.turn) ?? {};
      if (m.role === 'assistant') slot.question = m;
      else slot.answer = m;
      byTurn.set(m.turn, slot);
    }
    const qa: InterviewQA[] = Array.from(byTurn.entries())
      .sort(([a], [b]) => a - b)
      .filter(([, slot]) => slot.question)
      .map(([, slot]) => ({
        questionId: slot.question!.id,
        question: slot.question!.content,
        answerId: slot.answer?.id ?? null,
        answer: slot.answer?.content ?? null,
      }));

    return { sessionId: session.id, status: session.status, qa };
  }

  async listForUser(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('drafts')
      .select(
        'id, status, blog_title, blog_body, blog_tags, card_news, created_at, updated_at, topic:topics!inner(id, title)',
      )
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw new BadRequestException(`Failed to list drafts: ${error.message}`);
    return data ?? [];
  }

  async generate(topicId: string, userId: string): Promise<DraftRow> {
    const topic = await this.loadOwnedTopic(topicId, userId);

    const session = await this.loadLatestSession(topicId);
    if (session?.status === 'active') {
      throw new BadRequestException('Interview is still active. Stop or complete it first.');
    }

    const history: InterviewHistoryItem[] = session
      ? (await this.loadMessages(session.id)).map((m) => ({
          role: m.role as 'assistant' | 'user',
          content: m.content,
        }))
      : [];

    const draft = await this.upsertGenerating(topicId, userId);

    try {
      const cardResult = await this.llm.generateValidated(
        buildCardNewsPrompt(topic.title, history),
        (raw) => {
          // jsonMode 라 LLM 응답은 { cards: [...] } object. cards 필드 추출 후 tuple 검증.
          const parsed = JSON.parse(raw) as { cards?: unknown };
          if (!parsed.cards) throw new Error('missing cards field in LLM response');
          return cardNewsSchema.parse(parsed.cards);
        },
      );

      const blogResult = await this.llm.generateValidated(
        buildBlogPrompt(topic.title, history),
        (raw): ReturnType<typeof parseBlogMarkdown> => {
          const parsed = parseBlogMarkdown(raw);
          if (parsed.body.length < 200) {
            throw new Error('blog body too short');
          }
          return parsed;
        },
      );

      // Phase 7.5 — 첫 카드(표지) cover AI 이미지를 markReady 전에 채움. 실패해도 텍스트 양산은
      // 살리고 cover 만 비운 채 ready (사용자가 나중에 수동 재생성). 텍스트 실패만 양산 실패로 간주.
      const cards = cardResult.value;
      try {
        const coverUrl = await this.renderCardImage(userId, draft.id, 0, cards[0], topic.title);
        cards[0] = { ...cards[0], bg_image: coverUrl };
      } catch (imgErr) {
        const message = imgErr instanceof Error ? imgErr.message : 'unknown error';
        this.logger.warn(`cover image generation failed for draft=${draft.id}: ${message}`);
      }

      const finalTitle = blogResult.value.title || topic.title;
      return await this.markReady(
        draft.id,
        cards,
        finalTitle,
        blogResult.value.body,
        blogResult.value.tags,
        `card=${cardResult.modelUsed},blog=${blogResult.modelUsed}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      this.logger.error(`draft generation failed for topic=${topicId}: ${message}`);
      await this.markFailed(draft.id, message);
      throw new ServiceUnavailableException(`양산에 실패했어요. 잠시 후 다시 시도해주세요.`);
    }
  }

  // Phase 7.5 — 카드 이미지 재생성/업로드 공통 검증. ready 상태 + 본인 소유 + index 범위.
  private async requireOwnedReadyDraftForCard(
    draftId: string,
    userId: string,
    cardIndex: number,
  ): Promise<{ draft: DraftRow; cards: CardNews }> {
    const draft = await this.loadOwnedDraft(draftId, userId);
    if (draft.status !== 'ready') {
      throw new BadRequestException('Draft is not ready');
    }
    const cards = draft.card_news as CardNews | null;
    if (!cards || !Array.isArray(cards)) {
      throw new BadRequestException('Draft has no card_news');
    }
    if (cardIndex < 0 || cardIndex >= cards.length) {
      throw new BadRequestException(`cardIndex ${cardIndex} out of range`);
    }
    return { draft, cards };
  }

  // Phase 7.5 — 카드 1장 AI 배경 이미지 생성 코어. 프롬프트 빌드 → 생성 → Storage push → public URL.
  // ready 검증을 밖으로 빼서 양산(generate, 아직 ready 아님)과 regenerate(ready) 양쪽이 공유.
  private async renderCardImage(
    userId: string,
    draftId: string,
    cardIndex: number,
    card: CardNewsCard,
    topicTitle: string,
  ): Promise<string> {
    const fullPrompt = `${IMAGE_GEN_SYSTEM}\n\n---\n\n${buildCardImagePrompt(card, topicTitle)}`;
    const { imageBase64 } = await this.llm.generateImage({ prompt: fullPrompt });
    return this.storage.uploadCardImage({
      userId,
      draftId,
      cardIndex,
      body: Buffer.from(imageBase64, 'base64'),
      contentType: 'image/png', // gpt-image-1 은 PNG b64
    });
  }

  // Phase 7.5 — AI 배경 이미지 재생성. PNG 결과를 Storage 에 push 후 public URL 반환.
  // DB(card_news[idx].bg_image) 저장은 안 함 — 프론트가 편집 상태로 들고 있다 PATCH 때 영속화.
  async regenerateCardImage(
    draftId: string,
    userId: string,
    cardIndex: number,
  ): Promise<{ imageUrl: string }> {
    const { draft, cards } = await this.requireOwnedReadyDraftForCard(draftId, userId, cardIndex);
    const topic = await this.loadOwnedTopic(draft.topic_id, userId);
    const imageUrl = await this.renderCardImage(
      userId,
      draftId,
      cardIndex,
      cards[cardIndex],
      topic.title,
    );
    return { imageUrl };
  }

  // Phase 7.5 — 사용자 업로드 이미지를 Storage 에 push 후 public URL 반환. regenerate 와 동일하게 DB 미저장.
  async uploadCardImage(args: {
    draftId: string;
    userId: string;
    cardIndex: number;
    body: Buffer;
    contentType: string;
  }): Promise<{ imageUrl: string }> {
    await this.requireOwnedReadyDraftForCard(args.draftId, args.userId, args.cardIndex);

    const imageUrl = await this.storage.uploadCardImage({
      userId: args.userId,
      draftId: args.draftId,
      cardIndex: args.cardIndex,
      body: args.body,
      contentType: args.contentType,
    });
    return { imageUrl };
  }

  async patch(draftId: string, userId: string, payload: unknown): Promise<DraftRow> {
    const draft = await this.loadOwnedDraft(draftId, userId);
    if (draft.status !== 'ready') {
      throw new BadRequestException('Draft is not editable in current status');
    }

    const result = patchDraftSchema.safeParse(payload);
    if (!result.success) {
      throw new BadRequestException(`Invalid payload: ${result.error.message}`);
    }
    const validated: PatchDraftPayload = result.data;

    const update: Database['public']['Tables']['drafts']['Update'] = {};
    if (validated.card_news !== undefined) {
      update.card_news = validated.card_news;
    }
    if (validated.blog_title !== undefined) update.blog_title = validated.blog_title;
    if (validated.blog_body !== undefined) update.blog_body = validated.blog_body;
    if (validated.blog_tags !== undefined) update.blog_tags = validated.blog_tags;

    const { data, error } = await this.supabase.admin
      .from('drafts')
      .update(update)
      .eq('id', draftId)
      .select()
      .single();
    if (error || !data) {
      throw new BadRequestException(`Failed to patch draft: ${error?.message ?? 'unknown'}`);
    }
    return data;
  }

  // --- private helpers ---

  private async loadOwnedTopic(topicId: string, userId: string): Promise<TopicRow> {
    const { data, error } = await this.supabase.admin
      .from('topics')
      .select('*')
      .eq('id', topicId)
      .maybeSingle();
    if (error) throw new BadRequestException(`Failed to load topic: ${error.message}`);
    if (!data) throw new NotFoundException('Topic not found');
    if (data.user_id !== userId) throw new ForbiddenException('Topic does not belong to user');
    return data;
  }

  private async loadOwnedDraft(draftId: string, userId: string): Promise<DraftRow> {
    const { data, error } = await this.supabase.admin
      .from('drafts')
      .select('*')
      .eq('id', draftId)
      .maybeSingle();
    if (error) throw new BadRequestException(`Failed to load draft: ${error.message}`);
    if (!data) throw new NotFoundException('Draft not found');
    if (data.user_id !== userId) throw new ForbiddenException('Draft does not belong to user');
    return data;
  }

  private async loadDraftByTopic(topicId: string): Promise<DraftRow | null> {
    const { data, error } = await this.supabase.admin
      .from('drafts')
      .select('*')
      .eq('topic_id', topicId)
      .maybeSingle();
    if (error) throw new BadRequestException(`Failed to load draft: ${error.message}`);
    return data;
  }

  private async loadLatestSession(topicId: string): Promise<SessionRow | null> {
    const { data, error } = await this.supabase.admin
      .from('interview_sessions')
      .select('*')
      .eq('topic_id', topicId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new BadRequestException(`Failed to load session: ${error.message}`);
    return data;
  }

  private async loadMessages(sessionId: string): Promise<MessageRow[]> {
    const { data, error } = await this.supabase.admin
      .from('interview_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('turn', { ascending: true })
      .order('role', { ascending: false });
    if (error) throw new BadRequestException(`Failed to load messages: ${error.message}`);
    return data ?? [];
  }

  private async upsertGenerating(topicId: string, userId: string): Promise<DraftRow> {
    const existing = await this.loadDraftByTopic(topicId);
    if (existing) {
      const { data, error } = await this.supabase.admin
        .from('drafts')
        .update({
          status: 'generating',
          card_news: null,
          blog_title: null,
          blog_body: null,
          blog_tags: [],
          error_reason: null,
          model_used: null,
          generated_at: null,
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error || !data) {
        throw new BadRequestException(`Failed to reset draft: ${error?.message ?? 'unknown'}`);
      }
      return data;
    }
    const { data, error } = await this.supabase.admin
      .from('drafts')
      .insert({ topic_id: topicId, user_id: userId, status: 'generating' })
      .select()
      .single();
    if (error || !data) {
      throw new BadRequestException(`Failed to create draft: ${error?.message ?? 'unknown'}`);
    }
    return data;
  }

  private async markReady(
    draftId: string,
    cardNews: CardNews,
    blogTitle: string,
    blogBody: string,
    blogTags: string[],
    modelUsed: string,
  ): Promise<DraftRow> {
    const { data, error } = await this.supabase.admin
      .from('drafts')
      .update({
        status: 'ready',
        card_news: cardNews,
        blog_title: blogTitle,
        blog_body: blogBody,
        blog_tags: blogTags,
        model_used: modelUsed,
        generated_at: new Date().toISOString(),
        error_reason: null,
      })
      .eq('id', draftId)
      .select()
      .single();
    if (error || !data) {
      throw new BadRequestException(`Failed to mark draft ready: ${error?.message ?? 'unknown'}`);
    }
    return data;
  }

  private async markFailed(draftId: string, reason: string): Promise<void> {
    await this.supabase.admin
      .from('drafts')
      .update({
        status: 'failed',
        error_reason: reason.slice(0, 1000),
      })
      .eq('id', draftId);
  }
}
