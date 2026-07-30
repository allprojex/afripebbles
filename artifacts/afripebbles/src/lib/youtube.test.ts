import { describe, expect, it } from "vitest";
import { toYoutubeEmbedUrl } from "./youtube";

describe("toYoutubeEmbedUrl", () => {
  it("converts a standard watch URL", () => {
    expect(toYoutubeEmbedUrl("https://www.youtube.com/watch?v=abc123")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
  });

  it("converts a youtu.be short URL", () => {
    expect(toYoutubeEmbedUrl("https://youtu.be/abc123")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
  });

  it("passes through an already-embeddable URL", () => {
    expect(toYoutubeEmbedUrl("https://www.youtube.com/embed/abc123")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
  });

  it("returns null for non-YouTube URLs", () => {
    expect(toYoutubeEmbedUrl("https://example.com/video")).toBeNull();
  });

  it("returns null for null/undefined input", () => {
    expect(toYoutubeEmbedUrl(null)).toBeNull();
    expect(toYoutubeEmbedUrl(undefined)).toBeNull();
  });

  it("returns null for malformed URLs instead of throwing", () => {
    expect(toYoutubeEmbedUrl("not a url")).toBeNull();
  });
});
