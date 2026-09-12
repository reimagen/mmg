#!/usr/bin/env python3
"""Generate omp models.yml + opencode provider block from the LIVE Oxen model list."""
import json, sys, urllib.request, pathlib

OUT = pathlib.Path(__file__).parent
BASE = "https://hub.oxen.ai/api/ai"

# curated shortlist: cheap workhorses + the frontier names worth having on tap
PICK = [
    "deepseek-v4-flash", "deepseek-v4-1-flash", "deepseek-v4-pro",
    "glm-5-3-flash", "zai-org-glm-5-3", "kimi-k3", "qwen3-8-max",
    "gpt-oss-120b", "gpt-5-nano", "gpt-5-mini", "gpt-5-6-luna", "gpt-5-6-sol",
    "gpt-6-astra", "claude-sonnet-5", "claude-opus-4-8",
    "gemini-3-8-flash", "gemini-3-1-pro-preview",
]
REASONING = {  # best-effort flag; Oxen's API exposes no reasoning field
    "deepseek-v4-pro", "zai-org-glm-5-3", "kimi-k3", "gpt-5-nano", "gpt-5-mini",
    "gpt-5-6-luna", "gpt-5-6-sol", "gpt-6-astra", "claude-sonnet-5",
    "claude-opus-4-8", "gemini-3-1-pro-preview", "qwen3-8-max",
}

raw = json.load(urllib.request.urlopen(f"{BASE}/models"))["data"]
by = {m["id"]: m for m in raw}

sel = []
for mid in PICK:
    m = by.get(mid)
    if not m:
        print(f"skip (gone from API): {mid}", file=sys.stderr)
        continue
    p = m.get("pricing") or {}
    if p.get("method") != "token":
        print(f"skip (not token-priced): {mid}", file=sys.stderr)
        continue
    sel.append({
        "id": mid,
        "name": m["display_name"],
        "reasoning": mid in REASONING,
        "input": sorted((m.get("capabilities") or {}).get("input", ["text"])),
        "contextWindow": m.get("context_length") or 128000,
        "maxTokens": m.get("max_output_tokens") or 32000,
        "in_per_m": round(p["input_cost_per_token"] * 1e6, 4),
        "out_per_m": round(p["output_cost_per_token"] * 1e6, 4),
    })

# ---- omp: ~/.omp/agent/models.yml -------------------------------------------
L = [
    "# Oxen.ai provider block for oh-my-pi (omp).",
    "# Merge into ~/.omp/agent/models.yml under a top-level `providers:` key.",
    f"# Generated from {BASE}/models -- costs are USD per 1M tokens.",
    "# NOTE: omp's documented schema (README) only shows id/name/contextWindow/",
    "# maxTokens. `reasoning`, `input` and `cost` follow Greg's post; if omp",
    "# rejects them, delete those three lines per model and it still works.",
    "providers:",
    "  oxenai:",
    f"    baseUrl: {BASE}",
    "    api: openai-completions",
    "    apiKey: PASTE_OXEN_KEY_HERE  # omp does NOT document ${ENV} interpolation",
    "    models:",
]
for m in sel:
    L += [
        f"      - id: {m['id']}",
        f"        name: {m['name']}",
        f"        reasoning: {str(m['reasoning']).lower()}",
        f"        input: [{', '.join(m['input'])}]",
        f"        contextWindow: {m['contextWindow']}",
        f"        maxTokens: {m['maxTokens']}",
        "        cost:",
        f"          input: {m['in_per_m']}",
        f"          output: {m['out_per_m']}",
    ]
(OUT / "models.yml").write_text("\n".join(L) + "\n")

# ---- opencode: ~/.config/opencode/opencode.json ------------------------------
oc = {
    "$schema": "https://opencode.ai/config.json",
    "provider": {
        "oxenai": {
            "npm": "@ai-sdk/openai-compatible",
            "name": "Oxen.ai",
            "options": {"baseURL": BASE, "apiKey": "{env:OXEN_API_KEY}"},
            "models": {
                m["id"]: {
                    "name": m["name"],
                    "limit": {"context": m["contextWindow"], "output": m["maxTokens"]},
                    "cost": {"input": m["in_per_m"], "output": m["out_per_m"]},
                }
                for m in sel
            },
        }
    },
}
(OUT / "opencode.json").write_text(json.dumps(oc, indent=2) + "\n")

# ---- aichat: ~/.config/aichat/config.yaml ------------------------------------
A = [
    "# Oxen.ai client for aichat. Merge under a top-level `clients:` key.",
    "# Key comes from the env var OXEN_API_KEY (aichat convention:",
    "# <CLIENT_NAME_UPPERCASED>_API_KEY, i.e. OXENAI_API_KEY -- set both to be safe).",
    "clients:",
    "  - type: openai-compatible",
    "    name: oxenai",
    f"    api_base: {BASE}",
    "    models:",
]
for m in sel:
    A += [
        f"      - name: {m['id']}",
        f"        max_input_tokens: {m['contextWindow']}",
        f"        max_output_tokens: {m['maxTokens']}",
        f"        input_price: {m['in_per_m']}",
        f"        output_price: {m['out_per_m']}",
        "        supports_function_calling: true",
    ]
(OUT / "aichat-client.yaml").write_text("\n".join(A) + "\n")

print(f"wrote models.yml, opencode.json, aichat-client.yaml ({len(sel)} models)")
