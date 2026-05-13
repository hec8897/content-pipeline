import { ArrayMaxSize, IsArray, IsOptional, IsString, Length } from 'class-validator';

// class-validator 는 표면 거름망. card_news / blog_tags 의 deep 구조 검증은 service 에서 zod 가 담당.
export class PatchDraftDto {
  @IsOptional()
  @IsArray()
  card_news?: unknown[];

  @IsOptional()
  @IsString()
  @Length(1, 200)
  blog_title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10_000)
  blog_body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  blog_tags?: string[];
}
