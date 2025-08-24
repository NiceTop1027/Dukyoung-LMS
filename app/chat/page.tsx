"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ChatPage } from "@/components/chat/chat-page"
import { ChatRoom } from "@/components/chat/chat-room"
import { useAuth } from "@/contexts/auth-context"
import { RoleGuard } from "@/components/auth/role-guard"
import { Card, CardContent } from "@/components/ui/card"

export default function Chat() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const roomId = searchParams.get("room")
  const [selectedChatId, setSelectedChatId] = useState<string | null>(roomId)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (roomId) {
      setSelectedChatId(roomId)
    }
    setLoading(false)
  }, [roomId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>로딩 중...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["teacher", "student"]}>
      <div className="min-h-screen bg-gray-50">
        {roomId && selectedChatId ? (
          <div className="container mx-auto h-screen p-4">
            <Card className="h-full">
              <ChatRoom chatId={selectedChatId} />
            </Card>
          </div>
        ) : (
          <ChatPage />
        )}
      </div>
    </RoleGuard>
  )
}
