import type { DB } from "@op-engineering/op-sqlite";

type CountRow = { c: number };

type TableInfoRow = { name: string };

const SPATIAL_COLUMNS = [
  { table: "paths", column: "geom", srid: 4326, type: "LINESTRINGZ", dimension: "XYZ" },
  { table: "points", column: "geom", srid: 4326, type: "POINTZ", dimension: "XYZ" },
  { table: "hikes", column: "geom", srid: 4326, type: "LINESTRINGZ", dimension: "XYZ" },
] as const;

export function initSpatialMetadata(rawDb: DB): void {
  try {
    rawDb.executeSync("SELECT InitSpatialMetaData(1);");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message.toLowerCase() : "";
    if (!message.includes("already exists")) {
      throw err;
    }
  }
}

function readCount(rawDb: DB, sql: string): number {
  const result = rawDb.executeSync(sql);
  const row = result.rows?.[0] as CountRow | undefined;
  return row?.c ?? 0;
}

function tableHasColumn(rawDb: DB, table: string, column: string): boolean {
  const result = rawDb.executeSync(`PRAGMA table_info(${table});`);
  const rows = (result.rows ?? []) as TableInfoRow[];
  return rows.some((row) => row.name === column);
}

function spatialIndexTableExists(rawDb: DB, table: string, column: string): boolean {
  const indexTable = `idx_${table}_${column}`;
  return (
    readCount(
      rawDb,
      `SELECT COUNT(*) AS c FROM sqlite_master
       WHERE type = 'table' AND name = '${indexTable}';`,
    ) > 0
  );
}

export function ensureSpatialGeometry(
  rawDb: DB,
  table: string,
  column: string,
  srid: number,
  geometryType: string,
  dimension: string,
): void {
  if (tableHasColumn(rawDb, table, column)) {
    rawDb.executeSync(
      `SELECT RecoverGeometryColumn('${table}', '${column}', ${srid}, '${geometryType}', '${dimension}');`,
    );
  } else {
    rawDb.executeSync(
      `SELECT AddGeometryColumn('${table}', '${column}', ${srid}, '${geometryType}', '${dimension}');`,
    );
  }

  if (!spatialIndexTableExists(rawDb, table, column)) {
    rawDb.executeSync(`SELECT CreateSpatialIndex('${table}', '${column}');`);
  }
}

export function initializeSpatialDatabase(rawDb: DB): void {
  initSpatialMetadata(rawDb);

  for (const { table, column, srid, type, dimension } of SPATIAL_COLUMNS) {
    ensureSpatialGeometry(rawDb, table, column, srid, type, dimension);
  }
}
