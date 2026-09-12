import * as json from "./store";
import * as sqlite from "./sqlite";

// D17: SQLite in-process by default. Rollback = MEMORY_BACKEND=json, no code change.
const backend = process.env.MEMORY_BACKEND === "json" ? json : sqlite;

export const { recall, upsertPerson, logInteraction, brief, listPeople } = backend;
