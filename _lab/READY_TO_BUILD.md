# Scaffold complete

Research, docs, and a runnable vertical slice exist.

**Locked:** modified Stack A (TypeScript, npm, Playwright 1.62.1, OpenAI custom tools, Zod, custom loop, MemberDesk). Human gates G1–G13 are `ORCHESTRATOR_DEFAULT`.

**Next for a coding agent:** a live `OPENAI_API_KEY` discovery run with `--live-browser`, commit the redacted journal under `evidence/` (not gitignored sample), then optional Playwright `_electron` adapter.

```bash
npm test
npx tsx src/cli/index.ts discover --goal "Look up member 12345 and read their savings balance" --mock
```
