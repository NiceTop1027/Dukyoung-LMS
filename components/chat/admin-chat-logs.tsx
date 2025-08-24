"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageCircle, Search, Download, Filter, Calendar, Clock } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ChatMessage {
  id: string
  roomId: string
  senderId: string
  senderName: string
  content: string
  timestamp: any
  type: "text" | "image" | "file"
}

interface ChatRoom {
  id: string
  participants: string[]
  participantNames: { [key: string]: string }
  lastMessage: string
  lastMessageTime: any
  createdBy: string
  createdAt: any
}

export function AdminChatLogs() {
  const { user, userProfile } = useAuth()
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([])
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRoom, setSelectedRoom] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsAdmin(!!user && userProfile?.role === "admin")
  }, [user, userProfile])

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-red-600">관리자만 접근할 수 있습니다.</p>
        </CardContent>
      </Card>
    )
  }

  useEffect(() => {
    // 모든 채팅방 가져오기
    const chatRoomsQuery = query(collection(db, "chatRooms"), orderBy("createdAt", "desc"))

    const unsubscribeRooms = onSnapshot(chatRoomsQuery, (snapshot) => {
      const rooms: ChatRoom[] = []
      snapshot.forEach((doc) => {
        rooms.push({ id: doc.id, ...doc.data() } as ChatRoom)
      })
      setChatRooms(rooms)
    })

    return () => unsubscribeRooms()
  }, [])

  useEffect(() => {
    if (chatRooms.length === 0) return

    // 모든 채팅방의 메시지 구독
    const unsubscribes: (() => void)[] = []
    const messagesMap = new Map<string, ChatMessage[]>()

    chatRooms.forEach((room) => {
      const messagesQuery = query(collection(db, "chatRooms", room.id, "messages"), orderBy("timestamp", "desc"))

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messages: ChatMessage[] = []
        snapshot.forEach((doc) => {
          messages.push({
            id: doc.id,
            roomId: room.id,
            ...doc.data(),
          } as ChatMessage)
        })

        messagesMap.set(room.id, messages)

        // 모든 메시지를 하나의 배열로 합치기
        const allMsgs: ChatMessage[] = []
        messagesMap.forEach((msgs) => {
          allMsgs.push(...msgs)
        })

        // 시간순으로 정렬
        allMsgs.sort((a, b) => {
          const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp)
          const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp)
          return timeB.getTime() - timeA.getTime()
        })

        setAllMessages(allMsgs)
        setLoading(false)
      })

      unsubscribes.push(unsubscribe)
    })

    return () => {
      unsubscribes.forEach((unsub) => unsub())
    }
  }, [chatRooms])

  // 메시지 필터링
  useEffect(() => {
    let filtered = allMessages

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(
        (msg) =>
          msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          msg.senderName.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // 채팅방 필터
    if (selectedRoom !== "all") {
      filtered = filtered.filter((msg) => msg.roomId === selectedRoom)
    }

    // 날짜 필터
    if (dateFilter !== "all") {
      const now = new Date()
      const filterDate = new Date()

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0)
          break
        case "week":
          filterDate.setDate(now.getDate() - 7)
          break
        case "month":
          filterDate.setMonth(now.getMonth() - 1)
          break
      }

      filtered = filtered.filter((msg) => {
        const msgDate = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp)
        return msgDate >= filterDate
      })
    }

    setFilteredMessages(filtered)
  }, [allMessages, searchTerm, selectedRoom, dateFilter])

  // CSV 내보내기
  const exportToCSV = () => {
    const csvContent = [
      ["시간", "채팅방", "발신자", "메시지"],
      ...filteredMessages.map((msg) => {
        const room = chatRooms.find((r) => r.id === msg.roomId)
        const roomName = room ? Object.values(room.participantNames).join(" & ") : "알 수 없음"
        const timestamp = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp)

        return [timestamp.toLocaleString(), roomName, msg.senderName, msg.content]
      }),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `chat_logs_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatTime = (timestamp: any) => {
    if (!timestamp) return ""
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString("ko-KR")
  }

  const getRoomName = (roomId: string) => {
    const room = chatRooms.find((r) => r.id === roomId)
    return room ? Object.values(room.participantNames).join(" & ") : "알 수 없는 채팅방"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            채팅 로그 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            채팅 로그 관리
          </div>
          <Button onClick={exportToCSV} size="sm" className="bg-green-600 hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" />
            CSV 내보내기
          </Button>
        </CardTitle>

        {/* 필터 컨트롤 */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="메시지 또는 사용자 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 채팅방</SelectItem>
              {chatRooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {Object.values(room.participantNames).join(" & ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 기간</SelectItem>
              <SelectItem value="today">오늘</SelectItem>
              <SelectItem value="week">최근 7일</SelectItem>
              <SelectItem value="month">최근 30일</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="space-y-2 p-4">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>조건에 맞는 메시지가 없습니다.</p>
              </div>
            ) : (
              filteredMessages.map((message) => (
                <div key={`${message.roomId}-${message.id}`} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {message.senderName[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{message.senderName}</span>
                        <Badge variant="outline" className="text-xs">
                          {getRoomName(message.roomId)}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatTime(message.timestamp)}
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 break-words">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
