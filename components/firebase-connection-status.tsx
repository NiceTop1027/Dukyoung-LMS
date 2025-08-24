"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, WifiOff, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export function FirebaseConnectionStatus() {
  const { isConnected, connectionError, isRetrying, lastChecked, retryConnection } = useAuth()

  // 연결 상태 표시 조건을 더 엄격하게 설정
  // 실제 심각한 연결 문제가 있을 때만 표시
  if (isConnected || !connectionError) {
    return null
  }

  // 권한 관련 오류는 표시하지 않음
  if (connectionError.includes("permission") || connectionError.includes("권한")) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert variant="destructive">
        <div className="flex items-center space-x-2">
          <WifiOff className="h-4 w-4" />
          <AlertTriangle className="h-4 w-4" />
        </div>
        <AlertDescription className="mt-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">연결 문제</p>
            <p className="text-xs">{connectionError}</p>
            <p className="text-xs text-gray-500">마지막 확인: {lastChecked.toLocaleTimeString()}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={retryConnection}
              disabled={isRetrying}
              className="bg-white text-red-600 hover:bg-red-50"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  재연결 중...
                </>
              ) : (
                "다시 연결"
              )}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
