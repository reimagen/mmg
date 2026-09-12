"""The whole Oxen integration, for the hackathon repo. openai 2.31.0 is already installed.

Oxen is OpenAI-compatible, so it is the SAME SDK with base_url + api_key swapped.
There is nothing else to write.
"""
import os
from openai import OpenAI

oxen = OpenAI(
    base_url="https://hub.oxen.ai/api/ai",
    api_key=os.environ["OXEN_API_KEY"],
)

# --- one call -----------------------------------------------------------------
if __name__ == "__main__":
    r = oxen.chat.completions.create(
        model="deepseek-v4-1-flash",
        messages=[{"role": "user", "content": "Reply with exactly: oxen wired"}],
    )
    print(r.choices[0].message.content, "|", r.usage)


# --- as the third pool (PRD: OpenAI primary -> OpenRouter -> Oxen) ------------
# Three clients, same class, same .chat.completions.create call. Try in order.
#
# POOLS = [
#     (OpenAI(), "gpt-5-mini"),
#     (OpenAI(base_url="https://openrouter.ai/api/v1",
#             api_key=os.environ["OPENROUTER_API_KEY"]), "openai/gpt-5-mini"),
#     (oxen, "deepseek-v4-1-flash"),
# ]
#
# def chat(messages, **kw):
#     last = None
#     for client, model in POOLS:
#         try:
#             return client.chat.completions.create(model=model, messages=messages, **kw)
#         except Exception as e:
#             last = e
#     raise last
