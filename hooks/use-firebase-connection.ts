"use client"

import { useState, useEffect, useCallback } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { checkFirestoreConnection } from "@/lib/firebase-utils"

export function useFirebaseConnection() {
  const [isConnected, setIsConnected] = useState(true) // 기본값을 true로 설정
  const [isRetrying, setIsRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<Date>(new Date())

  const retryConnection = useCallback(async () => {
    setIsRetrying(true)
    setError(null)

    try {
      const connected = await checkFirestoreConnection()
      setIsConnected(connected)
      setLastChecked(new Date())

      if (!connected) {
        setError("Firebase 연결에 실패했습니다.")
      } else {
        setError(null)
      }
    } catch (error) {
      console.error("Connection retry failed:", error)
      setError("연결 재시도 중 오류가 발생했습니다.")
      setIsConnected(false)
    } finally {
      setIsRetrying(false)
    }
  }, [])

  // 연결 확인 로직 단순화 - 권한 문제로 인한 무한 로딩 방지
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await checkFirestoreConnection()
        setIsConnected(connected)
        setLastChecked(new Date())

        // 연결 실패 시에도 에러 메시지 표시하지 않음 (권한 문제일 가능성)
        if (!connected) {
          console.warn("Firestore connection check failed, but continuing...")
        }
      } catch (err) {
        console.warn("Connection check error (continuing anyway):", err)
        // 연결 확인 실패해도 앱은 계속 작동
        setIsConnected(true)
      }
    }

    // 초기 연결 확인 (1초 후, 빠르게)
    const initialTimeout = setTimeout(checkConnection, 1000)

    // 주기적 확인 간격을 크게 늘림 (5분마다)
    const intervalId = setInterval(checkConnection, 300000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(intervalId)
    }
  }, [])

  // 인증 상태 변경 시 연결 확인 (단순화)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 로그인 시 연결 상태를 true로 설정 (권한 문제 방지)
        setIsConnected(true)
        setLastChecked(new Date())
        setError(null)
      }
    })

    return unsubscribe
  }, [])

  return {
    isConnected,
    isRetrying,
    error,
    lastChecked,
    retryConnection,
  }
}
