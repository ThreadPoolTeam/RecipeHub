-- Run after current tables are created. Preserve old unit codes/names/precision/state.
DO $$
DECLARE actor uuid := '00000000-0000-0000-0000-000000000103';
BEGIN
  IF to_regclass('recipe_legacy_20261028.unit') IS NOT NULL THEN
    INSERT INTO recipe_db.unit_category(public_id,code,normalized_code,name,normalized_name,state,created_by_user_ref,updated_by_user_ref)
    SELECT gen_random_uuid(),dimension,upper(dimension),dimension,upper(dimension),'active',actor,actor
    FROM recipe_legacy_20261028.unit GROUP BY dimension;
    INSERT INTO recipe_db.unit(public_id,code,normalized_code,name,category_id,decimal_places,state,created_by_user_ref,updated_by_user_ref,created_at,updated_at)
    SELECT gen_random_uuid(),u.code,upper(u.code),u.name,c.id,least(6,greatest(0,u.precision)),
      CASE WHEN u.is_active THEN 'active' ELSE 'inactive' END,actor,actor,u.created_at_utc,u.created_at_utc
    FROM recipe_legacy_20261028.unit u JOIN recipe_db.unit_category c ON c.normalized_code=upper(u.dimension);
  END IF;

  INSERT INTO recipe_db.unit_category(public_id,code,normalized_code,name,normalized_name,state,created_by_user_ref,updated_by_user_ref)
  SELECT gen_random_uuid(),v.code,upper(v.code),v.name,upper(v.name),'active',actor,actor
  FROM (VALUES ('mass','Khối lượng'),('volume','Thể tích'),('count','Số lượng')) v(code,name)
  WHERE NOT EXISTS (SELECT 1 FROM recipe_db.unit_category c WHERE c.normalized_code=upper(v.code));

  INSERT INTO recipe_db.unit(public_id,code,normalized_code,name,category_id,decimal_places,state,created_by_user_ref,updated_by_user_ref)
  SELECT gen_random_uuid(),v.code,upper(v.code),v.name,c.id,6,'active',actor,actor
  FROM (VALUES ('mg','Milligram','mass'),('g','Gram','mass'),('kg','Kilogram','mass'),('ml','Milliliter','volume'),('cl','Centiliter','volume'),('dl','Deciliter','volume'),('l','Liter','volume'),('serving','Phần','count')) v(code,name,category)
  JOIN recipe_db.unit_category c ON c.normalized_code=upper(v.category)
  WHERE NOT EXISTS (SELECT 1 FROM recipe_db.unit u WHERE u.normalized_code=upper(v.code));

  INSERT INTO recipe_db.ingredient_category(public_id,code,normalized_code,name,normalized_name,state,created_by_user_ref,updated_by_user_ref)
  SELECT gen_random_uuid(),v.code,upper(v.code),v.name,upper(v.name),'active',actor,actor
  FROM (VALUES ('TEA','Trà'),('COFFEE','Cà phê'),('DAIRY','Sữa & Kem'),('SWEETENER','Siro & Đường'),('TOPPING','Topping'),('OTHER','Khác')) v(code,name)
  WHERE NOT EXISTS (SELECT 1 FROM recipe_db.ingredient_category c WHERE c.normalized_code=upper(v.code));
END $$;
