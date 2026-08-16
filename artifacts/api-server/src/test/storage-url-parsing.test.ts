import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { parsePublicStorageUrl } from "../lib/storage";

// Pure parsing/validation logic — no DB, no Supabase calls. Proves malformed,
// external, or lookalike URLs can never resolve to a (bucket, path) pair that
// a caller could use to delete something outside our own project/buckets.
describe("parsePublicStorageUrl", () => {
  const ORIGINAL_SUPABASE_URL = process.env.SUPABASE_URL;

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://myproject.supabase.co";
  });

  afterEach(() => {
    process.env.SUPABASE_URL = ORIGINAL_SUPABASE_URL;
  });

  it("parses a well-formed public object URL from the configured project", () => {
    const result = parsePublicStorageUrl("https://myproject.supabase.co/storage/v1/object/public/product-images/abc-123.jpg");
    expect(result).toEqual({ bucket: "product-images", path: "abc-123.jpg" });
  });

  it("parses nested paths and decodes percent-encoding", () => {
    const result = parsePublicStorageUrl("https://myproject.supabase.co/storage/v1/object/public/branding/logo%20final.png");
    expect(result).toEqual({ bucket: "branding", path: "logo final.png" });
  });

  it("rejects a URL from a different host, even with an identical path shape", () => {
    const result = parsePublicStorageUrl("https://attacker.example.com/storage/v1/object/public/product-images/abc-123.jpg");
    expect(result).toBeNull();
  });

  it("rejects a lookalike host that merely contains the real project name", () => {
    const result = parsePublicStorageUrl("https://myproject.supabase.co.attacker.com/storage/v1/object/public/product-images/abc-123.jpg");
    expect(result).toBeNull();
  });

  it("rejects a bucket outside the approved allow-list", () => {
    const result = parsePublicStorageUrl("https://myproject.supabase.co/storage/v1/object/public/some-other-bucket/abc-123.jpg");
    expect(result).toBeNull();
  });

  it("rejects a completely malformed URL", () => {
    expect(parsePublicStorageUrl("not a url at all")).toBeNull();
    expect(parsePublicStorageUrl("")).toBeNull();
  });

  it("rejects a URL that doesn't match the storage object path shape", () => {
    const result = parsePublicStorageUrl("https://myproject.supabase.co/some/other/path");
    expect(result).toBeNull();
  });

  it("rejects any URL when SUPABASE_URL isn't configured", () => {
    delete process.env.SUPABASE_URL;
    const result = parsePublicStorageUrl("https://myproject.supabase.co/storage/v1/object/public/product-images/abc-123.jpg");
    expect(result).toBeNull();
  });
});
