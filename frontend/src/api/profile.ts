
import { apiRequest } from "./client";

export type UserProfileResponse = {
  id: string;
  user_id: string;
  full_name: string;
  bio: string | null;
  location: string | null;
  skills: string[] | null;
  education: Record<string, unknown>[] | null;
  organization_name: string | null;
  website: string | null;
};

export type UserProfileUpdate = {
  full_name?: string;
  bio?: string;
  location?: string;
  skills?: string[];
  education?: Record<string, unknown>[];
  organization_name?: string;
  website?: string | null;
};

export function getMyProfile() {
  return apiRequest<UserProfileResponse>("/users/me");
}

export function updateMyProfile(data: UserProfileUpdate) {
  return apiRequest<UserProfileResponse>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
