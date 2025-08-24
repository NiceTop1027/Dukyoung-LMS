"use client"

import { useState } from "react"
import { ChatList } from "./chat-list"
import { ChatRoom } from "./chat-room"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { MessageCircle } from "lucide-react"

export function ChatPage() {
  const { user } = useAuth()
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">로그인이 필요합니다.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto h-screen p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          {/* 채팅 목록 */}
          <div className={`${selectedChatId ? "hidden lg:block" : ""}`}>
            <ChatList onSelectChat={setSelectedChatId} selectedChatId={selectedChatId} />
          </div>

          {/* 채팅방 */}
          <div className={`lg:col-span-2 ${!selectedChatId ? "hidden lg:flex lg:items-center lg:justify-center" : ""}`}>
            {selectedChatId ? (
              <Card className="w-full h-full">
                <ChatRoom chatId={selectedChatId} onClose={() => setSelectedChatId(null)} />
              </Card>
            ) : (
              <Card className="w-full h-full">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">채팅을 선택하세요</h3>
                    <p className="text-gray-500">왼쪽에서 채팅방을 선택하거나 새 채팅을 시작하세요.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
