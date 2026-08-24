-- Keep registration/profile location data aligned with the ISO-2 code
-- emitted by the web sign-up form (ZA for South Africa).
INSERT INTO "Country" ("id", "iso2", "iso3", "numericCode", "name", "officialName", "phoneCode", "searchable", "active", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'ZA', 'ZAF', '710', 'South Africa', 'Republic of South Africa', '+27', true, true, NOW(), NOW())
ON CONFLICT ("iso2") DO UPDATE SET
  "iso3" = EXCLUDED."iso3",
  "numericCode" = EXCLUDED."numericCode",
  "name" = EXCLUDED."name",
  "officialName" = EXCLUDED."officialName",
  "phoneCode" = EXCLUDED."phoneCode",
  "searchable" = true,
  "active" = true,
  "updatedAt" = NOW();
