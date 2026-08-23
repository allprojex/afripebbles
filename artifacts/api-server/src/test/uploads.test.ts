import { describe, expect, it, vi, beforeEach } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import sharp from "sharp";
import uploadsRouter from "../routes/admin/uploads";
import app from "../app";

// Real image processing (sharp) runs for real — only the Supabase Storage
// network calls are mocked, consistent with product-image-cleanup.test.ts.
const { uploadMock, getPublicUrlMock, removeMock } = vi.hoisted(() => ({
  uploadMock: vi.fn(),
  getPublicUrlMock: vi.fn(),
  removeMock: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  getSupabaseAdmin: () => ({
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, ...rest: unknown[]) => uploadMock(bucket, path, ...rest),
        getPublicUrl: (path: string) => getPublicUrlMock(bucket, path),
        remove: (paths: string[]) => removeMock(bucket, paths),
      }),
    },
  }),
}));

function createTestApp(): Express {
  const testApp = express();
  testApp.use(express.json());
  testApp.use("/api/admin", uploadsRouter);
  return testApp;
}

async function makePngBuffer(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 20, g: 120, b: 200 } } })
    .png()
    .toBuffer();
}

describe("POST /api/admin/uploads (live sharp processing, mocked storage)", () => {
  const testApp = createTestApp();

  beforeEach(() => {
    uploadMock.mockReset();
    getPublicUrlMock.mockReset();
    removeMock.mockReset();
    uploadMock.mockResolvedValue({ data: { path: "x" }, error: null });
    getPublicUrlMock.mockImplementation((bucket: string, path: string) => ({
      data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/${bucket}/${path}` },
    }));
  });

  it("returns both a display url and a thumbnailUrl, both pointing at webp objects", async () => {
    const buffer = await makePngBuffer(2000, 1500);
    const res = await request(testApp).post("/api/admin/uploads").field("bucket", "product-images").attach("file", buffer, "photo.png");

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/\.webp$/);
    expect(res.body.thumbnailUrl).toMatch(/-thumb\.webp$/);
    expect(res.body.url).not.toBe(res.body.thumbnailUrl);
  });

  it("uploads two distinct objects to storage — the display derivative and the thumbnail derivative", async () => {
    const buffer = await makePngBuffer(2000, 1500);
    await request(testApp).post("/api/admin/uploads").field("bucket", "product-images").attach("file", buffer, "photo.png");

    expect(uploadMock).toHaveBeenCalledTimes(2);
    const [displayCall, thumbCall] = uploadMock.mock.calls;
    expect(displayCall[1]).toMatch(/\.webp$/);
    expect(displayCall[1]).not.toMatch(/-thumb/);
    expect(thumbCall[1]).toMatch(/-thumb\.webp$/);
  });

  it("sets a long, immutable cache-control on the uploaded objects", async () => {
    const buffer = await makePngBuffer(1000, 1000);
    await request(testApp).post("/api/admin/uploads").field("bucket", "product-images").attach("file", buffer, "photo.png");

    for (const call of uploadMock.mock.calls) {
      const options = call[3] as { cacheControl?: string } | undefined;
      expect(options?.cacheControl).toContain("immutable");
    }
  });

  it("falls back to a null thumbnailUrl (without failing the request) if only the thumbnail upload fails", async () => {
    uploadMock.mockImplementation((_bucket: string, path: string) => {
      if (path.includes("-thumb")) return Promise.resolve({ data: null, error: { message: "simulated failure" } });
      return Promise.resolve({ data: { path }, error: null });
    });

    const buffer = await makePngBuffer(1000, 1000);
    const res = await request(testApp).post("/api/admin/uploads").field("bucket", "product-images").attach("file", buffer, "photo.png");

    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/\.webp$/);
    expect(res.body.thumbnailUrl).toBeNull();
  });

  it("rejects a file that isn't a real image", async () => {
    const res = await request(testApp)
      .post("/api/admin/uploads")
      .field("bucket", "product-images")
      .attach("file", Buffer.from("not an image"), "fake.png");

    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown bucket", async () => {
    const buffer = await makePngBuffer(500, 500);
    const res = await request(testApp).post("/api/admin/uploads").field("bucket", "not-a-real-bucket").attach("file", buffer, "photo.png");

    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejects requests without a bearer token when mounted behind requireAdmin", async () => {
    const buffer = await makePngBuffer(500, 500);
    const res = await request(app).post("/api/admin/uploads").field("bucket", "product-images").attach("file", buffer, "photo.png");
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/admin/uploads", () => {
  const testApp = createTestApp();

  beforeEach(() => {
    removeMock.mockReset();
    removeMock.mockResolvedValue({ data: [{ name: "removed" }], error: null });
  });

  it("deletes both the display object and its thumbnail when thumbnailUrl is provided", async () => {
    const bucket = "product-images";
    const base = `${process.env.SUPABASE_URL}/storage/v1/object/public`;
    const res = await request(testApp)
      .delete("/api/admin/uploads")
      .query({ url: `${base}/${bucket}/abc.webp`, thumbnailUrl: `${base}/${bucket}/abc-thumb.webp` });

    expect(res.status).toBe(204);
    expect(removeMock).toHaveBeenCalledWith(bucket, ["abc.webp", "abc-thumb.webp"]);
  });

  it("deletes only the display object when no thumbnailUrl is given (pre-pipeline images)", async () => {
    const bucket = "product-images";
    const base = `${process.env.SUPABASE_URL}/storage/v1/object/public`;
    const res = await request(testApp).delete("/api/admin/uploads").query({ url: `${base}/${bucket}/legacy.png` });

    expect(res.status).toBe(204);
    expect(removeMock).toHaveBeenCalledWith(bucket, ["legacy.png"]);
  });
});
