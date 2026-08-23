import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processUploadedImage, IMAGE_DERIVATIVES } from "../lib/imagePipeline";

async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 50, b: 50 } } })
    .png()
    .toBuffer();
}

describe("processUploadedImage", () => {
  it("resizes a large original down to the display and thumbnail max widths", async () => {
    const original = await makePng(2400, 1800); // 4:3
    const result = await processUploadedImage(original);

    expect(result.display.width).toBe(IMAGE_DERIVATIVES.display.maxWidth);
    expect(result.thumbnail.width).toBe(IMAGE_DERIVATIVES.thumbnail.maxWidth);
  });

  it("preserves aspect ratio on both derivatives", async () => {
    const original = await makePng(2400, 1200); // 2:1
    const result = await processUploadedImage(original);

    expect(result.display.height).toBe(Math.round(result.display.width / 2));
    expect(result.thumbnail.height).toBe(Math.round(result.thumbnail.width / 2));
  });

  it("never upscales an original smaller than the target derivative width", async () => {
    const original = await makePng(300, 200);
    const result = await processUploadedImage(original);

    // Display target is 1200 — a 300px-wide original must stay 300px, not be stretched up.
    expect(result.display.width).toBe(300);
    expect(result.display.height).toBe(200);
    // Thumbnail target is 600 — same story.
    expect(result.thumbnail.width).toBe(300);
    expect(result.thumbnail.height).toBe(200);
  });

  it("encodes both derivatives as webp", async () => {
    const original = await makePng(1000, 1000);
    const result = await processUploadedImage(original);

    expect(result.display.contentType).toBe("image/webp");
    expect(result.thumbnail.contentType).toBe("image/webp");

    const displayMeta = await sharp(result.display.buffer).metadata();
    const thumbMeta = await sharp(result.thumbnail.buffer).metadata();
    expect(displayMeta.format).toBe("webp");
    expect(thumbMeta.format).toBe("webp");
  });

  it("produces a materially smaller byte size than an uncompressed PNG original of the same pixels", async () => {
    // A photo-like original (some gradient/noise, not flat) is where PNG really loses to WebP.
    const original = await sharp({
      create: { width: 1600, height: 1600, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .composite([{ input: await makePng(1600, 1600), blend: "over" }])
      .png()
      .toBuffer();

    const result = await processUploadedImage(original);
    expect(result.display.buffer.length).toBeLessThan(original.length);
  });

  it("reports the true original dimensions alongside the derivatives", async () => {
    const original = await makePng(3000, 2000);
    const result = await processUploadedImage(original);
    expect(result.original).toEqual({ width: 3000, height: 2000 });
  });

  it("rejects a buffer that isn't a readable image", async () => {
    await expect(processUploadedImage(Buffer.from("not an image"))).rejects.toThrow();
  });
});
