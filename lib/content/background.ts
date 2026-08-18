/**
 * Serializable background content.
 *
 * These sections are authored in code rather than Firestore, so the data lives
 * here as plain objects and the pages map `iconKey` back to React components.
 * Keeping it JSON-safe is what lets the MCP server expose it alongside the
 * Firestore-backed projects, certifications, and timeline entries.
 */

export type CoreValue = {
  iconKey: "security" | "code" | "brain" | "database";
  title: string;
  description: string;
};

export type SkillGroup = {
  category: string;
  skills: string[];
};

export type SkillProficiency = {
  iconKey: "code" | "database" | "brain" | "shield";
  title: string;
  skills: string[];
  level: string[];
};

export type ToolEntry = {
  iconKey:
    | "monitor"
    | "gitBranch"
    | "box"
    | "shield"
    | "cpu"
    | "figma"
    | "layout"
    | "terminal";
  name: string;
};

export const coreValues: CoreValue[] = [
  {
    iconKey: "security",
    title: "Security First",
    description:
      "Implementing robust security practices, vulnerability assessments, and data protection measures in every project.",
  },
  {
    iconKey: "code",
    title: "Technical Excellence",
    description:
      "Crafting scalable solutions using clean code principles, modern frameworks, and efficient algorithms.",
  },
  {
    iconKey: "brain",
    title: "AI Integration",
    description:
      "Leveraging machine learning and artificial intelligence to build intelligent, data-driven applications.",
  },
  {
    iconKey: "database",
    title: "Full Stack Mastery",
    description:
      "Building end-to-end applications with expertise in both frontend interfaces and backend systems.",
  },
];

export const skillGroups: SkillGroup[] = [
  {
    category: "Cybersecurity",
    skills: [
      "Penetration Testing",
      "Network Security",
      "Cryptography",
      "Secure Coding",
      "Threat Analysis",
      "Security Auditing",
    ],
  },
  {
    category: "AI & ML",
    skills: [
      "TensorFlow",
      "PyTorch",
      "Computer Vision",
      "NLP",
      "Deep Learning",
      "Neural Networks",
    ],
  },
  {
    category: "Full Stack Development",
    skills: [
      "React/Next.js",
      "Node.js/Express",
      "TypeScript",
      "PostgreSQL",
      "GraphQL",
      "AWS/Cloud",
    ],
  },
  {
    category: "Audio Engineering",
    skills: [
      "Digital Audio",
      "Sound Design",
      "Pro Tools",
      "Audio Processing",
      "Studio Equipment",
      "Mixing/Mastering",
    ],
  },
];

export const skillProficiency: SkillProficiency[] = [
  {
    iconKey: "code",
    title: "Frontend Development",
    skills: ["React", "Next.js", "TypeScript", "CSS/SASS"],
    level: ["95%", "90%", "85%", "90%"],
  },
  {
    iconKey: "database",
    title: "Backend Development",
    skills: ["Node.js", "Python", "PostgreSQL", "MongoDB"],
    level: ["85%", "90%", "80%", "85%"],
  },
  {
    iconKey: "brain",
    title: "AI & Machine Learning",
    skills: ["TensorFlow", "PyTorch", "Computer Vision", "NLP"],
    level: ["80%", "75%", "85%", "80%"],
  },
  {
    iconKey: "shield",
    title: "DevOps & Security",
    skills: ["Docker", "AWS", "CI/CD", "Cybersecurity"],
    level: ["85%", "80%", "85%", "75%"],
  },
];

export const tools: ToolEntry[] = [
  { iconKey: "monitor", name: "VS Code" },
  { iconKey: "gitBranch", name: "Git" },
  { iconKey: "box", name: "Docker" },
  { iconKey: "shield", name: "Nginx" },
  { iconKey: "cpu", name: "Postman" },
  { iconKey: "figma", name: "Figma" },
  { iconKey: "layout", name: "Jira" },
  { iconKey: "terminal", name: "Linux" },
];
