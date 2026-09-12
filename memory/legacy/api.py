"""GPT Live MMG — people-memory API v0.

Contract: docs/context_system_scope.md. Four tools; recall/brief are local-only and fast —
the realtime loop NEVER awaits the network. Run: uvicorn memory.api:app --port 7777
"""
import json, time, sqlite3, uuid
from pathlib import Path
from fastapi import FastAPI
from pydantic import BaseModel

DB = Path(__file__).parent / "mmg.db"
app = FastAPI(title="mmg-memory")

def db():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.executescript((Path(__file__).parent / "schema.sql").read_text())
    return c

def _iso(ts) -> str:
    if not ts:
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(float(ts)))

def _norm_facts(raw) -> list:
    allowed = {"live", "enrollment", "exa", "treg", "manual"}
    out = []
    for f in json.loads(raw or "[]"):
        src = str(f.get("source") or "live")
        if src not in allowed:
            src = "exa" if "exa" in src else "live"
        ts = f.get("ts")
        if isinstance(ts, (int, float)):
            ts = _iso(ts)
        out.append({"text": f.get("text", ""), "source": src, "ts": ts or _iso(time.time())})
    return out

def _person(row) -> dict:
    return {
        "id": row["id"],
        "display_name": row["display_name"],
        "aliases": json.loads(row["aliases_json"] or "[]"),
        "face_ref": row["face_ref"],
        "enrolled": bool(row["face_ref"]),
        "first_met": {
            "event": row["first_met_event"] or "hackathon floor",
            "ts": _iso(row["first_met_ts"]),
        },
        "facts": _norm_facts(row["facts_json"]),
        "open_threads": json.loads(row["open_threads_json"] or "[]"),
        "last_seen": _iso(row["last_seen_ts"]),
    }

def _card(row) -> dict:
    person = _person(row)
    facts = person["facts"][-5:]
    threads = person["open_threads"]
    met = time.strftime("%b %d", time.localtime(row["first_met_ts"])) if row["first_met_ts"] else "?"
    brief = f"{row['display_name']} — met {met} ({row['first_met_event'] or 'unknown'})."
    if facts:
        brief += f" {facts[-1]['text']}"
    if threads:
        brief += f" Ask about: {threads[0]}."
    return {**person, "person_id": row["id"], "brief": brief, "facts": person["facts"], "open_threads": threads}

@app.get("/people")
def people():
    rows = db().execute("SELECT * FROM person ORDER BY last_seen_ts DESC").fetchall()
    return {"people": [_person(r) for r in rows]}

@app.get("/recall")
def recall(face_ref: str | None = None, name: str | None = None):
    c = db()
    row = None
    if face_ref:
        row = c.execute("SELECT * FROM person WHERE face_ref=?", (face_ref,)).fetchone()
    if row is None and name:
        row = c.execute(
            "SELECT * FROM person WHERE lower(display_name)=lower(?) "
            "OR aliases_json LIKE '%' || ? || '%'", (name, name)).fetchone()
    if row is None:
        return {"unknown": True}
    c.execute("UPDATE person SET last_seen_ts=? WHERE id=?", (time.time(), row["id"]))
    c.commit()
    return _card(row)

class Upsert(BaseModel):
    display_name: str
    face_ref: str | None = None
    event: str | None = None
    fact: str | None = None
    open_thread: str | None = None

@app.post("/upsert_person")
def upsert_person(p: Upsert):
    c = db()
    row = None
    if p.face_ref:
        row = c.execute("SELECT * FROM person WHERE face_ref=?", (p.face_ref,)).fetchone()
    if row is None:
        row = c.execute("SELECT * FROM person WHERE lower(display_name)=lower(?)",
                        (p.display_name,)).fetchone()
    now = time.time()
    if row is None:
        pid = f"p_{uuid.uuid4().hex[:6]}"
        c.execute("INSERT INTO person(id, display_name, face_ref, first_met_event, first_met_ts, last_seen_ts)"
                  " VALUES (?,?,?,?,?,?)", (pid, p.display_name, p.face_ref, p.event, now, now))
    else:
        pid = row["id"]
        if p.face_ref and not row["face_ref"]:
            c.execute("UPDATE person SET face_ref=? WHERE id=?", (p.face_ref, pid))
    if p.fact:
        row = c.execute("SELECT facts_json FROM person WHERE id=?", (pid,)).fetchone()
        facts = json.loads(row["facts_json"]) + [{"text": p.fact, "source": "manual", "ts": now}]
        c.execute("UPDATE person SET facts_json=? WHERE id=?", (json.dumps(facts), pid))
    if p.open_thread:
        row = c.execute("SELECT open_threads_json FROM person WHERE id=?", (pid,)).fetchone()
        th = json.loads(row["open_threads_json"]) + [p.open_thread]
        c.execute("UPDATE person SET open_threads_json=? WHERE id=?", (json.dumps(th), pid))
    c.commit()
    return {"person_id": pid}

class Log(BaseModel):
    person_id: str
    transcript_ref: str | None = None
    extracted_facts: list[str] = []
    follow_ups: list[str] = []

@app.post("/log_interaction")
def log_interaction(l: Log):
    c = db(); now = time.time()
    c.execute("INSERT INTO interaction(ts, person_id, transcript_ref, extracted_facts_json, follow_ups_json)"
              " VALUES (?,?,?,?,?)",
              (now, l.person_id, l.transcript_ref, json.dumps(l.extracted_facts), json.dumps(l.follow_ups)))
    if l.extracted_facts:
        row = c.execute("SELECT facts_json FROM person WHERE id=?", (l.person_id,)).fetchone()
        facts = json.loads(row["facts_json"]) + [
            {"text": f, "source": l.transcript_ref or "utterance", "ts": now} for f in l.extracted_facts]
        c.execute("UPDATE person SET facts_json=?, last_seen_ts=? WHERE id=?",
                  (json.dumps(facts), now, l.person_id))
    c.commit()
    return {"ok": True}

@app.get("/brief/{person_id}")
def brief(person_id: str):
    row = db().execute("SELECT * FROM person WHERE id=?", (person_id,)).fetchone()
    return {"brief": _card(row)["brief"]} if row else {"unknown": True}

# ponytail: per-request sqlite connect, no pooling — fine at demo scale; pool if it matters.

if __name__ == "__main__":
    # self-check: seed-free round trip — upsert, recall by face and name, log, brief
    DB.unlink(missing_ok=True)
    pid = upsert_person(Upsert(display_name="Test Person", face_ref="enr_test",
                               event="selfcheck", fact="likes graphs"))["person_id"]
    assert recall(face_ref="enr_test")["person_id"] == pid
    assert recall(name="test person")["person_id"] == pid
    log_interaction(Log(person_id=pid, extracted_facts=["builds memory systems"]))
    assert "builds memory systems" in brief(pid)["brief"]
    assert recall(face_ref="enr_nope")["unknown"] is True
    DB.unlink(missing_ok=True)
    print("memory api self-check: ok")
