import { ImageResponse } from "next/og";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgCard,
  ogAlt,
} from "@/components/seo/og-template";

export const alt = ogAlt("projects");
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  return new ImageResponse(<OgCard routeKey="projects" />, size);
}
