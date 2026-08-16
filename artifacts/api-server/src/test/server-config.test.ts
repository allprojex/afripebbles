import { describe, expect, it } from "vitest";
import { resolveHost, resolvePort } from "../lib/serverConfig";

// Pure config-resolution logic — no server actually started here. Proves the
// production defaults (loopback-only host) hold unless explicitly overridden,
// and that PORT keeps its existing required/validated behaviour.
describe("resolveHost", () => {
  it("defaults to 127.0.0.1 when HOST is unset", () => {
    expect(resolveHost({})).toBe("127.0.0.1");
  });

  it("defaults to 127.0.0.1 when HOST is an empty string", () => {
    expect(resolveHost({ HOST: "" })).toBe("127.0.0.1");
  });

  it("uses HOST when explicitly set, e.g. to opt into 0.0.0.0", () => {
    expect(resolveHost({ HOST: "0.0.0.0" })).toBe("0.0.0.0");
  });
});

describe("resolvePort", () => {
  it("resolves a valid PORT to a number", () => {
    expect(resolvePort({ PORT: "3200" })).toBe(3200);
  });

  it("throws when PORT is unset", () => {
    expect(() => resolvePort({})).toThrow(/PORT environment variable is required/);
  });

  it("throws when PORT is not a valid positive number", () => {
    expect(() => resolvePort({ PORT: "not-a-number" })).toThrow(/Invalid PORT value/);
    expect(() => resolvePort({ PORT: "0" })).toThrow(/Invalid PORT value/);
    expect(() => resolvePort({ PORT: "-5" })).toThrow(/Invalid PORT value/);
  });
});

describe("production listener configuration", () => {
  it("HOST=127.0.0.1 and PORT=3200 together resolve to loopback-only on the VPS port", () => {
    const env = { HOST: "127.0.0.1", PORT: "3200" };
    expect(resolveHost(env)).toBe("127.0.0.1");
    expect(resolvePort(env)).toBe(3200);
  });

  it("an unset HOST still resolves to loopback-only, not every interface", () => {
    const env = { PORT: "3200" };
    expect(resolveHost(env)).toBe("127.0.0.1");
  });
});
