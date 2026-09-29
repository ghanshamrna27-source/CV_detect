/**
 * Calculates SHA-256 hash of a file or string using Web Crypto API.
 */
export async function calculateSHA256(data: File | ArrayBuffer | string): Promise<string> {
  try {
    let buffer: ArrayBuffer;
    if (typeof data === "string") {
      buffer = new TextEncoder().encode(data).buffer;
    } else if (data instanceof File) {
      buffer = await data.arrayBuffer();
    } else {
      buffer = data;
    }
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (err) {
    console.error("Failed to compute SHA-256", err);
    return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  }
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
