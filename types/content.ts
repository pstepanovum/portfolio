export const projectCategories = ["featured", "webApps", "ai"] as const;
export type ProjectCategory = (typeof projectCategories)[number];

export interface PortfolioProject {
  id: string;
  category: ProjectCategory;
  order: number;
  image: string;
  imageStoragePath?: string;
  title: string;
  description: string;
  tags: string[];
  github?: string;
  demo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PortfolioCertification {
  id: string;
  order: number;
  title: string;
  issuer: string;
  date: string;
  credentialId?: string;
  skills?: string[];
  logo?: string;
  logoStoragePath?: string;
  verificationUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PortfolioExperience {
  id: string;
  order: number;
  date: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  type?: string;
  achievements?: string[];
  tech?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "read" | "archived";
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardSettings {
  geminiModel: string;
  geminiApiKey: string;
  projectDraftPrompt: string;
  llmPublicKey: string;
  llmSecretKey: string;
  resumeUrl: string;
  resumeStoragePath: string;
  resumePassword: string;
  resumeIsPublic: boolean;
  updatedAt?: string;
}
