-- Migration: 20261031120000_quiz_integrity.sql
-- Description: Bổ sung next_version_number cho quiz có backfill MAX(version_number)+1 dưới lock, check range score và partial index cho quiz_attempt

-- 1. Khóa bảng ngăn ngừa race condition khi nâng cấp DB có dữ liệu
LOCK TABLE "quiz_db"."quiz" IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE "quiz_db"."quiz_version" IN SHARE ROW EXCLUSIVE MODE;

-- 2. Thêm cột next_version_number (nếu chưa có)
ALTER TABLE "quiz_db"."quiz"
ADD COLUMN IF NOT EXISTS "next_version_number" integer;

-- 3. Backfill an toàn cho các đề hiện có: khởi tạo ít nhất MAX(version_number)+1
UPDATE "quiz_db"."quiz" q
SET "next_version_number" = GREATEST(1, COALESCE((
    SELECT MAX(v.version_number) + 1
    FROM "quiz_db"."quiz_version" v
    WHERE v.quiz_id = q.id
), 1))
WHERE q."next_version_number" IS NULL OR q."next_version_number" < 1;

-- 4. Áp đặt NOT NULL và DEFAULT 1
ALTER TABLE "quiz_db"."quiz"
ALTER COLUMN "next_version_number" SET DEFAULT 1,
ALTER COLUMN "next_version_number" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'quiz_next_version_number_check'
    ) THEN
        ALTER TABLE "quiz_db"."quiz"
        ADD CONSTRAINT "quiz_next_version_number_check" CHECK (next_version_number > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'quiz_attempt_score_range_check'
    ) THEN
        ALTER TABLE "quiz_db"."quiz_attempt"
        ADD CONSTRAINT "quiz_attempt_score_range_check" CHECK (score IS NULL OR (score >= 0.0 AND score <= 100.0));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "quiz_attempt_in_progress_uidx"
ON "quiz_db"."quiz_attempt" ("user_ref", "quiz_version_id")
WHERE state = 'in_progress';
