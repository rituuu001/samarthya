
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
  position: string | null;
  organization_type: string | null;
  organization_size: string | null;
  phone_number: string | null;
};

export type UserProfileUpdate = {
  full_name?: string;
  bio?: string;
  location?: string;
  skills?: string[];
  education?: Record<string, unknown>[];
  organization_name?: string;
  website?: string | null;
  position?: string;
  organization_type?: string;
  organization_size?: string;
  phone_number?: string;
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
