-- Forward-only correction after 20261101_add_pdf_documents.sql and
-- 20261104_simplify_pdf_storage.sql. Align PDF guards with the current bootstrap.
-- Stop application writers; back up and test restore before deployment.
-- No data changes, no EF history changes. Invalid existing data aborts atomically.
BEGIN;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '10s';

DO $$
BEGIN
    IF to_regclass('recipe_db.pdf_document') IS NULL OR
       to_regclass('recipe_db.pdf_document_item') IS NULL OR
       to_regclass('recipe_db.pdf_document_storage') IS NULL THEN
        RAISE EXCEPTION 'PDF storage guard alignment requires the three PDF tables; apply the 20261101 and 20261104 PDF migrations first.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'recipe_db' AND table_name = 'pdf_document'
          AND column_name = 'storage_public_id'
    ) THEN
        RAISE EXCEPTION 'Legacy PDF storage columns remain; apply 20261104_simplify_pdf_storage.sql first.';
    END IF;
END $$;

-- Keep prechecks and guard installation consistent with concurrent writers.
LOCK TABLE recipe_db.pdf_document, recipe_db.pdf_document_item,
    recipe_db.pdf_document_storage IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM recipe_db.pdf_document
        WHERE (state = 'ready' AND (completed_at IS NULL OR error_code IS NOT NULL))
           OR (state = 'processing' AND (lease_token IS NULL OR lease_expires_at IS NULL
               OR completed_at IS NOT NULL OR error_code IS NOT NULL))
           OR (state <> 'processing' AND (lease_token IS NOT NULL OR lease_expires_at IS NOT NULL))
    ) THEN
        RAISE EXCEPTION 'PDF document state/lease data violates the target guards; inspect and resolve explicitly before retrying.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM recipe_db.pdf_document_storage
        WHERE length(trim(provider)) = 0 OR length(trim(storage_public_id)) = 0
           OR length(trim(file_name)) = 0
           OR (byte_size IS NOT NULL AND byte_size <= 0)
           OR (file_sha256 IS NOT NULL AND file_sha256 !~ '^[0-9a-f]{64}$')
    ) THEN
        RAISE EXCEPTION 'PDF storage metadata violates the target CHECK constraints; inspect and resolve explicitly before retrying.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM recipe_db.pdf_document d
        LEFT JOIN recipe_db.pdf_document_storage s ON s.document_id = d.id
        WHERE d.state = 'ready' AND (s.document_id IS NULL OR s.storage_asset_id IS NULL
            OR s.storage_version IS NULL OR s.byte_size IS NULL OR s.file_sha256 IS NULL)
    ) THEN
        RAISE EXCEPTION 'Ready PDF documents require storage with complete metadata; inspect and resolve explicitly before retrying.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM recipe_db.pdf_document d
        LEFT JOIN recipe_db.pdf_document_item i ON i.document_id = d.id
        GROUP BY d.id, d.export_scope
        HAVING (d.export_scope = 'single' AND count(i.id) <> 1)
            OR (d.export_scope = 'collection' AND count(i.id) < 2)
            OR min(i.sort_order) <> 1 OR max(i.sort_order) <> count(i.id)
            OR sum(i.sort_order) <> (count(i.id) * (count(i.id) + 1)) / 2
    ) THEN
        RAISE EXCEPTION 'PDF item cardinality/order violates the target guards; inspect and resolve explicitly before retrying.';
    END IF;
END $$;

-- Existing bootstrap installations already have these named CHECK constraints.
DO $$
DECLARE
    target record;
BEGIN
    FOR target IN
        SELECT * FROM (VALUES
            ('pdf_document', 'pdf_document_ready_state_check',
                'state <> ''ready'' OR (completed_at IS NOT NULL AND error_code IS NULL)'),
            ('pdf_document', 'pdf_document_processing_state_check',
                'state <> ''processing'' OR (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL AND completed_at IS NULL AND error_code IS NULL)'),
            ('pdf_document', 'pdf_document_terminal_lease_check',
                'state = ''processing'' OR (lease_token IS NULL AND lease_expires_at IS NULL)'),
            ('pdf_document_storage', 'pdf_document_storage_provider_check',
                'length(trim(provider)) > 0'),
            ('pdf_document_storage', 'pdf_document_storage_public_id_check',
                'length(trim(storage_public_id)) > 0'),
            ('pdf_document_storage', 'pdf_document_storage_file_name_check',
                'length(trim(file_name)) > 0'),
            ('pdf_document_storage', 'pdf_document_storage_byte_size_check',
                'byte_size IS NULL OR byte_size > 0'),
            ('pdf_document_storage', 'pdf_document_storage_file_sha256_check',
                'file_sha256 IS NULL OR file_sha256 ~ ''^[0-9a-f]{64}$''')
        ) AS guards(table_name, constraint_name, expression)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conrelid = format('recipe_db.%I', target.table_name)::regclass
              AND conname = target.constraint_name
        ) THEN
            EXECUTE format('ALTER TABLE recipe_db.%I ADD CONSTRAINT %I CHECK (%s)',
                target.table_name, target.constraint_name, target.expression);
        END IF;
    END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS pdf_document_storage_cleanup_idx
    ON recipe_db.pdf_document_storage (document_id) WHERE cleanup_required = true;

