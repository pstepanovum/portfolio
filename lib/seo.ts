import type { Metadata, MetadataRoute } from "next";

type RouteKey = "home" | "about" | "projects" | "skills" | "contact";
type BreadcrumbRouteKey = Exclude<RouteKey, "home">;
type SitemapChangeFrequency =
  NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

type RouteSeoConfig = {
  label: string;
  path: string;
  title?: string;
  description: string;
  keywords: readonly string[];
  image: string;
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
  email: "contact@pstepanov.work",
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
      images: [
        {
          url: absoluteUrl(siteConfig.opengraphImagePath),
          width: 1200,
          height: 630,
          alt: `${pageTitle} | ${siteConfig.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: route.description,
      images: [absoluteUrl(siteConfig.twitterImagePath)],
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
