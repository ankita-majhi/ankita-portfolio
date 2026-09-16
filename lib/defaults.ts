/**
 * Every piece of text on the homepage, as shipped.
 *
 * These are the fallback values: the site renders them when the database is
 * empty or unreachable, and `npm run seed` loads them in so they can be edited
 * from /admin. Editing here changes the default, not the live site.
 */

export type WorkingStep = { number: string; title: string; text: string };
export type IconNote = { icon: string; text: string };
export type JourneyStep = { label: string; title: string; text: string; badge: string };

export type SiteContent = {
  profile: { name: string; email: string; github: string; linkedin: string; college: string };
  hero: { eyebrow: string; headline: string; headlineAccent: string; intro: string; foot: string; primaryCta: string; secondaryCta: string };
  focus: IconNote[];
  work: { label: string; heading: string; headingAccent: string; intro: string; note: string };
  about: { label: string; heading: string; headingAccent: string; workingLabel: string; steps: WorkingStep[]; paragraphs: string[]; notes: IconNote[] };
  skills: { label: string; heading: string; headingAccent: string; intro: string; note: string };
  journey: { label: string; heading: string; headingAccent: string; intro: string; steps: JourneyStep[] };
  contact: { label: string; heading: string; headingAccent: string; intro: string; formHeading: string; formIntro: string };
  footer: { note: string };
};

export const defaultContent: SiteContent = {
  profile: {
    name: "Ankita",
    email: "",
    github: "",
    linkedin: "",
    college: "",
  },
  hero: {
    eyebrow: "ANKITA · ASPIRING DEVELOPER",
    // A newline becomes a line break when rendered.
    headline: "Thoughtful code.\nMeaningful",
    headlineAccent: "experiences.",
    intro: "I’m Ankita, an MCA student exploring web development. I bring curiosity and care to building useful, intuitive digital experiences.",
    foot: "Master of Computer Applications",
    primaryCta: "Explore my work",
    secondaryCta: "Meet the person",
  },
  focus: [
    { icon: "code", text: "Web development" },
    { icon: "layers", text: "Thoughtful interfaces" },
    { icon: "sparkles", text: "Continuous learning" },
  ],
  work: {
    label: "Selected work",
    heading: "Ideas into",
    headingAccent: "interfaces.",
    intro: "A few concepts exploring better ways to connect, learn, and manage everyday life.",
    note: "These are concept studies. Completed projects and live demos will be added as my work develops.",
  },
  about: {
    label: "About me",
    heading: "Curious by nature.",
    headingAccent: "Thoughtful by design.",
    workingLabel: "How I approach a project",
    steps: [
      { number: "01", title: "Understand the problem", text: "Ask questions before writing code." },
      { number: "02", title: "Build with intention", text: "Keep the experience clear and useful." },
      { number: "03", title: "Learn and refine", text: "Test the details. Make the next version better." },
    ],
    // Text between *asterisks* is rendered in italics.
    paragraphs: [
      "I’m an MCA student with a soft spot for thoughtful interfaces and the little details that make technology feel *human.*",
      "I like taking things apart, asking one more question, and figuring out how an idea can become something useful. Right now, I’m building my foundations in development, one experiment at a time.",
      "I’m especially interested in the space where good engineering meets a clear, accessible user experience.",
    ],
    notes: [
      { icon: "graduation", text: "MCA student" },
      { icon: "code", text: "Lifelong learner" },
      { icon: "sparkles", text: "Detail enthusiast" },
    ],
  },
  skills: {
    label: "Skills & tools",
    heading: "My growing",
    headingAccent: "toolkit.",
    intro: "The technologies I’m learning and the foundations I’m building on.",
    note: "Not a finish line. An ever-evolving learning roadmap.",
  },
  journey: {
    label: "Education & growth",
    heading: "Learning with",
    headingAccent: "purpose.",
    intro: "Every new thing I learn opens\nanother door worth walking through.",
    steps: [
      { label: "01 / THE FOUNDATION", title: "Master of Computer Applications", text: "Studying software engineering, application development, databases, and the ideas that power our digital world.", badge: "CURRENT CHAPTER" },
      { label: "02 / BEYOND THE CLASSROOM", title: "Learn it. Try it. Make it better.", text: "Connecting theory to practice through coding exercises, interface explorations, and independent learning.", badge: "" },
      { label: "03 / WHAT’S NEXT", title: "Good people. Meaningful work.", text: "Looking forward to learning alongside experienced teams and contributing to products that make a difference.", badge: "" },
    ],
  },
  contact: {
    label: "Get in touch",
    heading: "Let’s build",
    headingAccent: "something meaningful.",
    intro: "Have a project or opportunity in mind?\nI’d love to hear about it.",
    formHeading: "Start a conversation.",
    formIntro: "Write a note. It goes straight to Ankita’s inbox.",
  },
  footer: {
    note: "Built with care.",
  },
};

export const defaultSkills = [
  { icon: "code", title: "Frontend development", category: "FRONTEND", text: "Turning an idea into an interface that feels right.", items: ["HTML & CSS", "JavaScript", "React", "Next.js"] },
  { icon: "database", title: "Backend & data", category: "BACKEND & DATA", text: "Connecting the dots between logic, data, and people.", items: ["Java", "Python", "SQL", "MongoDB"] },
  { icon: "terminal", title: "Tools & fundamentals", category: "TOOLS & FUNDAMENTALS", text: "Good habits, solid foundations, and a lot of iteration.", items: ["Git & GitHub", "VS Code", "OOP", "Data structures"] },
];

/** Icons an admin can choose for a skill card, focus strip item, or about note. */
export const ICONS = ["code", "database", "terminal", "layers", "sparkles", "graduation", "globe", "plus", "mail"] as const;
