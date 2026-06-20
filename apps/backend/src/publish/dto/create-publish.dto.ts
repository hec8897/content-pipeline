import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsUrl,
} from 'class-validator';

// class-validator 는 표면 거름망. 정밀 검증(채널 union narrowing + 인스타 payload)은 service 에서 zod(createPublishSchema).
export class CreatePublishDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsIn(['naver', 'instagram'], { each: true })
  channels!: string[];

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  // 인스타 캐러셀 이미지 URL 목록. 정밀 검증(2~10장 + Storage base 확인)은 service 에서.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  images?: string[];
}