-- Replace the historical function that still references removed snapshot,
-- template, audit and storage columns. Keep all functions equal to bootstrap.
CREATE OR REPLACE FUNCTION recipe_db.trg_check_pdf_document_cardinality()
RETURNS trigger AS $$
DECLARE
    v_doc_id bigint;
    v_scope text;
    v_count integer;
    v_min_order integer;
    v_max_order integer;
    v_actual_sum bigint;
    v_expected_sum bigint;
BEGIN
    IF TG_TABLE_NAME = 'pdf_document' THEN
        v_doc_id := NEW.id;
        v_scope := NEW.export_scope;
    ELSE
        v_doc_id := COALESCE(NEW.document_id, OLD.document_id);
        SELECT export_scope INTO v_scope FROM recipe_db.pdf_document WHERE id = v_doc_id;
    END IF;

    IF v_scope IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COUNT(*), COALESCE(MIN(sort_order), 0), COALESCE(MAX(sort_order), 0), COALESCE(SUM(sort_order), 0)
    INTO v_count, v_min_order, v_max_order, v_actual_sum
    FROM recipe_db.pdf_document_item
    WHERE document_id = v_doc_id;

    IF v_scope = 'single' AND v_count <> 1 THEN
        RAISE EXCEPTION 'Single recipe PDF document % must have exactly 1 item, but has %', v_doc_id, v_count;
    END IF;

    IF v_scope = 'collection' AND v_count < 2 THEN
        RAISE EXCEPTION 'Collection recipe PDF document % must have at least 2 items, but has %', v_doc_id, v_count;
    END IF;

    v_expected_sum := (v_count * (v_count + 1)) / 2;
    IF v_min_order <> 1 OR v_max_order <> v_count OR v_actual_sum <> v_expected_sum THEN
        RAISE EXCEPTION 'PDF document % items must have continuous sort_order from 1 to %, actual min: %, max: %',
            v_doc_id, v_count, v_min_order, v_max_order;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recipe_db.trg_enforce_pdf_document_immutability()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.state = 'ready' THEN
            RAISE EXCEPTION 'Cannot delete ready PDF document %; ready documents are immutable.', OLD.id;
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.state = 'ready' THEN
            IF NEW.id <> OLD.id OR
               NEW.public_id <> OLD.public_id OR
               NEW.title <> OLD.title OR
               NEW.document_type <> OLD.document_type OR
               NEW.export_scope <> OLD.export_scope OR
               NEW.state <> OLD.state OR
               NEW.created_by_user_ref <> OLD.created_by_user_ref OR
               NEW.created_at <> OLD.created_at OR
               NEW.completed_at IS DISTINCT FROM OLD.completed_at OR
               NEW.lease_token IS DISTINCT FROM OLD.lease_token OR
               NEW.lease_expires_at IS DISTINCT FROM OLD.lease_expires_at OR
               NEW.error_code IS DISTINCT FROM OLD.error_code THEN
                RAISE EXCEPTION 'Ready PDF document % is immutable. No updates permitted.', OLD.id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recipe_db.trg_enforce_pdf_document_item_immutability()
RETURNS trigger AS $$
DECLARE
    v_doc_id bigint;
    v_state text;
BEGIN
    v_doc_id := COALESCE(NEW.document_id, OLD.document_id);
    SELECT state INTO v_state FROM recipe_db.pdf_document WHERE id = v_doc_id FOR SHARE;

    IF v_state = 'ready' THEN
        RAISE EXCEPTION 'Cannot modify or delete items of ready PDF document %; document is immutable.', v_doc_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recipe_db.trg_enforce_pdf_document_storage_immutability()
RETURNS trigger AS $$
DECLARE
    v_doc_id bigint;
    v_state text;
