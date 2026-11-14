
import { apiRequest } from "./client";

export type BackendRole = "CONTRIBUTOR" | "EMPLOYER";

export type UserResponse = {
  id: string;
  email: string;
  full_name: string;
  role: BackendRole | "ADMIN";
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type RegisterData = {
  email: string;
  password: string;
  full_name: string;
  role: BackendRole;
};

export type LoginData = {
  email: string;
  password: string;
};

export function registerUser(data: RegisterData) {
  return apiRequest<UserResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function loginUser(data: LoginData) {
  return apiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getCurrentUser() {
  return apiRequest<UserResponse>("/auth/me");
}
