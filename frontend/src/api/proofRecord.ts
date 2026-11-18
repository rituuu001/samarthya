
import { apiRequest } from "./client";

export type ProofRecordResponse = {
  id: string;
  title: string;
  description: string | null;
  skills_demonstrated: string[] | null;
  verified_at: string | null;
  sprint_id: string;
  submission_id: string;
  created_at: string | null;
  is_shared: boolean;
};

export function getMyProofRecords() {
  return apiRequest<ProofRecordResponse[]>("/proof-records/me");
}

export function updateProofRecordSharing(proofRecordId: string, isShared: boolean) {
  return apiRequest<ProofRecordResponse>(`/proof-records/${proofRecordId}/sharing`, {
    method: "PATCH",
    body: JSON.stringify({ is_shared: isShared }),
  });
}
