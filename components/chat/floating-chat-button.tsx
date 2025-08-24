"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageCircle } from "lucide-react"
import { ChatModal } from "./chat-modal"
import { useAuth } from "@/contexts/auth-context"

export function FloatingChatButton() {
  const { user } = useAuth()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [unreadCount] = useState(0) // TODO: 실제 읽지 않은 메시지 수 구현

  if (!user) return null

  return (
    <>
      {/* 플로팅 채팅 버튼 */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsChatOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* 채팅 모달 */}
      <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  )
}