BEGIN
    v_doc_id := COALESCE(NEW.document_id, OLD.document_id);
    SELECT state INTO v_state FROM recipe_db.pdf_document WHERE id = v_doc_id FOR SHARE;

    IF TG_OP = 'DELETE' AND v_state = 'ready' THEN
        RAISE EXCEPTION 'Cannot delete storage of ready PDF document %; ready documents are immutable.', v_doc_id;
    END IF;

    IF TG_OP = 'UPDATE' AND v_state = 'ready' THEN
        IF OLD.storage_asset_id IS NOT NULL THEN
            RAISE EXCEPTION 'Cannot modify storage of ready PDF document %; ready documents are immutable.', v_doc_id;
        END IF;

        IF NEW.storage_asset_id IS NULL OR NEW.storage_version IS NULL OR NEW.byte_size IS NULL OR NEW.file_sha256 IS NULL THEN
            RAISE EXCEPTION 'Finalizing storage of ready PDF document % requires complete metadata.', v_doc_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recipe_db.trg_check_pdf_document_ready_storage()
RETURNS trigger AS $$
DECLARE
    v_doc_id bigint;
    v_state text;
    v_asset_id text;
    v_version text;
    v_byte_size bigint;
    v_sha text;
BEGIN
    IF TG_TABLE_NAME = 'pdf_document' THEN
        IF NEW.state <> 'ready' THEN
            RETURN NULL;
        END IF;
        v_doc_id := NEW.id;
    ELSE
        v_doc_id := COALESCE(NEW.document_id, OLD.document_id);
        SELECT state INTO v_state FROM recipe_db.pdf_document WHERE id = v_doc_id;
        IF v_state <> 'ready' THEN
            RETURN NULL;
        END IF;
    END IF;

    SELECT
        storage_asset_id, storage_version, byte_size, file_sha256
    INTO
        v_asset_id, v_version, v_byte_size, v_sha
    FROM recipe_db.pdf_document_storage
    WHERE document_id = v_doc_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ready PDF document % must have associated pdf_document_storage record', v_doc_id;
    END IF;

    IF v_asset_id IS NULL OR v_version IS NULL OR v_byte_size IS NULL OR v_sha IS NULL THEN
        RAISE EXCEPTION 'Ready PDF document % storage must have complete metadata (asset_id, version, byte_size, file_sha256)', v_doc_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pdf_document_cardinality ON recipe_db.pdf_document;
CREATE CONSTRAINT TRIGGER trg_pdf_document_cardinality
    AFTER INSERT OR UPDATE ON recipe_db.pdf_document
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION recipe_db.trg_check_pdf_document_cardinality();

DROP TRIGGER IF EXISTS trg_pdf_document_item_cardinality ON recipe_db.pdf_document_item;
CREATE CONSTRAINT TRIGGER trg_pdf_document_item_cardinality
    AFTER INSERT OR UPDATE OR DELETE ON recipe_db.pdf_document_item
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION recipe_db.trg_check_pdf_document_cardinality();

DROP TRIGGER IF EXISTS trg_pdf_document_immutability ON recipe_db.pdf_document;
CREATE TRIGGER trg_pdf_document_immutability
    BEFORE UPDATE OR DELETE ON recipe_db.pdf_document
    FOR EACH ROW
    EXECUTE FUNCTION recipe_db.trg_enforce_pdf_document_immutability();

DROP TRIGGER IF EXISTS trg_pdf_document_item_immutability ON recipe_db.pdf_document_item;
CREATE TRIGGER trg_pdf_document_item_immutability
    BEFORE INSERT OR UPDATE OR DELETE ON recipe_db.pdf_document_item
    FOR EACH ROW
    EXECUTE FUNCTION recipe_db.trg_enforce_pdf_document_item_immutability();

DROP TRIGGER IF EXISTS trg_pdf_document_storage_immutability ON recipe_db.pdf_document_storage;
CREATE TRIGGER trg_pdf_document_storage_immutability
    BEFORE UPDATE OR DELETE ON recipe_db.pdf_document_storage
    FOR EACH ROW
    EXECUTE FUNCTION recipe_db.trg_enforce_pdf_document_storage_immutability();

DROP TRIGGER IF EXISTS trg_pdf_document_ready_storage ON recipe_db.pdf_document;
CREATE CONSTRAINT TRIGGER trg_pdf_document_ready_storage
    AFTER INSERT OR UPDATE ON recipe_db.pdf_document
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION recipe_db.trg_check_pdf_document_ready_storage();

DROP TRIGGER IF EXISTS trg_pdf_document_storage_ready_check ON recipe_db.pdf_document_storage;
CREATE CONSTRAINT TRIGGER trg_pdf_document_storage_ready_check
    AFTER INSERT OR UPDATE OR DELETE ON recipe_db.pdf_document_storage
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION recipe_db.trg_check_pdf_document_ready_storage();

COMMIT;
