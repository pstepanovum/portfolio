import Link from "next/link";
import { getBreadcrumbItems, type BreadcrumbRouteKey } from "@/lib/seo";

/**
 * Visible breadcrumb trail.
 *
 * Mirrors getBreadcrumbJsonLd exactly, both drawing from getBreadcrumbItems:
 * Google expects the markup to describe a trail the visitor can actually see,
 * and the two drifting apart is what invalidates the rich result.
 */
export function Breadcrumbs({ routeKey }: { routeKey: BreadcrumbRouteKey }) {
  const items = getBreadcrumbItems(routeKey);

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.href} className="flex items-center gap-2">
              {isLast ? (
                <span aria-current="page" className="text-white/70">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-white/50 transition-colors hover:text-white"
                >
                  {item.name}
                </Link>
              )}
              {isLast ? null : (
                <span aria-hidden="true" className="text-white/25">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
