import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { PublishService } from './publish.service';
import { PUBLISH_TRIGGER, type PublishTrigger } from './triggers/publish-trigger';

// 10초마다 pending 큐를 폴링해 n8n 트리거. 단일 인스턴스(ECS desired=1) 가정.
@Injectable()
export class PublishWorker {
  private readonly logger = new Logger(PublishWorker.name);
  private isPolling = false;

  constructor(
    private readonly publish: PublishService,
    @Inject(PUBLISH_TRIGGER) private readonly trigger: PublishTrigger,
  ) {}

  @Interval(10_000)
  async poll(): Promise<void> {
    if (this.isPolling) return; // 이전 폴링이 10초 초과 시 중첩 방지.
    this.isPolling = true;
    try {
      const jobs = await this.publish.claimDueJobs();
      for (const job of jobs) {
        try {
          await this.trigger.trigger(job);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`trigger failed for job ${job.id}: ${message}`);
          // 트리거 자체 실패 → 자동 재시도 분기(markResult 내부에서 backoff/failed 결정).
          await this.publish.markResult(job.id, 'failed', undefined, message);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`poll cycle failed: ${message}`);
    } finally {
      this.isPolling = false;
    }
  }
}
