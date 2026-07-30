import { useEffect } from "react";
import { siteConfig } from "@/content/site";

export interface SeoProps {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  /** Set false for pages that shouldn't be indexed yet (none currently). */
  index?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Sets per-route document title, description, canonical URL, and Open
 * Graph / Twitter card metadata via direct DOM manipulation. This app is a
 * client-only Vite SPA (no SSR), so a react-helmet-style library would add
 * dependency weight for no real benefit over a small effect hook.
 */
export function Seo({ title, description, path, image, jsonLd }: SeoProps) {
  useEffect(() => {
    const fullTitle = siteConfig.seo.titleTemplate(title);
    const desc = description ?? siteConfig.seo.defaultDescription;
    const canonicalPath = path ?? window.location.pathname;
    const canonicalUrl = `${siteConfig.seo.plannedDomain}${canonicalPath}`;
    const ogImage = image ?? `${siteConfig.seo.plannedDomain}/og-default.jpg`;

    document.title = fullTitle;
    setMeta("name", "description", desc);
    setLink("canonical", canonicalUrl);

    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:image", ogImage);

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", ogImage);

    const scriptId = "seo-json-ld";
    document.getElementById(scriptId)?.remove();
    if (jsonLd) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [title, description, path, image, jsonLd]);

  return null;
}

/** Organization schema — safe to include site-wide, only asserts confirmed facts. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.brand.name,
    description: siteConfig.brand.oneLineDescription,
    url: siteConfig.seo.plannedDomain,
  };
}
