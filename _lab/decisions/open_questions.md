# Questions for you

Background: human accepted all recommended approaches on 2026-08-16. Remaining work is sequential tickets in `_lab/agent_ops/TICKETS.md`.

How to answer: copy the line under **Your answer**, change `keep recommended` to your pick, or leave it as-is.

---

## Your answer sheet (edit this)

```
Q1  What app do we automate?     keep recommended
Q2  How does the AI click things? keep recommended
Q3  Programming language?        keep recommended
Q4  Which AI company for the one real demo run?  keep recommended
Q5  Do you have an API key?      NO — I still need to add one
Q6  Extra desktop app too?       keep recommended
Q7  Extra features after the core works?  keep recommended
Q8  Anything else you care about?  (optional)
```

---

## Q1. What fake “bank” app should we practice on?

**In plain English:** We cannot touch a real bank. We need a stand-in website the agent can click through (search a member → see a balance).

| Choice | Meaning |
|--------|---------|
| **A (recommended)** | A tiny website we own, called MemberDesk. Fake people only (`12345` exists, `00000` does not). We can make it fail on purpose (not found, access denied). |
| B | A public practice site on the internet. Faster to start, but we cannot reliably demo “member not found,” and some sites forbid bots. |
| C | A desktop app (Electron), more like old bank software. Harder to install and demo for a reviewer. |

**Recommended: A — MemberDesk.**  
This is already built.

**Your answer:** `keep recommended` / B / C

---

## Q2. How should the AI “see” and click the screen?

**In plain English:** The first run uses an AI to figure out the clicks. Later runs must replay those clicks **without** calling the AI again (that is the assignment).

| Choice | Meaning |
|--------|---------|
| **A (recommended)** | Look at the page the way a screen reader would (names like “Look up” button), then save those names for replay. Screenshot only if stuck. |
| B | Click by pixel position (x, y). Looks fancy, breaks if the window size changes. Bad for replay. |
| C | Drive the real operating system mouse. Fragile, needs extra Mac/Windows permissions, hard for a reviewer to rerun. |

**Recommended: A.**  
Already implemented.

**Your answer:** `keep recommended` / B / C

---

## Q3. What language should the project be in?

| Choice | Meaning |
|--------|---------|
| **A (recommended)** | TypeScript / JavaScript (Node). Matches the browser tools we use. Already written. |
| B | Python. Better if you later want a real native desktop demo. Would mean rewriting most of what is here. |

**Recommended: A — TypeScript.**  
Already implemented.

**Your answer:** `keep recommended` / B

---

## Q4. Which AI should do the one real “discovery” run?

**In plain English:** The assignment requires **one real** AI run against a live page (not a fake). After that, replay does not use AI.

| Choice | Meaning |
|--------|---------|
| **A (recommended)** | OpenAI (model `gpt-5.6-terra` unless you say otherwise). Spend cap about **$2 per run**. |
| B | Anthropic (Claude). Same idea; we would swap the API. |

**Recommended: A — OpenAI.**  
Code is already wired for OpenAI.

**Your answer:** `keep recommended` / B

---

## Q5. Do you have an API key we can use?  ← this is the one you probably need to act on

Without a key, tests and the **mock** demo still work. The graders want evidence of a **real** AI run.

- Put the key only in a local `.env` file (never commit it).
- `cp .env.example .env` then paste `OPENAI_API_KEY=...`

**Your answer:**

- [ ] Yes — I added `OPENAI_API_KEY` locally  
- [ ] Not yet — please keep using mock until I add one  
- [ ] I only have an Anthropic key (then Q4 should be B)

---

## Q6. Should we also build a real desktop/Electron app, or only describe it?

**In plain English:** The assignment says: build **one** real surface; *write* how it would extend to desktop/other banks.

| Choice | Meaning |
|--------|---------|
| **A (recommended)** | Browser only. Desktop is a stub + explanation in `REPORT.md`. |
| B | Also ship a small Electron app. More impressive, more setup pain. |

**Recommended: A.**  
Already implemented that way.

**Your answer:** `keep recommended` / B

---

## Q7. Any bonus features, or keep it small?

The assignment says: finish the core first; at most 1–2 extras.

| Choice | Meaning |
|--------|---------|
| **A (recommended)** | No extras until the real AI demo + replay evidence are done. |
| B | After that, add “call a saved flow by name” (tiny API). |
| C | After that, add a small Electron demo. |

**Recommended: A.**

**Your answer:** `keep recommended` / B / C

---

## Q8. Anything you want different? (optional)

Examples: “use `pnpm` not `npm`”, “I want a visible browser window for the human-takeover demo”, “spend cap $5 not $2”.

**Your answer:** _(leave blank if no)_

---

## What we already assumed (only change if you said so above)

- One Node process, no queues/servers/databases.
- Saved flows are JSON files, not YAML.
- When the AI is stuck, a human can take the **same** browser session (the “operator screen” can be a simple command, not a fancy website).
- No real banks, no real customer data.

If you reply, you can just send the answer sheet at the top. Anything you skip stays on the recommended choice.
