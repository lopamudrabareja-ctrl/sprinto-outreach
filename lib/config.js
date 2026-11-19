// The ICP and every threshold the pipeline uses. Change rules here, nowhere else.

export const CONFIG = {
  // Tried in order; if one is overloaded or slow, the next is used. GEMINI_MODEL (if set) goes first.
  models: [...new Set([
    process.env.GEMINI_MODEL,
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
  ].filter(Boolean))],
  // Free tier: ~20 requests/day per model. Spreading over several models multiplies the daily budget.
  llmTimeoutMs: 45_000,

  scrape: {
    userAgent: 'Mozilla/5.0 (compatible; SprintoOutreachResearch/1.0; single-fetch, robots-respecting)',
    timeoutMs: 15000,
    minWords: 120,          // fewer words than this = JS shell, re-read via Jina Reader
    minBlockWords: 8,       // lecture rule: drop blocks under eight words (headings exempt)
    maxChars: 8000,         // ~2,000 tokens per page sent to the model
    delayMs: 800,           // politeness delay between fetches to the same site
  },

  loop: {
    maxExtraFetches: 4,     // worst case: 4 fetches beyond the homepage
    // Per-question budgets from the evidence map
    budget: { b2b: 1, certs: 1, stage: 2 },
  },

  // Frameworks Sprinto sells. A company that already holds all of them has nothing left to buy.
  frameworks: ['SOC 2', 'ISO 27001', 'GDPR'],

  // Already on a compliance-automation platform = a competitor's customer. Detected in code from links/text.
  // Matched against page text, links and script/iframe sources (e.g. a trust portal hosted by the vendor).
  competitorPlatforms: {
    Vanta: [/trust\.vanta\.com|vanta\.com\/(products\/)?trust|powered[\s_-]+by[\s_-]+vanta/i],
    Drata: [/trust\.drata\.com|drata\.com\/(products\/)?trust|powered[\s_-]+by[\s_-]+drata/i],
    Secureframe: [/trust\.secureframe\.com|secureframe\.com\/(products\/)?trust|powered[\s_-]+by[\s_-]+secureframe/i],
    Thoropass: [/thoropass\.com|powered[\s_-]+by[\s_-]+thoropass/i],
    Sprinto: [/trust\.sprinto\.com|sprinto\.com\/(products\/)?trust|powered[\s_-]+by[\s_-]+sprinto/i],
    Scrut: [/trust\.scrut\.io|powered[\s_-]+by[\s_-]+scrut/i],
  },

  stage: {
    inRange: ['Seed+', 'Series A', 'Series B', 'Series C'],
    tooLate: ['Series D', 'Series E', 'Series F', 'Public', 'Acquired'],
    minOpenRoles: 5,        // 5+ open roles counts as a stage signal
    maxEmployees: 1000,     // beyond this they have an in-house GRC team
    minEmployees: 10,
  },

  // Who to email, by stage. First match wins. Never "nearest person with manager in the title".
  contactPriority: {
    early: [ // Series A / small / unknown
      /\bcto\b|chief technology/i,
      /co-?founder|founder/i,
      /\bceo\b|chief executive/i,
      /head of engineering|vp,? engineering/i,
    ],
    growth: [ // Series B-C / 100+ people
      /\bciso\b|chief information security|head of security|vp,? security|security lead/i,
      /head of compliance|compliance (lead|manager|director)|\bgrc\b/i,
      /\bcto\b|chief technology/i,
      /vp,? engineering|head of engineering/i,
      /co-?founder|founder/i,
    ],
  },

  // Evidence map: question -> where it lives, in the order the loop tries them.
  evidenceMap: {
    b2b:   { paths: ['/product', '/about', '/platform', '/solutions'], keywords: ['product', 'about', 'platform', 'solution', 'features'] },
    certs: { paths: ['/security', '/trust', '/compliance', '/trust-center'], keywords: ['security', 'trust', 'compliance', 'soc'] },
    stage: { paths: ['/careers', '/pricing', '/customers', '/jobs', '/about'], keywords: ['careers', 'jobs', 'hiring', 'pricing', 'customers', 'join'] },
  },

  email: {
    minWords: 60,
    maxWords: 140,
    maxSubjectChars: 60,
    bannedPhrases: [
      'hope this email finds you', 'hope you are doing well', 'i wanted to reach out',
      'quick question', 'touch base', 'circle back', 'synergy', 'revolutionize',
      'game-changer', 'cutting-edge', 'leverage', 'just following up',
    ],
  },
};
