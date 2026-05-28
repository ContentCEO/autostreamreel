// AgentOS agent catalog. Each entry: id (matches AGENT_PROMPTS), display name,
// short tagline, category, and the input fields the agent needs.

export const AGENTS = [
  // ---- MARKETING ----
  {
    id: "market-research",
    name: "Market Research",
    tagline: "Start with the market.",
    category: "Marketing",
    inputs: [
      { key: "niche",    label: "Niche / product",            placeholder: "e.g. residential cleaning in Boston metro" },
      { key: "region",   label: "Region / geo",               placeholder: "e.g. Greater Boston, MA" },
      { key: "audience", label: "Audience hypothesis (optional)", placeholder: "e.g. dual-income homeowners 30-50" },
    ],
  },
  {
    id: "icp",
    name: "ICP",
    tagline: "Precision over population.",
    category: "Marketing",
    inputs: [
      { key: "offer",    label: "Offer",                  placeholder: "what you sell + price/value range" },
      { key: "market",   label: "Market summary",         placeholder: "paste from Market Research output" },
      { key: "industry", label: "Industries to consider", placeholder: "comma-separated" },
    ],
  },
  {
    id: "competitor",
    name: "Competitor Analysis",
    tagline: "Know them. Beat them.",
    category: "Marketing",
    inputs: [
      { key: "brand",       label: "Your brand",                placeholder: "name + 1-line positioning" },
      { key: "competitors", label: "Competitors (3-5)",          placeholder: "names, URLs, or both — one per line", multiline: true },
      { key: "differentiators", label: "Where you think you win (optional)" },
    ],
  },
  {
    id: "content-strategy",
    name: "Content Strategy",
    tagline: "Great content is planned.",
    category: "Marketing",
    inputs: [
      { key: "icp",     label: "ICP summary",          placeholder: "paste from ICP output", multiline: true },
      { key: "goals",   label: "Goals for next 90 days", placeholder: "e.g. 3 booked calls/wk from LinkedIn" },
      { key: "channels", label: "Channels in scope",    placeholder: "e.g. LinkedIn, newsletter, YouTube shorts" },
    ],
  },
  {
    id: "linkedin",
    name: "LinkedIn Posts",
    tagline: "Make ideas publishable.",
    category: "Marketing",
    inputs: [
      { key: "idea",   label: "Raw idea",            placeholder: "what's the post about?", multiline: true },
      { key: "format", label: "Format",              placeholder: "hook | carousel | thought-leadership | CTA" },
      { key: "voice",  label: "Voice / tone (optional)" },
    ],
  },
  {
    id: "email",
    name: "Email Campaigns",
    tagline: "Turn lists into pipeline.",
    category: "Marketing",
    inputs: [
      { key: "audience",   label: "Audience + funnel stage", placeholder: "e.g. cold list of SaaS founders" },
      { key: "objective",  label: "Objective",               placeholder: "e.g. book a discovery call" },
      { key: "sequenceType", label: "Sequence type",         placeholder: "cold | nurture | re-engage | win-back" },
    ],
  },
  {
    id: "landing",
    name: "Landing Page",
    tagline: "Turn offers into pages.",
    category: "Marketing",
    inputs: [
      { key: "offer",     label: "Offer",            placeholder: "what's on the page" },
      { key: "audience",  label: "Audience",         placeholder: "who lands here" },
      { key: "objections", label: "Top objections",  placeholder: "3-5 things they doubt", multiline: true },
      { key: "proof",     label: "Proof you have",   placeholder: "testimonials, results, cases", multiline: true },
    ],
  },
  {
    id: "ad-copy",
    name: "Ad Copy",
    tagline: "Test, don't guess.",
    category: "Marketing",
    inputs: [
      { key: "product",   label: "Product / offer" },
      { key: "audience",  label: "Audience" },
      { key: "platform",  label: "Platform",  placeholder: "Meta | Google | TikTok | LinkedIn" },
      { key: "promise",   label: "Core promise / outcome" },
    ],
  },
  {
    id: "analytics",
    name: "Analytics",
    tagline: "Measure. Learn. Improve.",
    category: "Marketing",
    inputs: [
      { key: "metrics",  label: "Campaign metrics",   placeholder: "paste raw numbers — CTR, replies, meetings, etc.", multiline: true },
      { key: "channels", label: "Channels in the data" },
      { key: "period",   label: "Time period" },
    ],
  },
  {
    id: "marketing-ops",
    name: "Marketing Ops",
    tagline: "Keep the engine running.",
    category: "Marketing",
    inputs: [
      { key: "cadence",  label: "Cadence",         placeholder: "daily | weekly | monthly" },
      { key: "tools",    label: "Tools in use",    placeholder: "Notion, Google Cal, HubSpot, etc." },
      { key: "agents",   label: "Agents to coordinate", placeholder: "names from the marketing list" },
    ],
  },

  // ---- OPERATIONS ----
  {
    id: "lead-qualifier",
    name: "Lead Qualifier",
    tagline: "Replaces: SDR first-touch.",
    category: "Operations",
    inputs: [
      { key: "message",  label: "Inbound message",    placeholder: "paste the DM, form submission, etc.", multiline: true },
      { key: "criteria", label: "Qualifying criteria", placeholder: "what makes someone HOT for your offer", multiline: true },
      { key: "calendar", label: "Calendar link to send hot leads" },
    ],
  },
  {
    id: "onboarding",
    name: "Onboarding",
    tagline: "Replaces: Ops coordinator.",
    category: "Operations",
    inputs: [
      { key: "package",   label: "Package the client bought" },
      { key: "client",    label: "Client name + company" },
      { key: "scope",     label: "Scope summary",          multiline: true },
      { key: "kickoffWindow", label: "Kickoff window",     placeholder: "e.g. 'next Tue/Wed afternoon'" },
    ],
  },
  {
    id: "follow-up",
    name: "Follow-Up",
    tagline: "Replaces: Sales follow-up rep.",
    category: "Operations",
    inputs: [
      { key: "lastConvo", label: "Last conversation",  placeholder: "paste the thread", multiline: true },
      { key: "stage",     label: "Pipeline stage",     placeholder: "e.g. demo'd, no reply 12d" },
      { key: "goal",      label: "Goal of follow-up",  placeholder: "book call, get pricing reply, etc." },
    ],
  },
  {
    id: "proposal",
    name: "Proposal Generator",
    tagline: "Replaces: Junior account exec.",
    category: "Operations",
    inputs: [
      { key: "client",   label: "Client name" },
      { key: "intake",   label: "Intake notes",      placeholder: "their goals, situation, anything from the call", multiline: true },
      { key: "scope",    label: "Scope you'll deliver", multiline: true },
      { key: "budget",   label: "Budget range",      placeholder: "e.g. $5k-$10k" },
    ],
  },
  {
    id: "support",
    name: "Support",
    tagline: "Replaces: Support rep.",
    category: "Operations",
    inputs: [
      { key: "ticket",  label: "Ticket / message", multiline: true },
      { key: "topic",   label: "Knowledge base topic",   placeholder: "e.g. billing, onboarding, refunds" },
      { key: "context", label: "Customer context (optional)" },
    ],
  },
  {
    id: "client-comms",
    name: "Client Comms",
    tagline: "Replaces: Account manager.",
    category: "Operations",
    inputs: [
      { key: "client",  label: "Client name" },
      { key: "period",  label: "Period covered",  placeholder: "e.g. week of Nov 18 / Oct 2025" },
      { key: "wins",    label: "Wins this period", multiline: true },
      { key: "metrics", label: "Metrics to report", placeholder: "live numbers only — invent nothing", multiline: true },
    ],
  },
];

export const AGENT_CATEGORIES = ["Marketing", "Operations"];
