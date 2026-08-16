# Non-Viable Patterns (First Draft)

**Author:** Independent Reviewer (cursor-grok-4.5-high)  
**Source:** `/workspace/Project.md`  
**Date:** 2026-08-16  
**Status:** Draft for synthesizer merge — not a PRD  
**Companion:** `/workspace/_lab/research/_independent_brief_eval.md`

This list captures **tech + product + process traps** that fail the brief’s evaluation incentives, bank/legacy constraints, or overbuild the take-home. Explicit non-viable items first; rationale second.

---

## Explicit non-viable list

### Tech traps

1. **Fake discovery** — hand-written artifacts, codegen-only recordings, or mock LLMs sold as the mandatory discovery run  
2. **Always-on LLM production replay** — re-prompting the model on every replay step as the default path  
3. **API-integration “solution”** — treating a REST/GraphQL integration as the system under test  
4. **Test-ID-only / clean-DOM-only locator ontology** baked into the artifact with no seam for hostile UIs  
5. **Queues / workers / clusters / K8s session farms** built to impress rather than to complete the vertical slice  
6. **Full multi-tenant runtime plumbing** (tenant registry, fleet config service, per-institution deploy pipeline)  
7. **Happy-path-only replay executor** with no business-outcome / recoverable / hard-failure taxonomy  
8. **HITL as TODO or new-browser session** — “email an operator” without same-live-session pause/cede/resume  
9. **Unbounded LLM self-healing** on failure (open-ended recovery loops)  
10. **Persisting secrets, tokens, or raw PII** into artifacts, logs, or `/evidence/`  
11. **Polyglot microservice sprawl** for a single-surface take-home  
12. **Screenshot-coordinate-only control with no checkpoint strategy** (clicks without proving state)

### Product traps

13. **Conflating business outcomes with failures** (e.g. “no such member” → crash) — the brief’s named most common mistake  
14. **Capability = raw model transcript** instead of a typed, versioned, reviewable artifact contract  
15. **Assuming constant UI drift** as the primary hard problem (consumer-web mindset) instead of runtime exceptions on stable enterprise UIs  
16. **Per-tenant re-record as the only reuse story** with no parameterization/override design  
17. **Full real-time co-browsing operator console** as in-scope build  
18. **Automating real bank/credit-union systems** or using real customer credentials/PII  
19. **Multiple stretch goals before the core thread works**  
20. **Agent catalog / codegen / approval workflow** substituted for missing core requirements

### Process traps

21. **Skipping `/evidence/` real discovery + replay logs**  
22. **Missing or non-conforming `/REPORT.md` headings** (Section 6.2’s seven required headings)  
23. **No README demo path** (exact commands for discover then replay)  
24. **Silent assumption of language / mechanism / target / LLM keys** without human gate  
25. **Breadth-first build** (polish subset; omit whole §3 capabilities)  
26. **Committing secrets** or unreproducible private-only setup  
27. **Violating target site Terms of Service / rate limits** on public proxies  
28. **Month-long polish** without documenting Cuts — endurance theater (§9)

---

## Why each fails (grouped)

### A. Fails Section 7 evaluation incentives (overbuild / wrong signal)

