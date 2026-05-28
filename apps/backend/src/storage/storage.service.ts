import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { SupabaseService } from '@/supabase/supabase.service';

const BUCKET = 'card-images';

// 마이그레이션(20260526000001) 의 allowed_mime_types 와 일치시킬 것.
const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * 카드 이미지를 card-images 버킷에 업로드하고 public URL 을 반환.
   *
   * 경로 규약: `<userId>/<draftId>/<cardIndex>-<timestamp>.<ext>`
   * — RLS 의 "본인 폴더(첫 segment = user_id) 만 write" 와 정합.
   *
   * service-role(admin) 클라이언트로 push → RLS 우회. 소유권 검증은 호출처
   * (DraftsService 의 loadOwnedDraft) 가 1차로 책임진다.
   */
  async uploadCardImage(args: {
    userId: string;
    draftId: string;
    cardIndex: number;
    body: Buffer;
    contentType: string;
  }): Promise<string> {
    const ext = EXT_BY_CONTENT_TYPE[args.contentType];
    if (!ext) {
      throw new BadRequestException(
        `Unsupported content type: ${args.contentType} (png/jpeg/webp only)`,
      );
    }

    // 매 업로드가 timestamp 로 유니크 경로라 upsert 불필요.
    const path = `${args.userId}/${args.draftId}/${args.cardIndex}-${Date.now()}.${ext}`;
    const { error } = await this.supabase.admin.storage
      .from(BUCKET)
      .upload(path, args.body, { contentType: args.contentType, upsert: false });

    if (error) {
      this.logger.error(`upload failed for ${path}: ${error.message}`);
      throw new ServiceUnavailableException(`이미지 업로드에 실패했어요: ${error.message}`);
    }
    return this.getPublicUrl(path);
  }

  getPublicUrl(path: string): string {
    const { data } = this.supabase.admin.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }
}
