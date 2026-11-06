-- Migration: Tách metadata file tạm khỏi ai_image_draft sang ai_image_draft_file
-- Schema: content_db
-- See docs/plans/261104-content-draft-db-refactor/plan.md

SET statement_timeout = 30000;
SET lock_timeout = 10000;

BEGIN;

-- 1. Tạo bảng ai_image_draft_file
CREATE TABLE IF NOT EXISTS content_db.ai_image_draft_file (
    draft_id bigint NOT NULL,
    temporary_image_path text NOT NULL,
    mime_type text NOT NULL,
    byte_size bigint NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    CONSTRAINT ai_image_draft_file_pkey PRIMARY KEY (draft_id),
    CONSTRAINT ai_image_draft_file_draft_fk FOREIGN KEY (draft_id)
        REFERENCES content_db.ai_image_draft (id) ON DELETE RESTRICT,
    CONSTRAINT ai_image_draft_file_byte_size_check CHECK (byte_size > 0),
    CONSTRAINT ai_image_draft_file_dimensions_check CHECK (width > 0 AND height > 0),
    CONSTRAINT ai_image_draft_file_path_check CHECK (length(trim(temporary_image_path)) > 0),
    CONSTRAINT ai_image_draft_file_mime_check CHECK (length(trim(mime_type)) > 0)
);
DO $$
DECLARE
    v_invalid_count integer := 0;
    v_conflict_count integer := 0;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'content_db' AND table_name = 'ai_image_draft' AND column_name = 'temporary_image_path'
    ) THEN
        -- 1. Kiểm tra tính hợp lệ:
        -- - Trạng thái generated/accepting bắt buộc phải có temporary_image_path.
        -- - Bất kỳ dòng nào có temporary_image_path (kể cả terminal pending cleanup) phải có đầy đủ mime, size > 0, width > 0, height > 0.
        SELECT COUNT(*) INTO v_invalid_count
        FROM content_db.ai_image_draft d
        WHERE (
            (d.state IN ('generated', 'accepting') AND (d.temporary_image_path IS NULL OR length(trim(d.temporary_image_path)) = 0))
            OR
            (d.temporary_image_path IS NOT NULL AND length(trim(d.temporary_image_path)) > 0 AND (
                d.mime_type IS NULL OR length(trim(d.mime_type)) = 0
                OR d.byte_size IS NULL OR d.byte_size <= 0
                OR d.width IS NULL OR d.width <= 0
                OR d.height IS NULL OR d.height <= 0
            ))
        );

        IF v_invalid_count > 0 THEN
            RAISE EXCEPTION 'Migration aborted: % draft(s) have invalid file metadata or missing required image for generated/accepting state.', v_invalid_count;
        END IF;

        -- 2. Kiểm tra xung đột nếu rerun migration:
        SELECT COUNT(*) INTO v_conflict_count
        FROM content_db.ai_image_draft d
        JOIN content_db.ai_image_draft_file f ON f.draft_id = d.id
        WHERE d.temporary_image_path IS NOT NULL
          AND (
              f.temporary_image_path <> d.temporary_image_path
              OR f.mime_type <> d.mime_type
              OR f.byte_size <> d.byte_size
              OR f.width <> d.width
              OR f.height <> d.height
          );

        IF v_conflict_count > 0 THEN
            RAISE EXCEPTION 'Migration aborted: % existing ai_image_draft_file row(s) have conflicting metadata with parent table.', v_conflict_count;
        END IF;

        -- 3. Backfill tất cả các bản ghi có temporary_image_path hợp lệ
        INSERT INTO content_db.ai_image_draft_file (
            draft_id, temporary_image_path, mime_type, byte_size, width, height
        )
        SELECT 
            d.id,
            d.temporary_image_path,
            d.mime_type,
            d.byte_size,
            d.width,
            d.height
        FROM content_db.ai_image_draft d
        WHERE d.temporary_image_path IS NOT NULL 
          AND length(trim(d.temporary_image_path)) > 0
        ON CONFLICT (draft_id) DO NOTHING;
    END IF;
END $$;
-- 3. Xóa ràng buộc check cũ trên ai_image_draft
ALTER TABLE content_db.ai_image_draft
    DROP CONSTRAINT IF EXISTS ai_image_draft_generated_file_check;

-- 4. Xóa 5 cột file tạm khỏi ai_image_draft
ALTER TABLE content_db.ai_image_draft
    DROP COLUMN IF EXISTS temporary_image_path,
    DROP COLUMN IF EXISTS mime_type,
    DROP COLUMN IF EXISTS byte_size,
    DROP COLUMN IF EXISTS width,
    DROP COLUMN IF EXISTS height;

-- 5. Bổ sung chú thích bảng và cột
COMMENT ON TABLE content_db.ai_image_draft_file IS 'Metadata file tạm của ảnh AI draft. Tách khỏi ai_image_draft để phân biệt hồ sơ yêu cầu và file vật lý. Khi discard/accept/expire, file được giữ để dọn dẹp và chỉ xóa row khi file vật lý dọn thành công.';
COMMENT ON COLUMN content_db.ai_image_draft_file.draft_id IS 'PK đồng thời FK tham chiếu ai_image_draft.id. Tối đa một file tạm mỗi draft.';
COMMENT ON COLUMN content_db.ai_image_draft_file.temporary_image_path IS 'Đường dẫn tương đối trong kho file tạm dùng chung API/worker.';
COMMENT ON COLUMN content_db.ai_image_draft_file.mime_type IS 'MIME type: image/png, image/jpeg, image/webp.';
COMMENT ON COLUMN content_db.ai_image_draft_file.byte_size IS 'Dung lượng bytes của file tạm.';
COMMENT ON COLUMN content_db.ai_image_draft_file.width IS 'Chiều rộng thực tế.';
COMMENT ON COLUMN content_db.ai_image_draft_file.height IS 'Chiều cao thực tế.';

COMMIT;
