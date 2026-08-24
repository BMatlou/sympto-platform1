-- Keep registration/profile location data aligned with the ISO-2 code
-- emitted by the web sign-up form (ZA for South Africa).
INSERT INTO "Country" ("id", "iso2", "iso3", "numericCode", "name", "officialName", "phoneCode", "searchable", "active", "createdAt", "updatedAt")
VALUES ('7d3f6b1e-8f20-4e77-a9c1-5f6c2d1b8a40', 'ZA', 'ZAF', '710', 'South Africa', 'Republic of South Africa', '+27', true, true, NOW(), NOW())
ON CONFLICT ("iso2") DO UPDATE SET
  "iso3" = EXCLUDED."iso3",
  "numericCode" = EXCLUDED."numericCode",
  "name" = EXCLUDED."name",
  "officialName" = EXCLUDED."officialName",
  "phoneCode" = EXCLUDED."phoneCode",
  "searchable" = true,
  "active" = true,
  "updatedAt" = NOW();
