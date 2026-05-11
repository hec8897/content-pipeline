import { IsString, Length } from 'class-validator';

export class AnswerDto {
  @IsString()
  @Length(1, 4000)
  content!: string;
}
