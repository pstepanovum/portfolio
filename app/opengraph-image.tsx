import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/seo";

export const alt = `${siteConfig.name} portfolio`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #050505 0%, #10131a 55%, #1c222c 100%)",
          color: "#ffffff",
          padding: "56px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            color: "rgba(255,255,255,0.72)",
            fontSize: 28,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              background: "#22c55e",
            }}
          />
          Available for work
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              maxWidth: 980,
              fontSize: 74,
              lineHeight: 1.02,
              fontWeight: 700,
              letterSpacing: "-0.05em",
            }}
          >
            Full Stack Developer, AI Engineer, and Cybersecurity Analyst
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 900,
              color: "rgba(255,255,255,0.72)",
              fontSize: 30,
              lineHeight: 1.35,
            }}
          >
            Pavel Stepanov builds secure web applications, machine learning
            systems, and modern product experiences.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "rgba(255,255,255,0.72)",
            fontSize: 26,
          }}
        >
          <div style={{ display: "flex", gap: "18px" }}>
            <span>Next.js</span>
            <span>TypeScript</span>
            <span>AI</span>
            <span>Cybersecurity</span>
          </div>
          <div>{siteConfig.url.replace("https://", "")}</div>
        </div>
      </div>
    ),
    size,
  );
}
