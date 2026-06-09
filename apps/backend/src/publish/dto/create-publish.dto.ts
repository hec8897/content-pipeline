import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsISO8601, IsOptional } from 'class-validator';

// class-validator 는 표면 거름망. 정밀 검증(채널 union narrowing)은 service 에서 zod(createPublishSchema).
export class CreatePublishDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsIn(['naver', 'instagram'], { each: true })
  channels!: string[];

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
}
