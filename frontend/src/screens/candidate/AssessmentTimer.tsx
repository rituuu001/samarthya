import { useEffect, useRef, useState } from "react"

type AssessmentTimerProps = {
  expiresAt: string

  onExpire: () => void
}

export function AssessmentTimer({ expiresAt, onExpire }: AssessmentTimerProps) {
  const [now, setNow] = useState(() => Date.now())

  const expiryMs = Date.parse(expiresAt)

  const isValidExpiry = Number.isFinite(expiryMs)

  const isExpired = !isValidExpiry || now >= expiryMs

  const notified = useRef(false)

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    notified.current = false
  }, [expiresAt])

  useEffect(() => {
    if (isExpired && !notified.current) {
      notified.current = true

      onExpire()
    }
  }, [isExpired, onExpire])

  const remainingSeconds = isValidExpiry
    ? Math.max(0, Math.ceil((expiryMs - now) / 1000))
    : 0

  const minutes = Math.floor(remainingSeconds / 60)

  const seconds = remainingSeconds % 60

  const display = isValidExpiry
    ? `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : "Unavailable"

  return (
    <div
      className={`assessment-timer${isExpired ? " is-expired" : ""}`}
      role="timer"
      aria-label={
        isValidExpiry
          ? `Time remaining ${display}`
          : "Assessment timer unavailable"
      }
      aria-live="off"
    >
      {isExpired && isValidExpiry ? "Time expired" : display}
    </div>
  )
}
