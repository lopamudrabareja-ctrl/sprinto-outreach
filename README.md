# Sprinto Outreach

MESA Term 2 · AI Case 2: Cold Outreach, at Scale. A domain list goes in; qualified, personalised cold emails land in your own inbox.

**Gemini reads and writes. Code decides.** Every gate is a rule in `lib/config.js`.

## The 7 steps

| Step | File | Who decides |
|---|---|---|
| 1. Scrape: single fetch, robots.txt respected, cleaned to ~2k tokens; JS shells re-read via Jina Reader; job boards via Greenhouse/Lever/Ashby public APIs | `lib/scrape.js` | code |
| 2. Extract named facts, each with a verbatim quote; quotes not on the page are discarded. Certs and competitor platforms (Vanta, Drata…) also found by regex | `lib/extract.js` | Gemini extracts, code verifies |
| 3. Qualify with 5 gates. Agent loop: code checks which fields are empty, Gemini picks the next page from the site's own links. Max 4 extra fetches | `lib/qualify.js` | code decides, Gemini picks the page |
| 4. PoC: `data/contacts.json` (Apollo, by hand) or Hunter. Title priority depends on stage | `lib/contact.js` | code |
| 5–6. Two evidence-linked pain points, then the email. Validator checks name, length, hook, evidence, banned phrases, invented numbers; one rewrite allowed | `lib/write.js` | Gemini writes, code validates |
| 7. Send via Gmail to `MY_EMAIL` only | `lib/send.js` | code |

## ICP gates (evidence map)

| Gate | Fails → |
|---|---|
| Reachable | review |
| B2B SaaS (product sold to businesses) | no → dropped · unknown → review |
| Not already on a compliance platform (Vanta, Drata, Secureframe, Thoropass, Scrut, Sprinto) | dropped |
| Has frameworks left to get (SOC 2, ISO 27001, GDPR) | dropped |
| Series A–C (funding stage, 10–1000 people, 5+ open roles, or enterprise plan) | too late/too early → dropped · unknown → qualified, flagged, goes to drafts |

Nothing is guessed: unclear cases go to **review**, flagged or invalid emails to **draft**, only clean ones are **sent**.

## Fit score

Only ranks companies that passed every gate, and every point has a named reason (shown on each company page): +30 passed gates · +20 stage stated / +10 inferred · +15 hiring for security or compliance · up to +10 other compliance pressure · +10 sells to enterprise · +10 certification in progress · +5 already holds a framework · +5 two or more frameworks left · −15 stage unknown.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in keys
```

**Dashboard**

```bash
npm run build && npm start        # http://localhost:3000
# or: npm run dev
```

| Page | What it's for |
|---|---|
| Overview | Funnel, metrics against the brief (time per company, pages, edit rate), drop and review reasons |
| Run on domains | Paste domains, run dry or with sending; one company per request |
| Companies → detail | Gates, fit breakdown, why this person, the email, evidence, verified facts, pages read, decision trace |
| Review queue | Human gate 1: add a contact by hand (Apollo) and re-run |
| Drafts & sends | Human gate 2: edit, send to your inbox, measure edit rate, turn edits into lessons |
| Feedback loop | Lessons injected into the writer prompt |
| ICP & evidence map | Every rule, in plain English |

**Terminal mode**

```bash
npm run pipeline -- rillet.com --dry-run --trace
npm run pipeline -- domains.txt
```

Locally everything is stored as JSON (`data/results/`, `data/lessons.json`, `.cache/`). With `DATABASE_URL` set it uses Postgres (Neon) instead; tables are created on first use.

## Deploy (Vercel)

1. Create a free Neon database and copy its connection string.
2. `npx vercel` and add the env vars from `.env.example` plus `DATABASE_URL` (and `APP_PASSWORD` to lock the site).
3. Run route allows up to 300 s per company.

## Gemini free tier

About 20 requests per day **per model**. `lib/config.js` lists several models; when one is out of daily quota the pipeline moves to the next and says so. A company costs 2–5 calls.
