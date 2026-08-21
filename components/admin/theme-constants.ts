export const ADMIN_THEME_STORAGE_KEY = "portfolio-admin-theme";
export const ADMIN_THEME_ATTRIBUTE = "data-admin-theme";

export type AdminTheme = "dark" | "light";

export function isAdminTheme(value: unknown): value is AdminTheme {
  return value === "dark" || value === "light";
}
