import { routeSeo, siteConfig } from "@/lib/seo";

type RouteKey = keyof typeof routeSeo;

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const MUTED = "rgba(255, 255, 255, 0.58)";
const HAIRLINE = "rgba(255, 255, 255, 0.14)";

export function ogAlt(routeKey: RouteKey) {
  const { ogHeadline } = routeSeo[routeKey];

  // Several headlines already carry the name; repeating it reads badly to a
  // screen reader and adds nothing for a crawler.
  return ogHeadline.includes(siteConfig.name)
    ? ogHeadline
    : `${ogHeadline} | ${siteConfig.name}`;
}

/** Long headlines have to step down or they overflow the 1200x630 card. */
function getHeadlineSize(headline: string) {
  if (headline.length <= 24) return 92;
  if (headline.length <= 44) return 74;
  return 58;
}

/**
 * Shared social card.
 *
 * Renders through Satori, which supports only a subset of CSS: every container
 * needs an explicit display value, and there is no shorthand cascade. Text uses
 * the runtime's bundled font rather than the site's IBM Plex Mono, which would
 * require shipping font bytes into the image runtime.
 */
export function OgCard({ routeKey }: { routeKey: RouteKey }) {
  const route = routeSeo[routeKey];
  const eyebrow = routeKey === "home" ? "Portfolio" : route.label;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0a0a0a",
        color: "#ffffff",
        padding: "72px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 24,
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          color: MUTED,
        }}
      >
        <div style={{ display: "flex" }}>{siteConfig.name}</div>
        <div style={{ display: "flex" }}>{eyebrow}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            maxWidth: 1000,
            fontSize: getHeadlineSize(route.ogHeadline),
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
          }}
        >
          {route.ogHeadline}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            maxWidth: 900,
            fontSize: 30,
            lineHeight: 1.4,
            color: MUTED,
          }}
        >
          {route.ogSummary}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", width: "100%", height: 1, background: HAIRLINE }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 24,
            fontSize: 26,
            color: MUTED,
          }}
        >
          <div style={{ display: "flex" }}>
            {siteConfig.url.replace("https://", "")}
          </div>
          <div style={{ display: "flex" }}>Full Stack · AI · Security</div>
        </div>
      </div>
    </div>
  );
}
