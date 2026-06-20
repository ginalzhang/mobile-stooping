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

export type Testimonial = {
  quote: string;
  attribution: string;
  detail: string;
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
    detail: "Estimated retail value kept in neighbors' pockets through reuse."
  },
  {
    value: "20 cities",
    label: "Across 6 countries",
    detail: "A student-led playbook that can travel beyond one campus."
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
    body: "The team made browsing, reserving, and pickup feel like shopping, without prices."
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
    bio: "Started Stooping Club and keeps the reuse mission focused on access, trust, and scale."
  },
  {
    name: "Felicia Tom",
    role: "VP of Operations",
    bio: "Keeps inventory intake, quality checks, pickup timing, and customer handoff running smoothly."
  },
  {
    name: "Justin Chuk",
    role: "VP of Outreach & Partnerships",
    bio: "Builds the community and partner network that keeps good items moving locally."
  },
  {
    name: "Inesh Gupta",
    role: "Head of Technology",
    bio: "Supports the systems behind live inventory, reservation flow, and branch-ready operations."
  }
];

export const branchSteps = [
  "Choose a reliable local pickup spot",
  "Collect clean, useful items",
  "Photograph and list everything clearly",
  "Run predictable weekly or seasonal drops"
];

export const trustPrinciples = [
  "Every item is listed at $0, with no in-app payment.",
  "Listings call out condition, status, and pickup constraints before checkout.",
  "Checkout rechecks live Shopify availability before a pickup order is created.",
  "Pickup details and reminders are kept visible after confirmation."
];

export const testimonials: Testimonial[] = [
  {
    quote:
      "I furnished my first apartment with things that would have been thrown out. It felt like shopping, but it was free and local.",
    attribution: "Berkeley pickup customer",
    detail: "Reserved kitchenware, storage, and decor from a weekly drop."
  },
  {
    quote:
      "The clear photos and condition notes made it easy to decide fast, and the pickup window kept the handoff simple.",
    attribution: "Student mover",
    detail: "Claimed essentials during a move-in weekend."
  }
];
