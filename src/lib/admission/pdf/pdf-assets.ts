import bwipjs from "bwip-js";

export async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0) return null;
    const mime = contentType.split(";")[0].trim();
    let base64: string;
    if (typeof Buffer !== "undefined") {
      base64 = Buffer.from(bytes).toString("base64");
    } else {
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      base64 = btoa(binary);
    }
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function generateBarcodeDataUrl(text: string): Promise<string | null> {
  return new Promise((resolve) => {
    bwipjs.toBuffer(
      {
        bcid: "code128",
        text,
        scale: 2,
        height: 10,
        includetext: true,
        textxalign: "center",
        textsize: 9,
      },
      (err, png) => {
        if (err || !png) {
          resolve(null);
          return;
        }
        resolve(`data:image/png;base64,${png.toString("base64")}`);
      }
    );
  });
}

export async function loadSchoolLogoDataUrl(logoUrl?: string | null): Promise<string | null> {
  if (!logoUrl) return null;
  return loadImageDataUrl(logoUrl);
}
