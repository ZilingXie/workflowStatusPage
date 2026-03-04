"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AUTO_REFRESH_INTERVAL } from "@/lib/constants"

export function useAutoRefresh(onRefresh: () => void) {
  const [isActive, setIsActive] = useState(true)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL / 1000)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }, [])

  const resetCountdown = useCallback(() => {
    setCountdown(AUTO_REFRESH_INTERVAL / 1000)
  }, [])

  const manualRefresh = useCallback(() => {
    onRefresh()
    resetCountdown()
  }, [onRefresh, resetCountdown])

  const toggleActive = useCallback(() => {
    setIsActive((prev) => !prev)
  }, [])

  useEffect(() => {
    clearTimers()

    if (isActive) {
      resetCountdown()
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) return AUTO_REFRESH_INTERVAL / 1000
          return prev - 1
        })
      }, 1000)

      intervalRef.current = setInterval(() => {
        onRefresh()
        resetCountdown()
      }, AUTO_REFRESH_INTERVAL)
    }

    return clearTimers
  }, [isActive, onRefresh, clearTimers, resetCountdown])

  return { isActive, countdown, manualRefresh, toggleActive }
}
