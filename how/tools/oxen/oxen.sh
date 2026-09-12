# Oxen.ai env — sourced from ~/.zshrc. Only OXEN_* on purpose: never override OPENAI_* shell-wide (primary pool).
[ -r ~/.secrets/oxen-api-key ] && export OXEN_API_KEY="$(< ~/.secrets/oxen-api-key)"
export OXEN_BASE_URL="https://hub.oxen.ai/api/ai"
