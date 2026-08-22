import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateCountryDto {
  @IsString()
  name!: string;

  @IsString()
  @Length(2, 2)
  iso2!: string;

  @IsString()
  @Length(3, 3)
  iso3!: string;

  @IsString()
  dialCode!: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  continent?: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  currencyName?: string;

  @IsOptional()
  @IsString()
  flagEmoji?: string;

  @IsOptional()
  @IsString()
  flagImageUrl?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  numericCode?: string;

  @IsOptional()
  @IsString()
  officialName?: string;
}