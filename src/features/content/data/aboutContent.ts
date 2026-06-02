export type ImpactStat = {
  label: string;
  value: string;
  detail: string;
};

export type TimelineItem = {
  year: string;
  title: string;
  body: string;
};

export type TeamMember = {
  name: string;
  role: string;
  bio: string;
};

export const impactStats: ImpactStat[] = [
  {
    value: "10,000+",
    label: "Items diverted",
    detail: "Useful finds kept from landfill and sent to good homes."
  },
  {
    value: "$200K+",
    label: "Avoided purchases",
    detail: "Money customers did not need to spend on reusable goods."
  },
  {
    value: "20 cities",
    label: "Across 6 countries",
    detail: "A growing reuse network beyond one campus."
  },
  {
    value: "$0",
    label: "Always free",
    detail: "No payments, no delivery, local pickup only."
  }
];

export const storyTimeline: TimelineItem[] = [
  {
    year: "Aug 2023",
    title: "A school reuse idea",
    body: "Stooping Club began as a student effort in Oakland to fight consumerism through reuse."
  },
  {
    year: "Oct 2023",
    title: "The first free online store",
    body: "The team made browsing, reserving, and pickup feel like shopping without prices."
  },
  {
    year: "2024-2025",
    title: "Branches and recognition",
    body: "The model spread to new cities and earned grants, awards, and local recognition."
  },
  {
    year: "Jan 2026",
    title: "Berkeley flagship",
    body: "Stooping Club Berkeley launched as a public Shopify-powered branch."
  }
];

export const teamMembers: TeamMember[] = [
  {
    name: "William Chui",
    role: "Founder and CEO",
    bio: "Started Stooping Club and leads the reuse mission."
  },
  {
    name: "Felicia Tom",
    role: "VP of Operations",
    bio: "Keeps inventory, pickup, and customer handoff running smoothly."
  },
  {
    name: "Justin Chuk",
    role: "VP of Outreach & Partnerships",
    bio: "Builds the community and partner network."
  },
  {
    name: "Inesh Gupta",
    role: "Head of Technology",
    bio: "Supports the systems behind the free storefront."
  }
];

export const branchSteps = [
  "Choose a reliable local pickup spot",
  "Collect clean, useful items",
  "Photograph and list everything clearly",
  "Run predictable weekly or seasonal drops"
];
