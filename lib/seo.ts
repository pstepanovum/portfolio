import type { Metadata, MetadataRoute } from "next";
import type { PortfolioProject } from "@/types/content";

type RouteKey = "home" | "about" | "projects" | "skills" | "contact";
export type BreadcrumbRouteKey = Exclude<RouteKey, "home">;
type SitemapChangeFrequency =
  NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

type RouteSeoConfig = {
  label: string;
  path: string;
  title?: string;
  description: string;
  keywords: readonly string[];
  image: string;
  /** Short headline for the generated social card; the page title is often too long. */
  ogHeadline: string;
  /** One-line supporting copy for the social card. */
  ogSummary: string;
  priority: number;
  changeFrequency: SitemapChangeFrequency;
  openGraphType?: "website" | "profile";
};

export type BreadcrumbItem = {
  name: string;
  href: string;
};

export const siteConfig = {
  name: "Pavel Stepanov",
  url: "https://pstepanov.dev",
  locale: "en_US",
  defaultTitle:
    "Pavel Stepanov | Full Stack Developer, AI Engineer & Cybersecurity Analyst",
  description:
    "Portfolio of Pavel Stepanov, a full stack developer, AI engineer, and cybersecurity analyst building secure web applications, machine learning systems, and modern product experiences.",
  email: "contact@pstepanov.dev",
  github: "https://github.com/pstepanovum",
  linkedin: "https://www.linkedin.com/in/hirepavelstepanov/",
  opengraphImagePath: "/opengraph-image",
  twitterImagePath: "/twitter-image",
  profileImagePath: "/images/page/about/pic.webp",
} as const;

const sharedKeywords = [
  "Pavel Stepanov",
  "Pavel Stepanov portfolio",
  "full stack developer portfolio",
  "AI engineer portfolio",
  "machine learning engineer",
  "cybersecurity analyst",
  "software engineer",
  "Next.js developer",
  "TypeScript developer",
  "web development",
  "artificial intelligence",
  "machine learning",
  "cybersecurity",
] as const;

export const routeSeo: Record<RouteKey, RouteSeoConfig> = {
  home: {
    label: "Home",
    path: "/",
    description:
      "Explore Pavel Stepanov's portfolio featuring full stack development, AI engineering, machine learning, cybersecurity, and production-ready software projects.",
    keywords: [
      "full stack developer",
      "AI engineer",
      "machine learning portfolio",
      "cybersecurity portfolio",
      "software developer portfolio",
      "Next.js portfolio",
    ],
    image: "/images/page/index/hero.webp",
    ogHeadline: "Full Stack Developer, AI Engineer & Cybersecurity Analyst",
    ogSummary:
      "Secure web applications, machine learning systems, and modern product experiences.",
    priority: 1,
    changeFrequency: "weekly",
  },
  about: {
    label: "About",
    path: "/about",
    title: "About",
    description:
      "Learn about Pavel Stepanov's background in full stack development, AI research, cybersecurity, and multidisciplinary product engineering.",
    keywords: [
      "about Pavel Stepanov",
      "full stack developer background",
      "AI researcher",
      "cybersecurity engineer",
      "software engineer bio",
    ],
    image: "/images/page/about/pic.webp",
    ogHeadline: "About Pavel Stepanov",
    ogSummary:
      "Engineering across full stack products, AI research, and cybersecurity.",
    priority: 0.9,
    changeFrequency: "monthly",
    openGraphType: "profile",
  },
  projects: {
    label: "Projects",
    path: "/projects",
    title: "Projects",
    description:
      "Browse Pavel Stepanov's featured projects spanning AI, machine learning, Next.js web apps, DevOps platforms, robotics, and data-driven software engineering.",
    keywords: [
      "software engineering projects",
      "AI projects",
      "machine learning projects",
      "Next.js projects",
      "DevOps portfolio",
      "robotics projects",
    ],
    image: "/images/page/projects/feature-p1.png",
    ogHeadline: "Selected Projects",
    ogSummary:
      "AI and machine learning systems, web platforms, DevOps tooling, and robotics.",
    priority: 0.95,
    changeFrequency: "weekly",
  },
  skills: {
    label: "Skills",
    path: "/skills",
    title: "Skills",
    description:
      "Review Pavel Stepanov's technical skills across frontend and backend development, AI and machine learning, DevOps, cybersecurity, and professional certifications.",
    keywords: [
      "technical skills",
      "developer skills",
      "AI skills",
      "machine learning skills",
      "cybersecurity skills",
      "developer certifications",
    ],
    image: "/images/page/skills/hero.webp",
    ogHeadline: "Skills & Certifications",
    ogSummary:
      "Frontend, backend, AI and machine learning, DevOps, and security practice.",
    priority: 0.85,
    changeFrequency: "monthly",
  },
  contact: {
    label: "Contact",
    path: "/contact",
    title: "Contact",
    description:
      "Contact Pavel Stepanov for full stack development, AI engineering, machine learning, cybersecurity, consulting, and collaboration opportunities.",
    keywords: [
      "contact Pavel Stepanov",
      "hire full stack developer",
      "hire AI engineer",
      "machine learning consultant",
      "cybersecurity consultant",
    ],
    image: "/images/page/contact/hero.webp",
    ogHeadline: "Get in Touch",
    ogSummary:
      "Open to full stack, AI engineering, and cybersecurity work and collaboration.",
    priority: 0.8,
    changeFrequency: "monthly",
  },
};

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, siteConfig.url).toString();
}

