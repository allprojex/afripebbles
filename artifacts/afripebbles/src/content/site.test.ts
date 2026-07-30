import { afterEach, describe, expect, it } from "vitest";
import { siteConfig, getConfiguredSocialLinks } from "./site";

describe("getConfiguredSocialLinks", () => {
  afterEach(() => {
    // Reset — no social platform is confirmed configured by default.
    for (const key of Object.keys(siteConfig.social) as (keyof typeof siteConfig.social)[]) {
      (siteConfig.social as Record<string, string | undefined>)[key] = undefined;
    }
  });

  it("returns no links when nothing is configured (the current, honest default)", () => {
    expect(getConfiguredSocialLinks()).toEqual([]);
  });

  it("only returns platforms that have a real URL configured", () => {
    (siteConfig.social as Record<string, string | undefined>).instagram = "https://instagram.com/afripebbles";

    const links = getConfiguredSocialLinks();

    expect(links).toEqual([{ label: "Instagram", href: "https://instagram.com/afripebbles" }]);
  });

  it("never invents a platform the client didn't confirm (e.g. Twitter/X)", () => {
    const links = getConfiguredSocialLinks();
    expect(links.some((l) => /twitter|x\.com/i.test(l.label))).toBe(false);
  });
});
