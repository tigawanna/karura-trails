import { getDb } from "./client";
import { ensureSpatialGeometry, initSpatialMetadata } from "./spatial-setup";

const CREATE_PATHS = `
  CREATE TABLE IF NOT EXISTS paths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    source TEXT,
    difficulty TEXT,
    surface_type TEXT,
    is_loop INTEGER,
    distance_meters REAL,
    elevation_gain REAL,
    elevation_loss REAL,
    min_elevation REAL,
    max_elevation REAL,
    vertex_count INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const CREATE_POINTS = `
  CREATE TABLE IF NOT EXISTS points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    category TEXT,
    photo_uri TEXT,
    elevation REAL,
    elevation_source TEXT,
    nearest_path_id INTEGER REFERENCES paths(id),
    nearest_path_name TEXT,
    nearest_path_distance REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const CREATE_PATH_POINTS = `
  CREATE TABLE IF NOT EXISTS path_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path_id INTEGER NOT NULL REFERENCES paths(id),
    point_id INTEGER NOT NULL REFERENCES points(id),
    position_on_path REAL,
    elevation_at_path REAL,
    UNIQUE(path_id, point_id)
  );
`;

const CREATE_HIKES = `
  CREATE TABLE IF NOT EXISTS hikes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    planned_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    total_distance REAL,
    total_elevation_gain REAL,
    total_elevation_loss REAL,
    duration_seconds INTEGER,
    status TEXT NOT NULL DEFAULT 'planned',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const CREATE_HIKE_WAYPOINTS = `
  CREATE TABLE IF NOT EXISTS hike_waypoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hike_id INTEGER NOT NULL REFERENCES hikes(id),
    point_id INTEGER NOT NULL REFERENCES points(id),
    sequence INTEGER NOT NULL,
    path_id INTEGER REFERENCES paths(id)
  );
`;

export function initializeDatabase(): void {
  const rawDb = getDb();

  initSpatialMetadata(rawDb);

  rawDb.executeSync(CREATE_PATHS);
  rawDb.executeSync(CREATE_POINTS);
  rawDb.executeSync(CREATE_PATH_POINTS);
  rawDb.executeSync(CREATE_HIKES);
  rawDb.executeSync(CREATE_HIKE_WAYPOINTS);

  ensureSpatialGeometry(rawDb, "paths", "geom", 4326, "LINESTRINGZ", "XYZ");
  ensureSpatialGeometry(rawDb, "points", "geom", 4326, "POINTZ", "XYZ");
  ensureSpatialGeometry(rawDb, "hikes", "geom", 4326, "LINESTRINGZ", "XYZ");
}
