import { apiRequest } from "./client"

export type ConnectionRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED"

export type ConnectionRequestResponse = {
  id: string
  application_id: string
  status: ConnectionRequestStatus
  created_at: string
  updated_at: string
  responded_at: string | null
}

export type ContributorIdentityResponse = {
  user_id: string
  full_name: string
  email: string
  profile_picture_id: string | null
}

export type ConnectionRequestIdentityResponse = {
  connection_request: ConnectionRequestResponse
  contributor: ContributorIdentityResponse
}

export function createConnectionRequest(applicationId: string) {
  return apiRequest<ConnectionRequestResponse>(
    `/applications/${applicationId}/connection-request`,
    { method: "POST" },
  )
}

export async function getConnectionRequest(
  applicationId: string,
): Promise<ConnectionRequestResponse | null> {
  try {
    return await apiRequest<ConnectionRequestResponse>(
      `/applications/${applicationId}/connection-request`,
    )
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.toLowerCase().includes("not found") ||
        err.message.includes("404"))
    ) {
      return null
    }
    throw err
  }
}

export function getMyConnectionRequests() {
  return apiRequest<ConnectionRequestResponse[]>("/connection-requests")
}

export function acceptConnectionRequest(requestId: string) {
  return apiRequest<ConnectionRequestResponse>(
    `/connection-requests/${requestId}/accept`,
    { method: "POST" },
  )
}

export function rejectConnectionRequest(requestId: string) {
  return apiRequest<ConnectionRequestResponse>(
    `/connection-requests/${requestId}/reject`,
    { method: "POST" },
  )
}

export function getRevealedIdentity(applicationId: string) {
  return apiRequest<ConnectionRequestIdentityResponse>(
    `/applications/${applicationId}/connection-request/identity`,
  )
}
