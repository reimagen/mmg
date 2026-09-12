-- GPT Live MMG — people-memory schema v0 (see docs/context_system_scope.md)
CREATE TABLE IF NOT EXISTS person (
  id            TEXT PRIMARY KEY,          -- p_<n>
  display_name  TEXT NOT NULL,
  aliases_json  TEXT NOT NULL DEFAULT '[]',
  face_ref      TEXT,                      -- enrollment id (enr_*) or NULL (heard-name path)
  first_met_event TEXT,
  first_met_ts  REAL,
  facts_json    TEXT NOT NULL DEFAULT '[]',-- [{text, source, ts}]
  open_threads_json TEXT NOT NULL DEFAULT '[]',
  last_seen_ts  REAL
);
CREATE TABLE IF NOT EXISTS interaction (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ts            REAL NOT NULL,
  person_id     TEXT NOT NULL REFERENCES person(id),
  transcript_ref TEXT,
  extracted_facts_json TEXT NOT NULL DEFAULT '[]',
  follow_ups_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_interaction_person ON interaction(person_id, ts);
CREATE INDEX IF NOT EXISTS idx_person_face ON person(face_ref);
