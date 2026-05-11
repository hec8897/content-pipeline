import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { GeminiService } from '@/gemini/gemini.service';
import type { Database } from '@/supabase/database.types';
import { SupabaseService } from '@/supabase/supabase.service';

import {
  buildEnoughJudgePrompt,
  buildFirstQuestionPrompt,
  buildNextQuestionPrompt,
  type InterviewHistoryItem,
  parseEnoughJudgement,
} from './interview.prompts';

export const MIN_USER_TURNS = 3;
export const MAX_USER_TURNS = 8;

type TopicRow = Database['public']['Tables']['topics']['Row'];
type SessionRow = Database['public']['Tables']['interview_sessions']['Row'];
type MessageRow = Database['public']['Tables']['interview_messages']['Row'];

export interface TopicState {
  topic: TopicRow;
  session: SessionRow | null;
  messages: MessageRow[];
}

export interface StartResult {
  session: SessionRow;
  messages: MessageRow[];
}

export type AnswerResult =
  | {
      kind: 'next';
      userMessage: MessageRow;
      assistantMessage: MessageRow;
      session: SessionRow;
    }
  | {
      kind: 'done';
      userMessage: MessageRow;
      session: SessionRow;
    };

@Injectable()
export class InterviewService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly gemini: GeminiService,
  ) {}

  async getStateForTopic(topicId: string, userId: string): Promise<TopicState> {
    const topic = await this.loadOwnedTopic(topicId, userId);
    const session = await this.loadLatestSession(topicId);
    const messages = session ? await this.loadMessages(session.id) : [];
    return { topic, session, messages };
  }

  async start(topicId: string, userId: string): Promise<StartResult> {
    const topic = await this.loadOwnedTopic(topicId, userId);

    const existing = await this.loadActiveSession(topicId);
    if (existing) {
      const messages = await this.loadMessages(existing.id);
      if (messages.length > 0) {
        return { session: existing, messages };
      }
      // edge case: 빈 active session → 첫 질문 생성
      const assistant = await this.createFirstQuestion(existing.id, topic.title);
      return { session: existing, messages: [assistant] };
    }

    const session = await this.insertSession(topicId, userId);
    const assistant = await this.createFirstQuestion(session.id, topic.title);
    return { session, messages: [assistant] };
  }

  async answer(sessionId: string, userId: string, content: string): Promise<AnswerResult> {
    const session = await this.loadOwnedSession(sessionId, userId);
    if (session.status !== 'active') {
      throw new BadRequestException('Session is not active');
    }

    const topic = await this.loadOwnedTopic(session.topic_id, userId);
    const messages = await this.loadMessages(sessionId);
    const latestAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!latestAssistant) {
      throw new BadRequestException('No question to answer');
    }

    const alreadyAnswered = messages.some(
      (m) => m.role === 'user' && m.turn === latestAssistant.turn,
    );
    if (alreadyAnswered) {
      throw new BadRequestException('Latest question already answered');
    }

    const userMessage = await this.insertMessage(sessionId, latestAssistant.turn, 'user', content);

    const userTurns = messages.filter((m) => m.role === 'user').length + 1;
    const transcript: InterviewHistoryItem[] = [
      ...messages.map((m) => ({
        role: m.role as 'assistant' | 'user',
        content: m.content,
      })),
      { role: 'user' as const, content },
    ];

    if (userTurns >= MAX_USER_TURNS) {
      const completed = await this.completeSession(sessionId, 'max_reached');
      return { kind: 'done', userMessage, session: completed };
    }

    if (userTurns >= MIN_USER_TURNS) {
      const judgement = await this.judgeEnough(topic.title, transcript);
      if (judgement === 'enough') {
        const completed = await this.completeSession(sessionId, 'ai_judged_enough');
        return { kind: 'done', userMessage, session: completed };
      }
    }

    const assistantMessage = await this.createNextQuestion(
      sessionId,
      topic.title,
      transcript,
      latestAssistant.turn + 1,
    );
    return { kind: 'next', userMessage, assistantMessage, session };
  }

  async stop(sessionId: string, userId: string): Promise<SessionRow> {
    const session = await this.loadOwnedSession(sessionId, userId);
    if (session.status !== 'active') {
      throw new BadRequestException('Session is not active');
    }
    const messages = await this.loadMessages(sessionId);
    const userTurns = messages.filter((m) => m.role === 'user').length;
    if (userTurns < MIN_USER_TURNS) {
      throw new BadRequestException(`At least ${MIN_USER_TURNS} answers required before stopping`);
    }
    return this.completeSession(sessionId, 'user_stop');
  }

  async skipForTopic(topicId: string, userId: string): Promise<SessionRow> {
    await this.loadOwnedTopic(topicId, userId);

    const existingSkipped = await this.loadSkippedSession(topicId);
    if (existingSkipped) return existingSkipped;

    const active = await this.loadActiveSession(topicId);
    if (active) {
      throw new BadRequestException('Cannot skip: active interview already exists');
    }

    const { data, error } = await this.supabase.admin
      .from('interview_sessions')
      .insert({
        topic_id: topicId,
        user_id: userId,
        status: 'skipped',
        ended_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error || !data) {
      throw new BadRequestException(
        `Failed to create skipped session: ${error?.message ?? 'unknown'}`,
      );
    }
    return data;
  }

  async patchUserMessage(
    sessionId: string,
    messageId: string,
    userId: string,
    content: string,
  ): Promise<MessageRow> {
    const session = await this.loadOwnedSession(sessionId, userId);
    if (session.status === 'active') {
      throw new BadRequestException('Cannot edit messages while interview is active');
    }

    const { data: existing, error: fetchErr } = await this.supabase.admin
      .from('interview_messages')
      .select('*')
      .eq('id', messageId)
      .eq('session_id', sessionId)
      .maybeSingle();
    if (fetchErr || !existing) {
      throw new NotFoundException('Message not found');
    }
    if (existing.role !== 'user') {
      throw new BadRequestException('Only user messages can be edited');
    }

    const { data: updated, error: updateErr } = await this.supabase.admin
      .from('interview_messages')
      .update({ content })
      .eq('id', messageId)
      .select()
      .single();
    if (updateErr || !updated) {
      throw new BadRequestException(`Failed to update message: ${updateErr?.message ?? 'unknown'}`);
    }
    return updated;
  }

  // --- private helpers ---

  private async loadOwnedTopic(topicId: string, userId: string): Promise<TopicRow> {
    const { data, error } = await this.supabase.admin
      .from('topics')
      .select('*')
      .eq('id', topicId)
      .maybeSingle();
    if (error) {
      throw new BadRequestException(`Failed to load topic: ${error.message}`);
    }
    if (!data) {
      throw new NotFoundException('Topic not found');
    }
    if (data.user_id !== userId) {
      throw new ForbiddenException('Topic does not belong to user');
    }
    return data;
  }

  private async loadOwnedSession(sessionId: string, userId: string): Promise<SessionRow> {
    const { data, error } = await this.supabase.admin
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
    if (error) {
      throw new BadRequestException(`Failed to load session: ${error.message}`);
    }
    if (!data) {
      throw new NotFoundException('Session not found');
    }
    if (data.user_id !== userId) {
      throw new ForbiddenException('Session does not belong to user');
    }
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
    if (error) {
      throw new BadRequestException(`Failed to load session: ${error.message}`);
    }
    return data;
  }

  private async loadActiveSession(topicId: string): Promise<SessionRow | null> {
    const { data, error } = await this.supabase.admin
      .from('interview_sessions')
      .select('*')
      .eq('topic_id', topicId)
      .eq('status', 'active')
      .maybeSingle();
    if (error) {
      throw new BadRequestException(`Failed to load session: ${error.message}`);
    }
    return data;
  }

  private async loadSkippedSession(topicId: string): Promise<SessionRow | null> {
    const { data, error } = await this.supabase.admin
      .from('interview_sessions')
      .select('*')
      .eq('topic_id', topicId)
      .eq('status', 'skipped')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new BadRequestException(`Failed to load session: ${error.message}`);
    }
    return data;
  }

  private async loadMessages(sessionId: string): Promise<MessageRow[]> {
    const { data, error } = await this.supabase.admin
      .from('interview_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('turn', { ascending: true })
      .order('role', { ascending: false }); // assistant 가 user 보다 앞 (a < u → desc)
    if (error) {
      throw new BadRequestException(`Failed to load messages: ${error.message}`);
    }
    return data ?? [];
  }

  private async insertSession(topicId: string, userId: string): Promise<SessionRow> {
    const { data, error } = await this.supabase.admin
      .from('interview_sessions')
      .insert({ topic_id: topicId, user_id: userId, status: 'active' })
      .select()
      .single();
    if (error || !data) {
      throw new BadRequestException(`Failed to create session: ${error?.message ?? 'unknown'}`);
    }
    return data;
  }

  private async insertMessage(
    sessionId: string,
    turn: number,
    role: 'assistant' | 'user',
    content: string,
  ): Promise<MessageRow> {
    const { data, error } = await this.supabase.admin
      .from('interview_messages')
      .insert({ session_id: sessionId, turn, role, content })
      .select()
      .single();
    if (error || !data) {
      throw new BadRequestException(`Failed to save message: ${error?.message ?? 'unknown'}`);
    }
    return data;
  }

  private async completeSession(
    sessionId: string,
    endReason: 'user_stop' | 'ai_judged_enough' | 'max_reached',
  ): Promise<SessionRow> {
    const { data, error } = await this.supabase.admin
      .from('interview_sessions')
      .update({
        status: 'completed',
        end_reason: endReason,
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();
    if (error || !data) {
      throw new BadRequestException(`Failed to complete session: ${error?.message ?? 'unknown'}`);
    }
    return data;
  }

  private async createFirstQuestion(sessionId: string, topicTitle: string): Promise<MessageRow> {
    const text = await this.gemini.generateText(buildFirstQuestionPrompt(topicTitle));
    return this.insertMessage(sessionId, 1, 'assistant', text);
  }

  private async createNextQuestion(
    sessionId: string,
    topicTitle: string,
    history: InterviewHistoryItem[],
    turn: number,
  ): Promise<MessageRow> {
    const text = await this.gemini.generateText(buildNextQuestionPrompt(topicTitle, history));
    return this.insertMessage(sessionId, turn, 'assistant', text);
  }

  private async judgeEnough(
    topicTitle: string,
    history: InterviewHistoryItem[],
  ): Promise<'enough' | 'more'> {
    const raw = await this.gemini.generateText(buildEnoughJudgePrompt(topicTitle, history));
    return parseEnoughJudgement(raw);
  }
}
