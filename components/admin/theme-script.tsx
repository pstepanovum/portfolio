import {
  ADMIN_THEME_ATTRIBUTE,
  ADMIN_THEME_STORAGE_KEY,
} from "@/components/admin/theme-constants";

/**
 * Applies the stored admin theme before first paint.
 *
 * This is a raw inline script rather than a client component on purpose: an
 * effect would run after hydration, so a light-theme user would see a flash of
 * the dark shell on every navigation. Storage access is wrapped because it
 * throws outright in some privacy modes.
 */
export function AdminThemeScript() {
  const script = `(function(){try{var t=window.localStorage.getItem(${JSON.stringify(
    ADMIN_THEME_STORAGE_KEY,
  )});if(t==="light"||t==="dark"){document.documentElement.setAttribute(${JSON.stringify(
    ADMIN_THEME_ATTRIBUTE,
  )},t);}}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
