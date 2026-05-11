import { BadRequestException, Injectable } from '@nestjs/common';

import type { Database } from '@/supabase/database.types';
import { SupabaseService } from '@/supabase/supabase.service';

import { InterviewService, type TopicState } from '@/interview/interview.service';

type TopicRow = Database['public']['Tables']['topics']['Row'];

@Injectable()
export class TopicsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly interview: InterviewService,
  ) {}

  async create(userId: string, title: string): Promise<TopicRow> {
    const { data, error } = await this.supabase.admin
      .from('topics')
      .insert({ user_id: userId, title })
      .select()
      .single();
    if (error || !data) {
      throw new BadRequestException(`Failed to create topic: ${error?.message ?? 'unknown'}`);
    }
    return data;
  }

  getDetail(topicId: string, userId: string): Promise<TopicState> {
    return this.interview.getStateForTopic(topicId, userId);
  }
}
