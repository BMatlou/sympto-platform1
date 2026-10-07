-- Add weekly and monthly patient health report notification types.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'WEEKLY_HEALTH_REPORT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MONTHLY_HEALTH_REPORT';
