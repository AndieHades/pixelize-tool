#!/bin/bash
set -euo pipefail

# После сжатия контекста (SessionStart source=compact) — перечитать CLAUDE.md
# и вернуть его как additional context, чтобы правила проекта не терялись.
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
[ -f CLAUDE.md ] || exit 0

echo "Контекст был сжат. Правила проекта из CLAUDE.md (перечитаны):"
echo
cat CLAUDE.md
