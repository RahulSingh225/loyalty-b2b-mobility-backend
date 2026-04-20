
import { sql } from "drizzle-orm";
import db from "../src/config/db";

interface SkuVariantRow {
  level_1: string | null;
  level_2: string | null;
  level_3: string | null;
  level_4: string | null;
  variant_name: string;
  pack_size: string | null;
  mrp: number | null;
  is_active: boolean;
}

/**
 * Fetches SKU variants along with their flattened hierarchy levels.
 * @param {any} db - Your Drizzle database instance
 */
const getFlattenedSkuVariants = async (db: any): Promise<SkuVariantRow[]> => {
  const query = sql`
    WITH RECURSIVE sku_hierarchy AS (
      -- Anchor: Start with the root entities (Category level)
      SELECT 
        id, 
        name, 
        parent_entity_id, 
        ARRAY[name] AS level_names
      FROM sku_entity
      WHERE parent_entity_id IS NULL

      UNION ALL

      -- Recursive: Join children to their parents and append names to array
      SELECT 
        e.id, 
        e.name, 
        e.parent_entity_id, 
        h.level_names || e.name
      FROM sku_entity e
      INNER JOIN sku_hierarchy h ON e.parent_entity_id = h.id
    )
    SELECT 
      h.level_names[1] AS level_1,
      h.level_names[2] AS level_2,
      h.level_names[3] AS level_3,
      h.level_names[4] AS level_4,
      v.variant_name,
      v.pack_size,
      v.mrp,
      v.is_active
    FROM sku_variant v
    INNER JOIN sku_hierarchy h ON v.sku_entity_id = h.id
    ORDER BY level_1, level_2, level_3, level_4, v.variant_name;
  `;

  const result = await db.execute(query);
  return result.rows as unknown as SkuVariantRow[];
};

getFlattenedSkuVariants(db).then((data) => {
  console.log(data);
}).catch((error) => {
  console.error(error);
});