export function buildPageMetadata(routeKey: RouteKey): Metadata {
  const route = routeSeo[routeKey];
  const canonical = absoluteUrl(route.path);
  const pageTitle =
    routeKey === "home" ? siteConfig.defaultTitle : route.title ?? route.label;

  return {
    title:
      routeKey === "home"
        ? { absolute: siteConfig.defaultTitle }
        : route.title ?? route.label,
    description: route.description,
    keywords: [...new Set([...sharedKeywords, ...route.keywords])],
    alternates: {
      canonical,
    },
    openGraph: {
      title: pageTitle,
      description: route.description,
      url: canonical,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: route.openGraphType ?? "website",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: route.description,
    },
  };
}

export function getBreadcrumbItems(routeKey: BreadcrumbRouteKey) {
  return [
    { name: routeSeo.home.label, href: routeSeo.home.path },
    { name: routeSeo[routeKey].label, href: routeSeo[routeKey].path },
  ] satisfies BreadcrumbItem[];
}

function getWebsiteId() {
  return `${absoluteUrl("/")}#website`;
}

function getPersonId() {
  return `${absoluteUrl("/")}#person`;
}

function getBreadcrumbId(routeKey: BreadcrumbRouteKey) {
  return `${absoluteUrl(routeSeo[routeKey].path)}#breadcrumb`;
}

function getContactPointId() {
  return `${absoluteUrl("/contact")}#contact-point`;
}

function getWebsiteNode() {
  return {
    "@type": "WebSite",
    "@id": getWebsiteId(),
    url: siteConfig.url,
    name: siteConfig.name,
    description: siteConfig.description,
    inLanguage: "en-US",
  };
}

function getPersonNode() {
  return {
    "@type": "Person",
    "@id": getPersonId(),
    name: siteConfig.name,
    url: siteConfig.url,
    image: absoluteUrl(siteConfig.profileImagePath),
    email: `mailto:${siteConfig.email}`,
    jobTitle:
      "Full Stack Developer, AI Engineer, and Cybersecurity Analyst",
    sameAs: [siteConfig.github, siteConfig.linkedin],
    knowsAbout: [
      "Full Stack Development",
      "Artificial Intelligence",
      "Machine Learning",
      "Cybersecurity",
      "TypeScript",
      "Next.js",
      "React",
      "Python",
      "Cloud Infrastructure",
    ],
  };
}

function getContactPointNode() {
  return {
    "@type": "ContactPoint",
    "@id": getContactPointId(),
    url: absoluteUrl("/contact"),
    email: `mailto:${siteConfig.email}`,
    contactType: "business inquiries",
    availableLanguage: ["English"],
  };
}

export function getBreadcrumbJsonLd(routeKey: BreadcrumbRouteKey) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": getBreadcrumbId(routeKey),
    itemListElement: getBreadcrumbItems(routeKey).map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}

export function getHomePageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      getWebsiteNode(),
      getPersonNode(),
      {
        "@type": "WebPage",
        "@id": `${absoluteUrl("/")}#webpage`,
        url: absoluteUrl("/"),
        name: siteConfig.defaultTitle,
        description: routeSeo.home.description,
        isPartOf: {
          "@id": getWebsiteId(),
        },
        about: {
          "@id": getPersonId(),
        },
      },
    ],
  };
}

export function getPageJsonLd(routeKey: BreadcrumbRouteKey) {
  const route = routeSeo[routeKey];
  const canonical = absoluteUrl(route.path);
  const pageType =
    routeKey === "about"
      ? "AboutPage"
      : routeKey === "contact"
        ? "ContactPage"
        : "CollectionPage";

  const pageNode = {
    "@type": pageType,
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: route.title ?? route.label,
    description: route.description,
    isPartOf: {
      "@id": getWebsiteId(),
    },
    breadcrumb: {
      "@id": getBreadcrumbId(routeKey),
    },
    about: {
      "@id": getPersonId(),
    },
    ...(routeKey === "about" || routeKey === "contact"
      ? {
          mainEntity: {
            "@id": getPersonId(),
          },
        }
      : {
          author: {
            "@id": getPersonId(),
          },
        }),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      getWebsiteNode(),
      getPersonNode(),
      ...(routeKey === "contact" ? [getContactPointNode()] : []),
      getBreadcrumbJsonLd(routeKey),
      pageNode,
    ],
  };
}

/** Structured-data descriptions stay short; the full copy lives on the page. */
function truncate(value: string, maxLength = 180) {
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.length <= maxLength
    ? collapsed
    : `${collapsed.slice(0, maxLength).trimEnd()}...`;
}

/**
 * ItemList of the real projects on /projects.
 *
 * Without this the projects page is just prose to a crawler: the individual
 * works, their tech, and their source and demo links are invisible.
 */
export function getProjectsItemListJsonLd(projects: PortfolioProject[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${absoluteUrl("/projects")}#projects`,
    name: `Projects by ${siteConfig.name}`,
    numberOfItems: projects.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: projects.map((project, index) => {
      const links = [project.demo, project.github].filter(Boolean) as string[];

      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "CreativeWork",
          name: project.title,
          description: truncate(project.description),
          ...(project.image ? { image: project.image } : {}),
          ...(links.length > 0 ? { url: links[0], sameAs: links } : {}),
          ...(project.tags.length > 0 ? { keywords: project.tags.join(", ") } : {}),
          author: { "@id": getPersonId() },
          isPartOf: { "@id": getWebsiteId() },
        },
      };
    }),
  };
}
