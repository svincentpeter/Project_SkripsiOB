@AGENTS.md

## Claude Code notes

- The dev machine is Windows (Laragon). The PowerShell and Git Bash tools both work; for env-prefixed
  commands in PowerShell use `$env:DB_DATABASE='project-skripsi_ob_testing'; php artisan migrate --force`.
- Non-trivial features follow the superpowers flow: brainstorming → spec in `docs/superpowers/specs/`
  → plan in `docs/superpowers/plans/` → implementation (see docs/ai/workflow-and-gotchas.md).
- Backend work: also read @backend/AGENTS.md.
