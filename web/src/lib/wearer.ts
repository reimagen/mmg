/**
 * Who is wearing the glasses — one setting, read by everything that needs to know.
 *
 * It used to live in three places that could drift apart: `WEARER_NAME` in the delegation backend,
 * a separate `WEARER_ALIASES` list in the regex path, and the name written into the live prompt in
 * prose. Three defaults meant the system could believe two different people were the wearer.
 *
 *   WEARER="Saint Louis, Saint, Bootoshi"
 *
 * First entry is the display name; the rest are extra things they get called. Both names in the
 * display name are aliases automatically, so the short form usually needs no extra entry.
 *
 * ponytail: name matching, not identity. Anyone who says "I'm Saint" is treated as the wearer, and
 * a real Saint across the table is silently skipped. Face enrolment (`vision/`) is the honest fix
 * when there is time for it — this at least makes it one dial instead of three.
 */

const RAW = process.env.WEARER ?? process.env.WEARER_NAME ?? "Saint Louis, Saint, Bootoshi";

const PARTS = RAW.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** How the wearer is referred to in prompts: "Saint Louis". */
export const wearerName = PARTS[0] ?? "the wearer";

/** Everything that counts as the wearer saying their own name, lowercased. */
export const wearerAliases: ReadonlySet<string> = new Set(
  [...PARTS, ...wearerName.split(/\s+/)].map((s) => s.toLowerCase()).filter((s) => s.length > 1),
);

export function isWearer(name: string | undefined | null): boolean {
  return Boolean(name) && wearerAliases.has(name!.trim().toLowerCase());
}
