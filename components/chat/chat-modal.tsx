"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { ChatList } from "./chat-list"
import { ChatRoom } from "./chat-room"
import { useAuth } from "@/contexts/auth-context"

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const { user } = useAuth()
  const [selectedChatRoom, setSelectedChatRoom] = useState<string | null>(null)

  const handleChatRoomSelect = (roomId: string) => {
    setSelectedChatRoom(roomId)
  }

  const handleBackToList = () => {
    setSelectedChatRoom(null)
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[700px] p-0 flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between p-6 border-b border-blue-200/50 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {selectedChatRoom && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="hover:bg-blue-100 transition-colors duration-200 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {selectedChatRoom ? "채팅" : "💬 1:1 채팅"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {selectedChatRoom ? (
            <ChatRoom chatId={selectedChatRoom} onClose={handleBackToList} onExit={onClose} />
          ) : (
            <ChatList onSelectChat={handleChatRoomSelect} selectedChatId={selectedChatRoom} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
