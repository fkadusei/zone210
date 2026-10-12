/**
 * Saving a picture from a canvas.
 *  - canSharePhotos(): true on phones and tablets whose browser can hand an image to the share sheet
 *    (iPhone/iPad: choose "Save Image" to put it in Photos; Android: Photos / Gallery / Files).
 *    Never on a desktop or laptop: there the share sheet offers Messages and Mail, not a place to save, so those
 *    get the plain download. onTouchDevice() is that test, for anything else that shares a file.
 *  - toPhotos(canvas, name): opens the share sheet with the picture. Resolves "shared", "cancelled" or "unsupported".
 *  - download(canvas, name): the plain file download (desktop, and a fallback).
 */
const blobOf = (canvas) => new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));

/** A phone or tablet: the main way of pointing is a finger. (A laptop with a touch screen still counts as a desktop.) */
export function onTouchDevice() {
  try { return navigator.maxTouchPoints > 0 && matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches; } catch (err) { return false; }
}

export function canSharePhotos() {
  try {
    if (!onTouchDevice() || !navigator.share || !navigator.canShare) return false;
    const probe = new File([new Blob(["x"], { type: "image/png" })], "probe.png", { type: "image/png" });
    return navigator.canShare({ files: [probe] });
  } catch (err) {
    return false;
  }
}

export async function toPhotos(canvas, name) {
  const blob = await blobOf(canvas);
  if (!blob) return "unsupported";
  const file = new File([blob], name, { type: "image/png" });
  if (!(navigator.canShare && navigator.canShare({ files: [file] }))) return "unsupported";
  try {
    await navigator.share({ files: [file], title: "My picture from Zone 210" });
    return "shared";
  } catch (err) {
    return err && err.name === "AbortError" ? "cancelled" : "unsupported";
  }
}

export async function download(canvas, name) {
  const blob = await blobOf(canvas);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = name;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
