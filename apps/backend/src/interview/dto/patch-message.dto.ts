import { IsString, Length } from 'class-validator';

export class PatchMessageDto {
  @IsString()
  @Length(1, 4000)
  content!: string;
}
