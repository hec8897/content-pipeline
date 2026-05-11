import { IsString, Length } from 'class-validator';

export class CreateTopicDto {
  @IsString()
  @Length(1, 200)
  title!: string;
}
