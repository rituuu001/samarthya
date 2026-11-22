import { apiRequest } from "./client";

export type SprintExternalLink = {
  url: string;
  title?: string | null;
};

export type SprintAttachmentMetadata = {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
};

export type SprintCreateRequest = {
  title: string;
  description: string;
  skill_category: string[];
  difficulty: AssessmentDifficulty;
  assessment_category: AssessmentCategory;
  task_type: string;
  budget: number;
  currency: string;
  number_of_positions: number;
  revision_limit: number;
  deadline: string;
  application_deadline: string;
  attachment_file_ids?: string[];
  external_links?: SprintExternalLink[];
};

export type SprintResponse = {
  id: string;
  employer_id: string;
  title: string;
  description: string;
  skill_category: string[];
  difficulty: string;
  assessment_category: SprintAssessmentCategory;
  task_type: string;
  budget: number;
  currency: string;
  number_of_positions: number;
  revision_limit: number;
  deadline: string;
  application_deadline: string;
  attachment_file_ids: string[];
  external_links: SprintExternalLink[];
  attachments: SprintAttachmentMetadata[];
  status: string;
  created_at: string | null;
  updated_at: string | null;
};
export type MarketplaceSprintResponse = SprintResponse & {
  organization_name: string | null;
};
export type AssessmentCategory = "Python" | "Junior Accountant" | "Graphic Design";
export type SprintAssessmentCategory = AssessmentCategory | "Frontend";
export type AssessmentDifficulty = "Beginner" | "Intermediate";

export function createSprint(data: SprintCreateRequest) {
  return apiRequest<SprintResponse>("/sprints", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function publishSprint(sprintId: string, paymentAccountId?: string) {
  return apiRequest<SprintResponse>(`/sprints/${sprintId}/publish`, {
    method: "POST",
    body: JSON.stringify({
      payment_account_id: paymentAccountId ?? null,
    }),
  });
}

export function getPublishedSprints() {
  return apiRequest<MarketplaceSprintResponse[]>("/sprints");
}

export function getMySprints(): Promise<SprintResponse[]> {
  return apiRequest<SprintResponse[]>("/sprints/mine");
}