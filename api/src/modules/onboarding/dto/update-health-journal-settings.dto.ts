import {
  IsBoolean,
  IsOptional,
  Matches,
} from 'class-validator';

export class UpdateHealthJournalSettingsDto {
  @IsOptional()
  @IsBoolean()
  trackSymptoms?: boolean;

  @IsOptional()
  @IsBoolean()
  trackMood?: boolean;

  @IsOptional()
  @IsBoolean()
  trackSleep?: boolean;

  @IsOptional()
  @IsBoolean()
  trackWater?: boolean;

  @IsOptional()
  @IsBoolean()
  trackNutrition?: boolean;

  @IsOptional()
  @IsBoolean()
  trackExercise?: boolean;

  @IsOptional()
  @IsBoolean()
  trackMedications?: boolean;

  @IsOptional()
  @IsBoolean()
  trackVitals?: boolean;

  @IsOptional()
  @IsBoolean()
  remindersEnabled?: boolean;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  morningReminder?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  afternoonReminder?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  eveningReminder?: string;

  @IsOptional()
  @IsBoolean()
  weeklySummary?: boolean;

  @IsOptional()
  @IsBoolean()
  monthlySummary?: boolean;
}