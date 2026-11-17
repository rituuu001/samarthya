import { apiRequest, getAccessToken } from "./client";

export type FileUploadResponse = {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  purpose: string;
  created_at: string;
};

export async function uploadSubmissionFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "SPRINT_SUBMISSION");

  return apiRequest<FileUploadResponse>("/files/upload", {
    method: "POST",
    body: formData,
  });
}

export async function downloadSubmissionFile(fileId: string): Promise<Blob> {
  const token = getAccessToken();

  const response = await fetch(`/api/files/${fileId}`, {
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : {},
  });

  if (!response.ok) {
    throw new Error("Unable to download submission file");
  }

  return response.blob();
}