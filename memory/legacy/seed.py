# Local P0 boot: cd web && npm run seed (legacy Python path, not run)
"""Demo reset: reload the enrolled cast + canned facts in <10 s. Run: python -m memory.seed"""
try:
    from memory import api          # python -m memory.seed
except ImportError:
    import api                      # python memory/seed.py

CAST = [
    # (name, face_ref, fact, open_thread) — replace with the real enrolled participants
    ("Seth Tam",   "enr_01", "Convened team MMG; got the upstairs table",      "the prize breakdown"),
    ("Luis",       "enr_02", "Won the Anthropic Impact Hackathon",             "GPT Live latency numbers"),
    ("Saint",      "enr_03", "Runs Vibe Coders University; owns the glasses",  "MentraOS bridge status"),
    ("Lisa Gu",    "enr_04", "Founder at reimagen.ai; owns the team repo",     "criteria 1-5 mapping"),
    ("Jake",       "enr_05", "Building the memory system you are using",       "the schema"),
]

def main():
    api.DB.unlink(missing_ok=True)
    for name, face, fact, thread in CAST:
        api.upsert_person(api.Upsert(display_name=name, face_ref=face,
                                     event="KINN hackathon 2026-09-12",
                                     fact=fact, open_thread=thread))
    print(f"seeded {len(CAST)} people -> {api.DB}")

if __name__ == "__main__":
    main()
