export function resizeToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(blobUrl);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas conversion failed"))),
        "image/jpeg",
        0.8
      );
    };
    img.onerror = reject;
    img.src = blobUrl;
  });
}

export async function uploadPdf(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file, file.name);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const res = await fetch(`${apiUrl}/api/upload/pdf`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    body: form,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Upload failed");
  return json.data.url as string;
}

export async function uploadImage(blob: Blob, name: string): Promise<string> {
  const form = new FormData();
  form.append("file", blob, name);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const res = await fetch(`${apiUrl}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    body: form,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Upload failed");
  return json.data.url as string;
}
