import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { GeminiService } from '@/gemini/gemini.service';
import type { InterviewHistoryItem } from '@/interview/interview.prompts';
import type { Database } from '@/supabase/database.types';
import { SupabaseService } from '@/supabase/supabase.service';

import {
  IMAGE_GEN_SYSTEM,
  buildBlogPrompt,
  buildCardImagePrompt,
  buildCardImagePromptForFlux,
  buildCardNewsPrompt,
  parseBlogMarkdown,
} from './drafts.prompts';
import {
  type CardNews,
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

@Injectable()
export class DraftsService {
  private readonly logger = new Logger(DraftsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly gemini: GeminiService,
  ) {}

  async getForTopic(topicId: string, userId: string): Promise<DraftState> {
    const topic = await this.loadOwnedTopic(topicId, userId);
    const draft = await this.loadDraftByTopic(topicId);
    return { topic, draft };
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
      const cardResult = await this.gemini.generateValidated(
        buildCardNewsPrompt(topic.title, history),
        (raw) => cardNewsSchema.parse(JSON.parse(raw)),
      );

      const blogResult = await this.gemini.generateValidated(
        buildBlogPrompt(topic.title, history),
        (raw): ReturnType<typeof parseBlogMarkdown> => {
          const parsed = parseBlogMarkdown(raw);
          if (parsed.body.length < 200) {
            throw new Error('blog body too short');
          }
          return parsed;
        },
      );

      const finalTitle = blogResult.value.title || topic.title;
      return await this.markReady(
        draft.id,
        cardResult.value,
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

  // Phase 6 — 모든 카드 AI 배경 이미지 재생성 허용. 응답은 클라 in-memory 만 (DB 저장 X).
  async regenerateCardImage(
    draftId: string,
    userId: string,
    cardIndex: number,
  ): Promise<{ imageBase64: string }> {
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
    const card = cards[cardIndex];

    const topic = await this.loadOwnedTopic(draft.topic_id, userId);
    const { imageBase64 } = await this.gemini.generateImage({
      geminiPrompt: buildCardImagePrompt(card, topic.title),
      geminiSystemInstruction: IMAGE_GEN_SYSTEM,
      fluxPrompt: buildCardImagePromptForFlux(card, topic.title),
    });
    return { imageBase64 };
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
