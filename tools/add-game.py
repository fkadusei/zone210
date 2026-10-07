#!/usr/bin/env python3
"""Adds a catalog entry to public/assets/games.js (at the end) and a README row after a given game's row.
   python3 tools/add-game.py '<json entry>' '<README row>' '<title of the README row to insert after>'"""
import json, sys
entry, row, after = json.loads(sys.argv[1]), sys.argv[2], sys.argv[3]
f = "public/assets/games.js"; s = open(f, encoding="utf8").read()
if f'id: "{entry["id"]}"' in s: sys.exit(f'{entry["id"]} is already in the catalog')
keys = ["id", "online", "title", "tagline", "audience", "cat", "added", "tags", "players", "emoji", "colors"]
lines = []
for k in keys:
    if k not in entry: continue
    v = entry[k]
    lines.append(f"    {k}: {json.dumps(v, ensure_ascii=False)},")
block = "  {\n" + "\n".join(lines) + "\n  },\n"
i = s.index("];\n\n// ---- weekly featured game ----")
s = s[:i] + block + s[i:]
open(f, "w", encoding="utf8").write(s)
f = "README.md"; s = open(f, encoding="utf8").read()
i = s.index(f"| **{after}** |"); j = s.index("\n", i) + 1
s = s[:j] + row + "\n" + s[j:]
open(f, "w", encoding="utf8").write(s)
print("added", entry["id"])
