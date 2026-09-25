/**
 * Certification and banner images are stored as base64 data URIs. Signatures
 * link to them at a URL on this site instead of embedding that data, which is
 * what keeps a signature under setSignatureAsync's 30,000 character cap.
 */

export type HostedImageKind = "certification" | "banner";

/**
 * Types served back out. Anything else stays unserved — SVG in particular,
 * which can carry script and would run on this origin if opened directly.
 */
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export function parseDataUri(value: string | null): { type: string; bytes: Buffer } | null {
  const match = value?.match(/^data:([^;,]+);base64,([\s\S]+)$/);
  if (!match || !EXTENSIONS[match[1]]) return null;
  return { type: match[1], bytes: Buffer.from(match[2], "base64") };
}

/**
 * The public URL for a stored image, or null when there is nothing servable.
 * `v` changes whenever the image is edited, so a cached copy can be kept
 * forever without a replacement being hidden behind it.
 */
export function hostedImageUrl(
  baseUrl: string,
  kind: HostedImageKind,
  item: { id: string; image: string | null; updatedAt: Date }
): string | null {
  const type = item.image?.match(/^data:([^;,]+);base64,/)?.[1];
  if (!type || !EXTENSIONS[type]) return null;
  return `${baseUrl}/api/images/${kind}/${item.id}.${EXTENSIONS[type]}?v=${item.updatedAt.getTime()}`;
}
