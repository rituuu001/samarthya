import { useCallback, useEffect, useState } from "react"
import {
  acceptConnectionRequest,
  getMyConnectionRequests,
  rejectConnectionRequest,
  type ConnectionRequestResponse,
} from "@/api/connectionRequest"
import type { ApplicationResponse } from "@/api/application"
import type { MarketplaceSprintResponse } from "@/api/sprint"
import { Badge } from "@/components/portal/Badge"
import { PortalCard } from "@/components/portal/PortalCard"
import { OutlineButton, PinkButton } from "@/components/ui/Button"

type ConnectionRequestsProps = {
  backendApplications?: ApplicationResponse[]
  publishedSprints?: MarketplaceSprintResponse[]
}

function formatDate(value: string | null) {
  if (!value) return "—"

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function ConnectionRequests({
  backendApplications = [],
  publishedSprints = [],
}: ConnectionRequestsProps) {
  const [requests, setRequests] = useState<ConnectionRequestResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [actingRequestId, setActingRequestId] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMyConnectionRequests()
      setRequests(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load connection requests.",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  const handleAccept = async (requestId: string) => {
    setActingRequestId(requestId)
    setActionError(null)
    setSuccessMessage(null)

    try {
      const updated = await acceptConnectionRequest(requestId)
      setRequests((current) =>
        current.map((req) => (req.id === updated.id ? updated : req)),
      )
      setSuccessMessage(
        "Connection request accepted. Your identity has been shared with the employer.",
      )
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to accept connection request.",
      )
    } finally {
      setActingRequestId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setActingRequestId(requestId)
    setActionError(null)
    setSuccessMessage(null)

    try {
      const updated = await rejectConnectionRequest(requestId)
      setRequests((current) =>
        current.map((req) => (req.id === updated.id ? updated : req)),
      )
      setSuccessMessage(
        "Connection request declined. Your identity remains private.",
      )
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to decline connection request.",
      )
    } finally {
      setActingRequestId(null)
    }
  }

  return (
    <div style={{ marginBottom: "32px" }}>
      <div className="card-heading-row" style={{ marginBottom: "16px" }}>
        <div>
          <div className="card-title">Connection Requests</div>
          <div className="card-subtitle">
            Employers who reviewed your scored assessments and requested to
            connect.
          </div>
        </div>
        {!loading && (
          <Badge
            tone={
              requests.some((r) => r.status === "PENDING") ? "amber" : "gray"
            }
          >
            {requests.filter((r) => r.status === "PENDING").length} pending
          </Badge>
        )}
      </div>

      {loading && (
        <PortalCard>
          <p>Loading connection requests...</p>
        </PortalCard>
      )}

      {!loading && error && (
        <PortalCard>
          <p>{error}</p>
          <div style={{ marginTop: "12px" }}>
            <PinkButton small onClick={() => void loadRequests()}>
              Try Again
            </PinkButton>
          </div>
        </PortalCard>
      )}

      {!loading && !error && (
        <>
          {successMessage && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              {successMessage}
            </div>
          )}

          {actionError && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            >
              {actionError}
            </div>
          )}

          {requests.length === 0 ? (
            <PortalCard>
              <div className="empty-state compact">
                No connection requests received yet. Complete Proof Sprint
                assessments to receive connection invitations from employers.
              </div>
            </PortalCard>
          ) : (
            <div style={{ display: "grid", gap: "16px" }}>
              {requests.map((request) => {
                const application = backendApplications.find(
                  (app) => app.id === request.application_id,
                )
                const sprint = application
                  ? publishedSprints.find((s) => s.id === application.sprint_id)
                  : undefined

                const isActing = actingRequestId === request.id
                const isPending = request.status === "PENDING"
                const isAccepted = request.status === "ACCEPTED"
                const isRejected = request.status === "REJECTED"

                const badgeTone = isAccepted
                  ? "green"
                  : isPending
                    ? "amber"
                    : "gray"

                const statusLabel = isAccepted
                  ? "Accepted"
                  : isPending
                    ? "Pending Your Response"
                    : "Declined"

                return (
                  <PortalCard key={request.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "16px",
                            fontWeight: 600,
                            color: "#1a1a1a",
                            marginBottom: "4px",
                          }}
                        >
                          {sprint?.title ?? "Sprint Connection Request"}
                        </div>
                        <div style={{ fontSize: "13px", color: "#666" }}>
                          {sprint?.organization_name
                            ? `Employer: ${sprint.organization_name}`
                            : "Employer requested to connect based on your assessment results"}
                        </div>
                      </div>

                      <Badge tone={badgeTone}>{statusLabel}</Badge>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(160px, 1fr))",
                        gap: "12px",
                        marginTop: "16px",
                        paddingTop: "12px",
                        borderTop: "1px solid #f0eeed",
                      }}
                    >
                      <div>
                        <div className="portal-eyebrow">REQUESTED</div>
                        <div style={{ fontSize: "13px" }}>
                          {formatDate(request.created_at)}
                        </div>
                      </div>

                      {request.responded_at && (
                        <div>
                          <div className="portal-eyebrow">RESPONDED</div>
                          <div style={{ fontSize: "13px" }}>
                            {formatDate(request.responded_at)}
                          </div>
                        </div>
                      )}
                    </div>

                    {isPending && (
                      <div
                        style={{
                          marginTop: "16px",
                          padding: "12px 16px",
                          background: "#fdf0f5",
                          borderRadius: "8px",
                          border: "1px solid #f0c4d4",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#4a4a4a",
                            marginBottom: "12px",
                          }}
                        >
                          Accepting this request will share your full name and
                          email with the employer. If you decline, your identity
                          will remain completely anonymous.
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap",
                          }}
                        >
                          <PinkButton
                            small
                            disabled={isActing}
                            onClick={() => void handleAccept(request.id)}
                          >
                            {isActing ? "Accepting..." : "Accept Connection"}
                          </PinkButton>
                          <OutlineButton
                            small
                            disabled={isActing}
                            onClick={() => void handleReject(request.id)}
                          >
                            {isActing ? "Declining..." : "Decline"}
                          </OutlineButton>
                        </div>
                      </div>
                    )}

                    {isAccepted && (
                      <div
                        style={{
                          marginTop: "12px",
                          fontSize: "13px",
                          color: "#166534",
                        }}
                      >
                        ✓ You accepted this request. Your identity and contact
                        email are visible to the employer.
                      </div>
                    )}

                    {isRejected && (
                      <div
                        style={{
                          marginTop: "12px",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        You declined this request. Your identity remains private
                        and protected.
                      </div>
                    )}
                  </PortalCard>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
