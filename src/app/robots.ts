import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/sign-in", "/add"] },
    sitemap: "https://maintain.help/sitemap.xml",
  };
}
