/**
 * The people behind CampusOS, shown on /contributors.
 *
 * Only public professional details live here. Add `links` (LinkedIn, GitHub, portfolio) when you have the URLs;
 * the page renders whatever is in the array and hides the row when it is empty.
 */

export interface ContributorLink {
  label: string;
  href: string;
}

export interface ContributorRole {
  title: string;
  org: string;
  period: string;
}

export interface Contributor {
  id: string;
  name: string;
  headline: string;
  location: string;
  /** Path under /public (resized WebP, square). */
  photo: string;
  photoAlt: string;
  summary: string;
  skills: string[];
  /** Short experience lines, newest first. */
  roles: ContributorRole[];
  highlights: string[];
  /** Programme, batch and shift, e.g. "CSE · Batch 62 · Day". */
  batch: string;
  education?: string;
  languages?: string[];
  funFact?: string;
  email: string;
  /** International number with the country code, digits only after the plus sign (used for the wa.me link). */
  whatsapp: { display: string; digits: string };
  links: ContributorLink[];
}

export const CONTRIBUTORS: Contributor[] = [
  {
    id: "yeasaleh",
    name: "Yeasaleh",
    headline: "Full-Stack Software Engineer · Team Lead, Nurix Hive",
    location: "Dhaka, Bangladesh",
    photo: "/contributors/contributor-1.webp",
    photoAlt: "Portrait of Yeasaleh",
    summary:
      "Owns a feature from the database to the last animation frame. Four-plus years of Next.js, React, Node.js and TypeScript, with PostgreSQL, MySQL, AWS and REST and GraphQL APIs behind them. Leads delivery at Nurix Hive while still shipping production code.",
    skills: ["Technical product management", "Next.js", "React", "TypeScript", "Node.js", "Python", "FastAPI", "PostgreSQL", "Prisma", "AWS", "Framer Motion", "GSAP", "Stripe", "System design"],
    roles: [
      { title: "Software Engineer and Team Lead", org: "Nurix Hive", period: "Aug 2025 - Present" },
      { title: "Web Developer", org: "Manaknight Digital", period: "Dec 2023 - Jul 2025" },
      { title: "Software Engineer", org: "MedLink Healthcare", period: "Mar 2022 - Dec 2023" },
    ],
    highlights: [
      "Architected a multi-tenant SaaS (wildcard subdomains, custom domains) that serves several products from one codebase.",
      "Built MedLink Jobs, India's first healthcare recruitment portal, serving 300,000+ registered users.",
      "Thesis in progress: RAMP26, a region-aware multi-perspective NLP framework.",
    ],
    batch: "CSE · Batch 62 · Day",
    education: "B.Sc. in Computer Science & Engineering, City University (2023 - present)",
    languages: ["Bangla (native)", "English (professional)"],
    email: "yeasaleh.contact@gmail.com",
    whatsapp: { display: "+880 1735-782467", digits: "8801735782467" },
    links: [
      { label: "GitHub", href: "https://github.com/yeasaleh2002" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/yea-saleh/" },
    ],
  },
  {
    id: "fazle-rabbi",
    name: "Fazle Rabbi",
    headline: "CSE student · Full-stack web developer",
    location: "Bangladesh",
    photo: "/contributors/contributor-2.webp",
    photoAlt: "Portrait of Fazle Rabbi",
    summary: "A passionate CSE student who loves coding, problem-solving and building impactful software. Currently working on full-stack web applications.",
    skills: ["Python", "Django", "FastAPI", "SQL", "MySQL", "PostgreSQL", "AI/ML", "React", "Full-stack web", "AWS", "System design", "Problem solving"],
    roles: [],
    highlights: [
      "Works across the stack: Python (Django, FastAPI), SQL databases (MySQL, PostgreSQL) and AI/ML.",
      "Building full-stack web applications while learning React, AWS and system design.",
      "Contributor on CampusOS with the Nurix Hive team, for the CPCCU hackathon.",
      "Loves exploring new technologies and working on innovative projects.",
    ],
    batch: "CSE · Batch 62 · Day",
    education: "B.Sc. in Computer Science & Engineering, City University (Batch 62, Day)",
    email: "rabbifazle.contact@gmail.com",
    whatsapp: { display: "+880 1736-208819", digits: "8801736208819" },
    links: [
      { label: "GitHub", href: "https://github.com/Fazle-Rabbi72" },
      { label: "LinkedIn", href: "https://linkedin.com/in/fazle-rabbi-852616252" },
    ],
  },
];
