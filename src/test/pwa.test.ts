import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = join(process.cwd(), "public");
const read = (name: string) => readFileSync(join(publicDir, name), "utf8");

function pngSize(name: string): { width: number; height: number } {
  const buf = readFileSync(join(publicDir, name));
  // PNG signature, then the IHDR chunk holds width and height at bytes 16-23.
  expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("PWA manifest", () => {
  const manifest = JSON.parse(read("manifest.webmanifest"));

  it("has the fields a browser needs to offer installation", () => {
    expect(manifest.name).toBe("PlantCare AI");
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("lists 192px, 512px and maskable icons that exist with the declared size", () => {
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);
    for (const icon of manifest.icons as { src: string; sizes: string }[]) {
      const file = icon.src.replace(/^\//, "");
      expect(existsSync(join(publicDir, file)), file).toBe(true);
      const { width, height } = pngSize(file);
      expect(`${width}x${height}`).toBe(icon.sizes);
    }
  });
});

describe("service worker", () => {
  const sw = read("sw.js");

  it("ships an offline page that the worker falls back to", () => {
    expect(statSync(join(publicDir, "offline.html")).size).toBeGreaterThan(0);
    expect(sw).toContain("/offline.html");
  });

  it("never intercepts non-GET requests or server functions (the photo analysis call)", () => {
    expect(sw).toContain('request.method !== "GET"');
    expect(sw).toContain('"/_serverFn"');
  });
});

describe("app shell wiring", () => {
  it("links the manifest and registers the service worker in the root route", () => {
    const root = readFileSync(join(process.cwd(), "src/routes/__root.tsx"), "utf8");
    expect(root).toContain('rel: "manifest"');
    expect(root).toContain('register("/sw.js")');
  });

  it("offers a camera input that opens the rear camera on phones", () => {
    const page = readFileSync(join(process.cwd(), "src/routes/index.tsx"), "utf8");
    expect(page).toContain('capture="environment"');
    expect(page).toContain("Take a photo");
  });
});
