import { IsOptional, IsString, IsArray, IsUUID } from 'class-validator';

export class CreateThreadDto {
  @IsOptional()
  @IsUUID()
  dealId?: string;

  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  participantIds: string[];
}
