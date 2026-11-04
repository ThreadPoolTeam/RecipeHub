-- Migration tối giản: Tạo pdf_document_storage, chuyển dữ liệu và gỡ cột cũ
-- Schema: recipe_db
BEGIN;

-- 1. Tạo bảng lưu trữ file pdf_document_storage
CREATE TABLE IF NOT EXISTS recipe_db.pdf_document_storage (
    document_id bigint NOT NULL,
    provider text NOT NULL DEFAULT ('Cloudinary'),
    storage_public_id text NOT NULL,
    storage_asset_id text,
    storage_version text,
    file_name text NOT NULL,
    byte_size bigint,
    file_sha256 text,
    cleanup_required boolean NOT NULL DEFAULT (false),
    CONSTRAINT pdf_document_storage_pkey PRIMARY KEY (document_id),
    CONSTRAINT pdf_document_storage_document_fk FOREIGN KEY (document_id)
        REFERENCES recipe_db.pdf_document (id) ON DELETE RESTRICT,
    CONSTRAINT pdf_document_storage_public_id_key UNIQUE (storage_public_id)
);

-- 2. Chuyển dữ liệu cũ sang bảng mới (nếu còn cột cũ)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'recipe_db' AND table_name = 'pdf_document' AND column_name = 'storage_public_id'
    ) THEN
        INSERT INTO recipe_db.pdf_document_storage (
            document_id, provider, storage_public_id, storage_asset_id, storage_version,
            file_name, byte_size, file_sha256, cleanup_required
        )
        SELECT 
            d.id,
            COALESCE(d.storage_provider, 'Cloudinary'),
            d.storage_public_id,
            d.storage_asset_id,
            d.storage_version,
            COALESCE(d.file_name, 'document.pdf'),
            d.byte_size,
            d.file_sha256,
            COALESCE(d.storage_cleanup_required, false)
        FROM recipe_db.pdf_document d
        WHERE d.storage_public_id IS NOT NULL
        ON CONFLICT (document_id) DO NOTHING;
    END IF;
END $$;

-- 3. Xóa các ràng buộc cũ trên pdf_document (để xóa được cột)
ALTER TABLE recipe_db.pdf_document
    DROP CONSTRAINT IF EXISTS pdf_document_storage_resource_type_check,
    DROP CONSTRAINT IF EXISTS pdf_document_storage_delivery_type_check,
    DROP CONSTRAINT IF EXISTS pdf_document_template_code_check,
    DROP CONSTRAINT IF EXISTS pdf_document_template_version_check,
    DROP CONSTRAINT IF EXISTS pdf_document_snapshot_sha256_check,
    DROP CONSTRAINT IF EXISTS pdf_document_storage_public_id_key,
    DROP CONSTRAINT IF EXISTS pdf_document_audit_event_id_key,
    DROP CONSTRAINT IF EXISTS pdf_document_file_sha256_check,
    DROP CONSTRAINT IF EXISTS pdf_document_byte_size_check,
    DROP CONSTRAINT IF EXISTS pdf_document_ready_state_check;

DROP INDEX IF EXISTS recipe_db.pdf_document_audit_relay_idx;

-- 4. Xóa các cột cũ khỏi pdf_document
ALTER TABLE recipe_db.pdf_document
    DROP COLUMN IF EXISTS template_code,
    DROP COLUMN IF EXISTS template_version,
    DROP COLUMN IF EXISTS presentation_snapshot,
    DROP COLUMN IF EXISTS snapshot_sha256,
    DROP COLUMN IF EXISTS storage_provider,
    DROP COLUMN IF EXISTS storage_public_id,
    DROP COLUMN IF EXISTS storage_asset_id,
    DROP COLUMN IF EXISTS storage_version,
    DROP COLUMN IF EXISTS storage_resource_type,
    DROP COLUMN IF EXISTS storage_delivery_type,
    DROP COLUMN IF EXISTS file_name,
    DROP COLUMN IF EXISTS byte_size,
    DROP COLUMN IF EXISTS file_sha256,
    DROP COLUMN IF EXISTS storage_cleanup_required,
    DROP COLUMN IF EXISTS audit_event_id,
    DROP COLUMN IF EXISTS audit_published_at,
    DROP COLUMN IF EXISTS audit_recorded_at;

-- 5. Xóa snapshot cũ khỏi bảng item
ALTER TABLE recipe_db.pdf_document_item
    DROP COLUMN IF EXISTS source_snapshot;

COMMIT;
