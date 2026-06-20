#!/usr/bin/env node
/**
 * Export gallery PNGs matching live carousel framing (portrait 480×660 ratio).
 * Usage: node scripts/export-gallery-pngs.mjs
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const galleryDir = path.join(publicDir, "gallery");
const threeDir = path.join(root, "node_modules", "three");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".glb": "model/gltf-binary",
  ".splinecode": "application/octet-stream",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
};

function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);

  if (decoded === "/scripts/export-gallery.html") {
    return path.join(root, "scripts", "export-gallery.html");
  }

  if (decoded.startsWith("/vendor/three/")) {
    const rel = decoded.slice("/vendor/three/".length);
    return path.join(threeDir, rel);
  }

  if (decoded.startsWith("/")) {
    return path.join(publicDir, decoded.slice(1));
  }

  return null;
}

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const filePath = resolveFile(req.url ?? "/");
        if (!filePath || !existsSync(filePath)) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const body = await readFile(filePath);
        res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
        res.end(body);
      } catch (error) {
        res.writeHead(500);
        res.end(String(error));
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function main() {
  await mkdir(galleryDir, { recursive: true });

  const { server, port } = await startServer();
  const url = `http://127.0.0.1:${port}/scripts/export-gallery.html`;

  console.log(`Export server at ${url}`);

  const browser = await puppeteer.launch({
    headless: true,
    channel: "chrome",
    args: ["--use-gl=angle", "--enable-webgl", "--hide-scrollbars"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 480, height: 660, deviceScaleFactor: 3 });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 180000 });

    await page.evaluate(async () => {
      await window.prepareGalleryExport();
    });

    const specs = await page.evaluate(() => window.galleryExportSpecs);
    const host = await page.$("#host");

    if (!host) {
      throw new Error("Export host element not found");
    }

    console.log("Rendering specimens (this may take a few minutes)…");

    async function postProcessSplineScreenshot(screenshotBase64, options = {}) {
      return page.evaluate((payload) => {
        const {
          b64,
          threshold = 28,
          whiteCutoff = 196,
          denoiseMinNeighbors = 0,
        } = payload;

        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            const width = canvas.width;
            const height = canvas.height;

            for (let i = 0; i < pixels.length; i += 4) {
              const r = pixels[i];
              const g = pixels[i + 1];
              const b = pixels[i + 2];
              const isDark = r <= threshold && g <= threshold && b <= threshold;
              const isLine =
                !isDark &&
                r >= whiteCutoff &&
                g >= whiteCutoff &&
                b >= whiteCutoff;

              if (!isLine) {
                pixels[i] = 0;
                pixels[i + 1] = 0;
                pixels[i + 2] = 0;
                pixels[i + 3] = 0;
                continue;
              }

              pixels[i] = 255;
              pixels[i + 1] = 255;
              pixels[i + 2] = 255;
              pixels[i + 3] = 255;
            }

            const countOpaqueNeighbors = (source, x, y) => {
              let count = 0;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                  if (source[(ny * width + nx) * 4 + 3] >= 128) count++;
                }
              }
              return count;
            };

            if (denoiseMinNeighbors > 0) {
              for (let pass = 0; pass < 2; pass++) {
                const source = new Uint8ClampedArray(pixels);
                for (let y = 0; y < height; y++) {
                  for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;
                    if (source[i + 3] < 128) continue;
                    if (countOpaqueNeighbors(source, x, y) < denoiseMinNeighbors) {
                      pixels[i + 3] = 0;
                    }
                  }
                }
              }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL("image/png").split(",")[1]);
          };
          img.onerror = () => reject(new Error("Failed to decode export screenshot"));
          img.src = `data:image/png;base64,${b64}`;
        });
      }, {
        b64: screenshotBase64,
        threshold: options.exportThreshold ?? 28,
        whiteCutoff: options.exportWhiteCutoff ?? 196,
        denoiseMinNeighbors: options.exportDenoiseMinNeighbors ?? 0,
      });
    }

    for (const spec of specs) {
      await page.evaluate(async (entry) => {
        await window.captureGallerySpecimen(entry);
      }, spec);

      await new Promise((r) => setTimeout(r, 150));

      let pngBase64;
      if (spec.type === "glb") {
        pngBase64 = await page.evaluate(() => {
          const canvas = document.querySelector("#host canvas");
          if (!canvas) {
            throw new Error("No export canvas found");
          }
          return canvas.toDataURL("image/png").split(",")[1];
        });
      } else {
        const screenshot = await host.screenshot({ type: "png" });
        pngBase64 = await postProcessSplineScreenshot(
          screenshot.toString("base64"),
          spec,
        );
      }

      const outPath = path.join(galleryDir, `${spec.id}.png`);
      await writeFile(outPath, Buffer.from(pngBase64, "base64"));
      console.log(`Wrote ${outPath}`);
    }

    console.log(`\nDone — exported ${specs.length} PNGs to public/gallery/`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