| Non-viable | Why it fails |
|------------|--------------|
| Queues, clusters, multi-tenant plumbing (#5, #6) | §7: *"We do not reward … building scaling infrastructure (queues, clusters, multi-tenant plumbing)."* Designing abstractions that *could* scale is valuable; shipping the infra is not. |
| Feature breadth / many stretch goals (#19, #20) | §5 depth-over-breadth; §8 at most one or two stretches after solid core; §7 does not reward feature breadth or framework name-dropping. |
| Polyglot sprawl / console product (#11, #17) | §3.6: full co-browsing console out of scope; §7 rewards appropriate simplicity. |
| Breadth-first / endurance theater (#25, #28) | §5: thin-but-real every core requirement; §9: judgment, not endurance. |

### B. Fails core through-line / must-have correctness (§§2, 3, 4, 5)

| Non-viable | Why it fails |
|------------|--------------|
| Fake discovery (#1, #21) | §4: discovery *"isn't your call"* — must be a genuine LLM-driven live run with evidence; otherwise graders cannot assess it. |
| Always-on LLM replay (#2) | §2 through-line + §3.3: production invocation is deterministic replay *without* LLM decisions; §1 economics: reusable, cheap, no re-reasoning every time. |
| API integration as the product (#3) | §1: API path is preferred in production but **out of scope**; this project exists for no-API legacy UI computer use. |
| Capability = transcript (#14) | §3.2: typed, serializable, versioned artifact decoupled from raw model transcript; schema is a focal evaluation point. |
| Happy-path-only / outcome conflation (#7, #13) | §§1, 3.3, 10: runtime exceptions are the hard part; *"Conflating the two is the most common design mistake here."* |
| Broken HITL (#8) | §3.6 + §7: must transfer control of the **same live session**; not a TODO; mock UI OK, fake control model not OK. |
| Unbounded self-healing (#9) | Conflicts with deterministic production path; §8 assisted fallback is optional, bounded, single-step, never open-ended — and only after core. |
| No checkpoints / fragile actuation (#12) | §§3.2–3.3, §10 checkpoint: assert expected state; don’t assume the click worked. |
| Missing deliverable shape (#21–#23) | §6 exact paths/headings; side-by-side grading. |

### C. Fails bank / legacy / regulated environment constraints (§§1, 3.4, 3.7, 9)

| Non-viable | Why it fails |
|------------|--------------|
| Clean-DOM / test-ID-only ontology (#4) | §1 heterogeneous legacy surfaces; §3.1 bias to mechanisms that work without clean DOM; §10: legacy apps essentially never have test IDs. |
| Consumer drift mindset (#15) | §1: UIs are fairly stable; hard part is validation errors, not-found, permissions, dialogs, timeouts, slowness — not constant redesign. |
| Per-tenant rebuild-only (#16) | §1 + §3.7: many tenants share vendor products; design must allow reuse/specialize/override and drift management — without requiring rebuild-from-scratch as the only answer (design-time OK). |
| Secrets/PII persistence (#10, #26) | §3.4 never persist secrets/raw sensitive data; §9 keep secrets out of repo; regulated financial context (§1). |
| Real bank systems / real credentials (#18) | §4: no real bank system access; never real credentials or real PII; §9 ground rules. |
| ToS-violating public automation (#27) | §4 + §9: respect terms and rate limits; prefer sandboxes/demo/local. *(If citing a specific site’s ToS, attach URL + retrieval date 2026-08-16.)* |
| Weak redaction / allowlist (#10 related) | §3.4 allowlist + risky-action policy + redaction are evaluated (§7 Safety). |

### D. Process / judgment failures

| Non-viable | Why it fails |
|------------|--------------|
| Silent locks on open choices (#24) | §4 explicitly candidate’s call — language, LLM, mechanism, target, schema, architecture — must be decided and defended, not assumed by an agent chain without a human gate. |
| Substituting stretch for core (#20) | §8 only after solid core; graders weigh schema/replay/HITL/safety over catalog/codegen polish (§§5, 7). |

---

## Top 8 non-viable traps (priority for synthesizer)

Use this short list when cutting scope or reviewing designs:

1. **Fake discovery (no real LLM live run + evidence)** — hard fail (§4).  
2. **Always-on LLM in production replay** — inverts the product (§§2, 3.3).  
3. **Business outcome conflated with hard failure** — most common design mistake (§10 / §3.3).  
4. **Queues / clusters / multi-tenant plumbing** — explicitly non-rewarded (§7).  
5. **HITL without same-live-session control transfer** — fails §3.6 / §7.  
6. **Happy-path-only replay** — fails realism of bank back-office (§1).  
7. **Clean-DOM/test-ID-only artifact model** — paints into a corner vs legacy (§§1, 3.7).  
8. **Real bank targets / real PII / ToS violations / secrets in repo** — ground-rule fail (§§4, 9).

---

## Online citations

None attached in this draft. Project.md §§4 and 9 already require respecting third-party Terms and rate limits. If a concrete public proxy is later chosen, add that site’s ToS/automation policy with **URL + date 2026-08-16** before locking G1.

---

## Merge notes for synthesizer

- Prefer merging duplicates with other agents’ non_viable lists under the Top 8 headings.  
- Keep “design for multi-tenant” as **viable**; keep “build multi-tenant plumbing” as **non-viable**.  
- Keep “mock operator UI” as **viable**; keep “skip control-transfer mechanism” as **non-viable**.  
- Do not expand this file into a PRD.
