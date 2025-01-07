import { NavLink } from "@/types";

export const siteConfig = {
  name: "Your App Name",
  description: "Your app description",
  nav: {
    links: [
      { href: "#", label: "Home" },
      { href: "#about", label: "About" },
      { href: "#features", label: "Features" },
      { href: "#contact", label: "Contact" },
    ] satisfies NavLink[],
  },
};
