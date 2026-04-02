import { randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  defaultCertifications,
  defaultDashboardSettings,
  defaultExperiences,
  defaultProjects,
} from "@/lib/content/defaults";
import { adminDb } from "@/lib/firebase/admin-core";
import {
  deleteStoredFile,
  uploadLocalPublicAssetToStorage,
} from "@/lib/firebase/storage-core";
import type {
  ContactSubmission,
  DashboardSettings,
  PortfolioCertification,
  PortfolioExperience,
  PortfolioProject,
  ProjectCategory,
} from "@/types/content";

const COLLECTIONS = {
  contacts: "contacts",
  projects: "projects",
  certifications: "certifications",
  experiences: "experiences",
  settings: "settings",
} as const;

const SETTINGS_DOC_ID = "dashboard";

function generateApiKey(prefix: string) {
  return `${prefix}_${randomBytes(24).toString("hex")}`;
}

function stripUndefinedValues<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );
}

function toIsoString(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return typeof value === "string" ? value : undefined;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

function normalizeProject(
  id: string,
  data: Record<string, unknown>,
): PortfolioProject {
  const rawCategory = cleanString(data.category);
  const category: ProjectCategory =
    rawCategory === "featured" ||
    rawCategory === "webApps" ||
    rawCategory === "ai"
      ? rawCategory
      : "featured";

  return {
    id,
    category,
    order: typeof data.order === "number" ? data.order : 0,
    image: cleanString(data.image) || "",
    imageStoragePath: cleanString(data.imageStoragePath),
    title: cleanString(data.title) || "",
    description: cleanString(data.description) || "",
    tags: cleanStringArray(data.tags),
    github: cleanString(data.github),
    demo: cleanString(data.demo),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function normalizeCertification(
  id: string,
  data: Record<string, unknown>,
): PortfolioCertification {
  return {
    id,
    order: typeof data.order === "number" ? data.order : 0,
    title: cleanString(data.title) || "",
    issuer: cleanString(data.issuer) || "",
    date: cleanString(data.date) || "",
    credentialId: cleanString(data.credentialId),
    skills: cleanStringArray(data.skills),
    logo: cleanString(data.logo),
    logoStoragePath: cleanString(data.logoStoragePath),
    verificationUrl: cleanString(data.verificationUrl),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function normalizeExperience(
  id: string,
  data: Record<string, unknown>,
): PortfolioExperience {
  return {
    id,
    order: typeof data.order === "number" ? data.order : 0,
    date: cleanString(data.date) || "",
    title: cleanString(data.title) || "",
    company: cleanString(data.company) || "",
    description: cleanString(data.description) || "",
    location: cleanString(data.location),
    type: cleanString(data.type),
    achievements: cleanStringArray(data.achievements),
    tech: cleanStringArray(data.tech),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function normalizeContact(
  id: string,
  data: Record<string, unknown>,
): ContactSubmission {
  const status =
    data.status === "read" || data.status === "archived" ? data.status : "new";

  return {
    id,
    name: cleanString(data.name) || "",
    email: cleanString(data.email) || "",
    subject: cleanString(data.subject) || "",
    message: cleanString(data.message) || "",
    status,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function normalizeSettings(data?: Record<string, unknown>): DashboardSettings {
  if (!data) {
    return defaultDashboardSettings;
  }

  return {
    geminiModel:
      cleanString(data.geminiModel) || defaultDashboardSettings.geminiModel,
    geminiApiKey:
      cleanString(data.geminiApiKey) || defaultDashboardSettings.geminiApiKey,
    projectDraftPrompt:
      cleanString(data.projectDraftPrompt) ||
      defaultDashboardSettings.projectDraftPrompt,
    llmPublicKey:
      cleanString(data.llmPublicKey) || defaultDashboardSettings.llmPublicKey,
    llmSecretKey:
      cleanString(data.llmSecretKey) || defaultDashboardSettings.llmSecretKey,
    resumeUrl:
      cleanString(data.resumeUrl) || defaultDashboardSettings.resumeUrl,
    resumeStoragePath:
      cleanString(data.resumeStoragePath) ||
      defaultDashboardSettings.resumeStoragePath,
    resumePassword:
      cleanString(data.resumePassword) ||
      defaultDashboardSettings.resumePassword,
    resumeIsPublic:
      typeof data.resumeIsPublic === "boolean"
        ? data.resumeIsPublic
        : defaultDashboardSettings.resumeIsPublic,
    updatedAt: toIsoString(data.updatedAt),
  };
}

export async function getProjects() {
  const snapshot = await adminDb
    .collection(COLLECTIONS.projects)
    .orderBy("order", "asc")
    .get();

  return snapshot.docs.map((doc) =>
    normalizeProject(doc.id, doc.data() as Record<string, unknown>),
  );
}

export async function getProjectsByCategory() {
  const projects = await getProjects();

  return {
    featuredProjects: projects.filter(
      (project) => project.category === "featured",
    ),
    webApps: projects.filter((project) => project.category === "webApps"),
    aiProjects: projects.filter((project) => project.category === "ai"),
  };
}

export async function getProjectById(id: string) {
  const snapshot = await adminDb.collection(COLLECTIONS.projects).doc(id).get();

  if (!snapshot.exists) {
    return null;
  }

  return normalizeProject(
    snapshot.id,
    snapshot.data() as Record<string, unknown>,
  );
}

export async function createProject(
  data: Omit<PortfolioProject, "id" | "createdAt" | "updatedAt">,
) {
  const docRef = adminDb.collection(COLLECTIONS.projects).doc();

  await docRef.set(
    stripUndefinedValues({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );

  const snapshot = await docRef.get();
  return normalizeProject(
    docRef.id,
    snapshot.data() as Record<string, unknown>,
  );
}

export async function updateProject(
  id: string,
  data: Partial<Omit<PortfolioProject, "id" | "createdAt" | "updatedAt">>,
) {
  const docRef = adminDb.collection(COLLECTIONS.projects).doc(id);

  await docRef.update(
    stripUndefinedValues({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );

  const snapshot = await docRef.get();
  return normalizeProject(
    docRef.id,
    snapshot.data() as Record<string, unknown>,
  );
}

export async function deleteProject(id: string) {
  await adminDb.collection(COLLECTIONS.projects).doc(id).delete();
}

export async function getCertifications() {
  const snapshot = await adminDb
    .collection(COLLECTIONS.certifications)
    .orderBy("order", "asc")
    .get();

  return snapshot.docs.map((doc) =>
    normalizeCertification(doc.id, doc.data() as Record<string, unknown>),
  );
}

export async function getCertificationById(id: string) {
  const snapshot = await adminDb
    .collection(COLLECTIONS.certifications)
    .doc(id)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return normalizeCertification(
    snapshot.id,
    snapshot.data() as Record<string, unknown>,
  );
}

export async function createCertification(
  data: Omit<PortfolioCertification, "id" | "createdAt" | "updatedAt">,
) {
  const docRef = adminDb.collection(COLLECTIONS.certifications).doc();

  await docRef.set(
    stripUndefinedValues({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );

  const snapshot = await docRef.get();
  return normalizeCertification(
    docRef.id,
    snapshot.data() as Record<string, unknown>,
  );
}

export async function updateCertification(
  id: string,
  data: Partial<Omit<PortfolioCertification, "id" | "createdAt" | "updatedAt">>,
) {
  const docRef = adminDb.collection(COLLECTIONS.certifications).doc(id);

  await docRef.update(
    stripUndefinedValues({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );

  const snapshot = await docRef.get();
  return normalizeCertification(
    docRef.id,
    snapshot.data() as Record<string, unknown>,
  );
}

export async function deleteCertification(id: string) {
  await adminDb.collection(COLLECTIONS.certifications).doc(id).delete();
}

export async function getExperiences() {
  const snapshot = await adminDb
    .collection(COLLECTIONS.experiences)
    .orderBy("order", "asc")
    .get();

  return snapshot.docs.map((doc) =>
    normalizeExperience(doc.id, doc.data() as Record<string, unknown>),
  );
}

export async function getExperienceById(id: string) {
  const snapshot = await adminDb
    .collection(COLLECTIONS.experiences)
    .doc(id)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return normalizeExperience(
    snapshot.id,
    snapshot.data() as Record<string, unknown>,
  );
}

export async function createExperience(
  data: Omit<PortfolioExperience, "id" | "createdAt" | "updatedAt">,
) {
  const docRef = adminDb.collection(COLLECTIONS.experiences).doc();

  await docRef.set(
    stripUndefinedValues({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );

  const snapshot = await docRef.get();
  return normalizeExperience(
    docRef.id,
    snapshot.data() as Record<string, unknown>,
  );
}

export async function updateExperience(
  id: string,
  data: Partial<Omit<PortfolioExperience, "id" | "createdAt" | "updatedAt">>,
) {
  const docRef = adminDb.collection(COLLECTIONS.experiences).doc(id);

  await docRef.update(
    stripUndefinedValues({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );

  const snapshot = await docRef.get();
  return normalizeExperience(
    docRef.id,
    snapshot.data() as Record<string, unknown>,
  );
}

export async function deleteExperience(id: string) {
  await adminDb.collection(COLLECTIONS.experiences).doc(id).delete();
}

export async function getContacts() {
  const snapshot = await adminDb
    .collection(COLLECTIONS.contacts)
    .orderBy("createdAt", "desc")
    .get();

  if (snapshot.empty) {
    return [] as ContactSubmission[];
  }

  return snapshot.docs.map((doc) =>
    normalizeContact(doc.id, doc.data() as Record<string, unknown>),
  );
}

export async function createContactSubmission(
  data: Omit<ContactSubmission, "id" | "status" | "createdAt" | "updatedAt">,
) {
  const docRef = adminDb.collection(COLLECTIONS.contacts).doc();

  await docRef.set(
    stripUndefinedValues({
      ...data,
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );

  const snapshot = await docRef.get();
  return normalizeContact(
    docRef.id,
    snapshot.data() as Record<string, unknown>,
  );
}

export async function updateContactStatus(
  id: string,
  status: ContactSubmission["status"],
) {
  const docRef = adminDb.collection(COLLECTIONS.contacts).doc(id);

  await docRef.update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const snapshot = await docRef.get();
  return normalizeContact(
    docRef.id,
    snapshot.data() as Record<string, unknown>,
  );
}

export async function deleteContact(id: string) {
  await adminDb.collection(COLLECTIONS.contacts).doc(id).delete();
}

export async function getDashboardSettings() {
  const docRef = adminDb.collection(COLLECTIONS.settings).doc(SETTINGS_DOC_ID);
  const snapshot = await docRef.get();
  const storedData = snapshot.exists
    ? (snapshot.data() as Record<string, unknown>)
    : undefined;
  const normalizedSettings = normalizeSettings(storedData);

  const resolvedPublicKey =
    normalizedSettings.llmPublicKey ||
    process.env.LLM_API_PUBLIC_KEY ||
    generateApiKey("ps_pub");
  const resolvedSecretKey =
    normalizedSettings.llmSecretKey ||
    process.env.LLM_API_SECRET_KEY ||
    generateApiKey("ps_sec");
  const hasMissingPersistedKeys =
    !normalizedSettings.llmPublicKey || !normalizedSettings.llmSecretKey;

  if (hasMissingPersistedKeys) {
    await docRef.set(
      {
        geminiModel: normalizedSettings.geminiModel,
        geminiApiKey: normalizedSettings.geminiApiKey,
        projectDraftPrompt: normalizedSettings.projectDraftPrompt,
        llmPublicKey: resolvedPublicKey,
        llmSecretKey: resolvedSecretKey,
        resumeUrl: normalizedSettings.resumeUrl,
        resumeStoragePath: normalizedSettings.resumeStoragePath,
        resumePassword: normalizedSettings.resumePassword,
        resumeIsPublic: normalizedSettings.resumeIsPublic,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  return {
    ...normalizedSettings,
    geminiApiKey: normalizedSettings.geminiApiKey || "",
    llmPublicKey: resolvedPublicKey,
    llmSecretKey: resolvedSecretKey,
  };
}

export async function saveDashboardSettings(data: DashboardSettings) {
  const docRef = adminDb.collection(COLLECTIONS.settings).doc(SETTINGS_DOC_ID);

  await docRef.set(
    stripUndefinedValues({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );

  const snapshot = await docRef.get();
  return normalizeSettings(snapshot.data() as Record<string, unknown>);
}

export async function getDashboardOverview() {
  const [projects, certifications, experiences, contacts] = await Promise.all([
    getProjects(),
    getCertifications(),
    getExperiences(),
    getContacts(),
  ]);

  return {
    projects: projects.length,
    certifications: certifications.length,
    experiences: experiences.length,
    contacts: contacts.length,
    unreadContacts: contacts.filter((contact) => contact.status === "new")
      .length,
  };
}

export async function seedDefaultPortfolioContent(force = false) {
  const existingProjects = await adminDb.collection(COLLECTIONS.projects).get();
  const existingCertifications = await adminDb
    .collection(COLLECTIONS.certifications)
    .get();
  const existingExperiences = await adminDb
    .collection(COLLECTIONS.experiences)
    .get();

  if (
    !force &&
    (!existingProjects.empty ||
      !existingCertifications.empty ||
      !existingExperiences.empty)
  ) {
    return {
      seeded: false,
      uploadedAssets: 0,
    };
  }

  for (const snapshot of [existingProjects, existingCertifications]) {
    for (const doc of snapshot.docs) {
      const data = doc.data() as Record<string, unknown>;
      await deleteStoredFile(cleanString(data.imageStoragePath));
      await deleteStoredFile(cleanString(data.logoStoragePath));
    }
  }

  const seededProjects = await Promise.all(
    defaultProjects.map(async ({ id, ...project }) => {
      if (!project.image.startsWith("/")) {
        return { id, ...project };
      }

      const uploadedImage = await uploadLocalPublicAssetToStorage(
        project.image,
        "projects",
        id,
      );

      return {
        id,
        ...project,
        image: uploadedImage.url,
        imageStoragePath: uploadedImage.storagePath,
      };
    }),
  );

  const seededCertifications = await Promise.all(
    defaultCertifications.map(async ({ id, ...certification }) => {
      if (!certification.logo?.startsWith("/")) {
        return { id, ...certification };
      }

      const uploadedLogo = await uploadLocalPublicAssetToStorage(
        certification.logo,
        "certifications",
        id,
      );

      return {
        id,
        ...certification,
        logo: uploadedLogo.url,
        logoStoragePath: uploadedLogo.storagePath,
      };
    }),
  );

  const batch = adminDb.batch();

  for (const collectionName of [
    COLLECTIONS.projects,
    COLLECTIONS.certifications,
    COLLECTIONS.experiences,
  ]) {
    const snapshot = await adminDb.collection(collectionName).get();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  }

  seededProjects.forEach(({ id, ...project }) => {
    batch.set(adminDb.collection(COLLECTIONS.projects).doc(id), {
      ...project,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  seededCertifications.forEach(({ id, ...certification }) => {
    batch.set(adminDb.collection(COLLECTIONS.certifications).doc(id), {
      ...certification,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  defaultExperiences.forEach(({ id, ...experience }) => {
    batch.set(adminDb.collection(COLLECTIONS.experiences).doc(id), {
      ...experience,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  batch.set(adminDb.collection(COLLECTIONS.settings).doc(SETTINGS_DOC_ID), {
    ...defaultDashboardSettings,
    llmPublicKey: process.env.LLM_API_PUBLIC_KEY || generateApiKey("ps_pub"),
    llmSecretKey: process.env.LLM_API_SECRET_KEY || generateApiKey("ps_sec"),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return {
    seeded: true,
    uploadedAssets:
      seededProjects.filter((project) => Boolean(project.imageStoragePath))
        .length +
      seededCertifications.filter((certification) =>
        Boolean(certification.logoStoragePath),
      ).length,
  };
}
