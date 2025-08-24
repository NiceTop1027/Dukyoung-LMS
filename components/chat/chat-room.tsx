"use client"

import type React from "react"
import { getDocs } from "firebase/firestore"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  where,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Send,
  MoreVertical,
  Settings,
  LogOut,
  AlertTriangle,
  Shield,
  Sparkles,
  Crown,
  GraduationCap,
  BookOpen,
  ArrowLeft,
  Star,
  Download,
  MessageCircle,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: any
  type: "text" | "image" | "file"
}

interface ChatRoomData {
  id: string
  participants: string[]
  participantNames: { [key: string]: string }
  lastMessage: string
  lastMessageTime: any
  unreadCount: number
  createdBy: string
  isAdminChat?: boolean
  createdAt?: any
}

interface ChatRoomProps {
  chatId: string
  onClose?: () => void
  onExit?: () => void
}

export function ChatRoom({ chatId, onClose, onExit }: ChatRoomProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [chatRoom, setChatRoom] = useState<ChatRoomData | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [participantProfiles, setParticipantProfiles] = useState<{ [key: string]: any }>({})
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 사용자 프로필을 Firebase에서 직접 가져오는 함수
  const fetchUserProfile = async (userId: string): Promise<any> => {
    try {
      console.log(`프로필 로딩 시도: ${userId}`)

      // users 컬렉션에서 직접 가져오기
      const userDoc = await getDoc(doc(db, "users", userId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        console.log(`프로필 로딩 성공: ${userId}`, userData)
        return {
          uid: userId,
          id: userId,
          ...userData,
          name: userData.name || userData.displayName || userData.email?.split("@")[0] || "사용자",
        }
      }

      // users 컬렉션에서 찾지 못한 경우 쿼리로 검색
      const userQuery = query(collection(db, "users"), where("uid", "==", userId))
      const userSnapshot = await getDocs(userQuery)

      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data()
        console.log(`쿼리로 프로필 로딩 성공: ${userId}`, userData)
        return {
          uid: userId,
          id: userSnapshot.docs[0].id,
          ...userData,
          name: userData.name || userData.displayName || userData.email?.split("@")[0] || "사용자",
        }
      }

      console.log(`프로필을 찾을 수 없음: ${userId}`)
      return null
    } catch (error) {
      console.error(`프로필 로딩 실패: ${userId}`, error)
      return null
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Helper functions
  const getDisplayName = (profile: any, fallbackName?: string) => {
    if (!profile) {
      return fallbackName || "사용자"
    }

    const name = profile.name || profile.displayName || profile.email?.split("@")[0] || fallbackName || "사용자"
    const role = profile.role

    if (role === "admin") {
      return `${name} 관리자`
    } else if (role === "teacher") {
      const subject = profile.teacherSubject ? ` (${profile.teacherSubject})` : ""
      return `${name} 선생님${subject}`
    } else if (role === "student") {
      const gradeClass = profile.grade && profile.class ? ` (${profile.grade}학년 ${profile.class}반)` : ""
      return `${name} 학생${gradeClass}`
    }
    return name
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-5 w-5" />
      case "teacher":
        return <GraduationCap className="h-5 w-5" />
      case "student":
        return <BookOpen className="h-5 w-5" />
      default:
        return <div className="h-5 w-5 rounded-full bg-gray-400"></div>
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "from-yellow-400 to-orange-500"
      case "teacher":
        return "from-blue-400 to-indigo-500"
      case "student":
        return "from-green-400 to-emerald-500"
      default:
        return "from-gray-400 to-gray-500"
    }
  }

  const getProfileImageUrl = (profile: any) => {
    return profile?.profileImageUrl || profile?.profileImage || "/placeholder.svg"
  }

  useEffect(() => {
    if (!chatId || !user?.uid) {
      setLoading(false)
      return
    }

    // 채팅방 정보 가져오기
    const fetchChatRoom = async () => {
      try {
        const chatDoc = await getDoc(doc(db, "chatRooms", chatId))
        if (chatDoc.exists()) {
          const data = chatDoc.data()

          // 사용자가 이 채팅방의 참가자인지 확인
          if (!data.participants.includes(user.uid)) {
            setError("이 채팅방에 접근할 권한이 없습니다.")
            setLoading(false)
            return
          }

          setChatRoom({ id: chatDoc.id, ...data } as ChatRoomData)

          // 참가자 프로필 정보 로드 개선
          console.log("참가자 프로필 로딩 시작", data.participants)
          const profiles: { [key: string]: any } = {}
          const loadPromises = data.participants.map(async (participantId: string) => {
            try {
              const profile = await fetchUserProfile(participantId)
              if (profile) {
                profiles[participantId] = profile
              } else {
                // 프로필이 없는 경우 기본값 설정
                const fallbackName = data.participantNames[participantId] || "사용자"
                profiles[participantId] = {
                  uid: participantId,
                  id: participantId,
                  name: fallbackName,
                  role: participantId === user.uid ? user.role : "student",
                  email: "",
                }
                console.log(`기본값 프로필 설정: ${participantId}`, profiles[participantId])
              }
            } catch (error) {
              console.error(`참가자 프로필 로드 실패 (${participantId}):`, error)
              // 에러 시에도 기본값 설정
              const fallbackName = data.participantNames[participantId] || "사용자"
              profiles[participantId] = {
                uid: participantId,
                id: participantId,
                name: fallbackName,
                role: participantId === user.uid ? user.role : "student",
                email: "",
              }
            }
          })

          await Promise.all(loadPromises)
          console.log("모든 참가자 프로필 로딩 완료", profiles)
          setParticipantProfiles(profiles)
        } else {
          setError("채팅방을 찾을 수 없습니다.")
          setLoading(false)
          return
        }
      } catch (error: any) {
        console.error("채팅방 정보 가져오기 실패:", error)
        setError("채팅방 정보를 불러올 수 없습니다.")
        setLoading(false)
        return
      }
    }

    fetchChatRoom()

    // 메시지 실시간 구독
    const messagesQuery = query(collection(db, "chatRooms", chatId, "messages"), orderBy("timestamp", "asc"))

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        try {
          const messageList: Message[] = []
          snapshot.forEach((doc) => {
            messageList.push({ id: doc.id, ...doc.data() } as Message)
          })
          setMessages(messageList)
          setLoading(false)
        } catch (error) {
          console.error("메시지 데이터 처리 오류:", error)
          setLoading(false)
        }
      },
      (error) => {
        console.error("메시지 구독 실패:", error)
        setError("메시지를 불러올 수 없습니다.")
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [chatId, user])

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !chatRoom) return

    setIsTyping(true)
    try {
      // 현재 사용자 프로필 가져오기
      const currentUserProfile = await fetchUserProfile(user.uid)

      const senderName = currentUserProfile?.name || user.displayName || user.email?.split("@")[0] || "사용자"

      const messageData = {
        senderId: user.uid,
        senderName,
        content: newMessage.trim(),
        timestamp: serverTimestamp(),
        type: "text",
      }

      // 메시지 추가
      await addDoc(collection(db, "chatRooms", chatId, "messages"), messageData)

      // 채팅방 정보 업데이트
      await updateDoc(doc(db, "chatRooms", chatId), {
        lastMessage: newMessage.trim(),
        lastMessageTime: serverTimestamp(),
      })

      setNewMessage("")
    } catch (error: any) {
      console.error("메시지 전송 실패:", error)
      setError("메시지 전송에 실패했습니다.")
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleLeaveChatRoom = async () => {
    if (!user || !chatRoom) return

    // 권한 확인
    if (user.role !== "teacher" && user.role !== "admin") {
      setError("채팅방을 삭제할 권한이 없습니다.")
      setShowLeaveDialog(false)
      return
    }

    try {
      console.log(`채팅방 삭제 시작: ${chatId}`)

      // 먼저 메시지들 삭제
      const messagesQuery = query(collection(db, "chatRooms", chatId, "messages"))
      const messagesSnapshot = await getDocs(messagesQuery)

      if (!messagesSnapshot.empty) {
        console.log(`${messagesSnapshot.docs.length}개 메시지 삭제 중...`)
        const deletePromises = messagesSnapshot.docs.map((doc) => deleteDoc(doc.ref))
        await Promise.all(deletePromises)
        console.log("모든 메시지 삭제 완료")
      }

      // 채팅방 삭제
      await deleteDoc(doc(db, "chatRooms", chatId))
      console.log("채팅방 삭제 완료")

      setShowLeaveDialog(false)
      if (onExit) onExit()
    } catch (error: any) {
      console.error("채팅방 삭제 실패:", error)
      setError("채팅방을 삭제하는데 실패했습니다. 다시 시도해주세요.")
      setShowLeaveDialog(false)
    }
  }

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return ""
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-600 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-2">채팅을 불러오는 중...</h3>
          <p className="text-sm text-gray-500">잠시만 기다려주세요</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-red-600 mb-4">오류가 발생했습니다</h3>
          <p className="text-red-600 mb-6 font-medium">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-xl"
          >
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  if (!chatRoom) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">채팅방을 찾을 수 없습니다.</p>
        </div>
      </div>
    )
  }

  const otherParticipant = chatRoom.participants.find((p) => p !== user?.uid)
  const otherParticipantProfile = participantProfiles[otherParticipant || ""]
  const otherParticipantDisplayName = getDisplayName(
    otherParticipantProfile,
    chatRoom.participantNames[otherParticipant || ""],
  )
  const isAdminChat = otherParticipantProfile?.role === "admin"
  const isTeacherChat = otherParticipantProfile?.role === "teacher"

  console.log("채팅방 렌더링:", {
    otherParticipant,
    otherParticipantProfile,
    otherParticipantDisplayName,
    isAdminChat,
    isTeacherChat,
  })

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* 채팅방 헤더 */}
      <div className="flex-shrink-0 border-b border-blue-200/50 p-6 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-blue-100 rounded-full p-2">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Button>
            )}
            <div className="relative">
              <Avatar
                className={`h-14 w-14 border-3 shadow-lg ${isAdminChat ? "border-orange-300" : isTeacherChat ? "border-blue-300" : "border-green-300"}`}
              >
                <AvatarImage
                  src={getProfileImageUrl(otherParticipantProfile) || "/placeholder.svg"}
                  alt={otherParticipantDisplayName}
                />
                <AvatarFallback
                  className={`text-lg font-bold ${
                    isAdminChat
                      ? "bg-gradient-to-br from-orange-400 to-red-500 text-white"
                      : `bg-gradient-to-br ${getRoleColor(otherParticipantProfile?.role || "student")} text-white`
                  }`}
                >
                  {getRoleIcon(otherParticipantProfile?.role || "student")}
                </AvatarFallback>
              </Avatar>
              {/* 관리자 배지 */}
              {isAdminChat && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <Shield className="h-3 w-3 text-white" />
                </div>
              )}
              {/* 선생님 배지 */}
              {isTeacherChat && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                  <Star className="h-3 w-3 text-white" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full animate-pulse"></div>
            </div>
            <div>
              <h2 className="font-bold text-xl text-gray-800">{otherParticipantDisplayName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-sm text-green-600 font-medium">온라인</p>
                {isAdminChat && (
                  <div className="flex items-center gap-1 ml-2">
                    <Shield className="h-3 w-3 text-orange-500" />
                    <span className="text-xs text-orange-600 font-medium">관리자</span>
                  </div>
                )}
                {isTeacherChat && (
                  <div className="flex items-center gap-1 ml-2">
                    <Star className="h-3 w-3 text-blue-500" />
                    <span className="text-xs text-blue-600 font-medium">선생님</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hover:bg-blue-100 rounded-full p-3">
                <MoreVertical className="h-5 w-5 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-blue-200 rounded-xl w-48">
              <DropdownMenuItem onClick={() => setShowSettingsDialog(true)} className="hover:bg-blue-50 rounded-lg">
                <Settings className="h-4 w-4 mr-3 text-blue-600" />
                <span className="font-medium">채팅 설정</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowLeaveDialog(true)}
                className={`hover:bg-red-50 rounded-lg ${
                  user?.role === "teacher" || user?.role === "admin"
                    ? "text-red-600"
                    : "text-gray-400 cursor-not-allowed"
                }`}
                disabled={user?.role === "student"}
              >
                <LogOut className="h-4 w-4 mr-3" />
                <span className="font-medium">
                  {user?.role === "teacher" || user?.role === "admin" ? "채팅방 삭제" : "삭제 권한 없음"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Send className="h-12 w-12 text-blue-400" />
            </div>
            <h3 className="font-bold text-xl mb-3 text-gray-600">아직 메시지가 없습니다</h3>
            <p className="text-base text-gray-500 mb-4">첫 메시지를 보내서 대화를 시작해보세요!</p>
            <div className="flex justify-center gap-1">
              <span className="text-2xl animate-bounce">👋</span>
              <span className="text-2xl animate-bounce" style={{ animationDelay: "0.1s" }}>
                💬
              </span>
              <span className="text-2xl animate-bounce" style={{ animationDelay: "0.2s" }}>
                ✨
              </span>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMyMessage = message.senderId === user?.uid
            const messageProfile = participantProfiles[message.senderId]
            const senderDisplayName = getDisplayName(messageProfile, message.senderName)
            const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId

            return (
              <div key={message.id} className={`flex gap-4 ${isMyMessage ? "justify-end" : "justify-start"}`}>
                {!isMyMessage && (
                  <div className="flex-shrink-0">
                    {showAvatar ? (
                      <Avatar className="h-10 w-10 border-2 border-blue-200 shadow-md">
                        <AvatarImage
                          src={getProfileImageUrl(messageProfile) || "/placeholder.svg"}
                          alt={senderDisplayName}
                        />
                        <AvatarFallback
                          className={`font-bold bg-gradient-to-br ${getRoleColor(messageProfile?.role || "student")} text-white`}
                        >
                          {getRoleIcon(messageProfile?.role || "student")}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-10 h-10"></div>
                    )}
                  </div>
                )}
                <div className={`max-w-xs lg:max-w-md ${isMyMessage ? "order-1" : ""}`}>
                  {!isMyMessage && showAvatar && (
                    <p className="text-xs text-gray-500 mb-2 font-medium ml-1">{senderDisplayName}</p>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 shadow-lg transition-all duration-200 hover:shadow-xl ${
                      isMyMessage
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                        : "bg-white text-gray-800 border border-gray-200"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                  <p className={`text-xs mt-2 ${isMyMessage ? "text-right text-blue-300" : "text-gray-400"} ml-1`}>
                    {formatMessageTime(message.timestamp)}
                  </p>
                </div>
                {isMyMessage && (
                  <div className="flex-shrink-0">
                    {showAvatar ? (
                      <Avatar className="h-10 w-10 border-2 border-blue-300 shadow-md">
                        <AvatarImage
                          src={getProfileImageUrl(participantProfiles[user.uid]) || "/placeholder.svg"}
                          alt={getDisplayName(participantProfiles[user.uid])}
                        />
                        <AvatarFallback
                          className={`font-bold bg-gradient-to-br ${getRoleColor(participantProfiles[user.uid]?.role || user.role)} text-white`}
                        >
                          {getRoleIcon(participantProfiles[user.uid]?.role || user.role)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-10 h-10"></div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 타이핑 인디케이터 */}
      {isTyping && (
        <div className="px-6 py-2">
          <div className="flex items-center gap-2 text-blue-600">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            </div>
            <span className="text-sm font-medium">메시지를 보내는 중...</span>
          </div>
        </div>
      )}

      {/* 메시지 입력 영역 */}
      <div className="border-t border-blue-200/50 p-6 bg-white/80 backdrop-blur-xl">
        <div className="flex gap-3">
          <Input
            placeholder="메시지를 입력하세요... ✨"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 border-2 border-blue-200 focus:border-blue-400 rounded-xl px-4 py-3 bg-white/90 backdrop-blur-sm text-base"
            disabled={isTyping}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isTyping}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTyping ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* 채팅 설정 다이얼로그 */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="bg-gradient-to-br from-white to-blue-50 border-blue-200 rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-blue-600">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="h-5 w-5" />
              </div>
              채팅 설정
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {otherParticipantDisplayName}와의 채팅 설정을 관리하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 채팅 정보 */}
            <div className="p-4 border-2 border-blue-200 rounded-xl bg-white">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-blue-600" />
                채팅 정보
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">참가자:</span>
                  <span className="font-medium">{chatRoom.participants.length}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">메시지 수:</span>
                  <span className="font-medium">{messages.length}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">생성일:</span>
                  <span className="font-medium">
                    {chatRoom.createdAt ? new Date(chatRoom.createdAt.toDate()).toLocaleDateString() : "알 수 없음"}
                  </span>
                </div>
              </div>
            </div>

            {/* 알림 설정 */}
            <div className="p-4 border-2 border-green-200 rounded-xl bg-green-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Sparkles className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">알림 설정</p>
                    <p className="text-sm text-gray-500">새 메시지 알림 받기</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-2 border-green-300 bg-white hover:bg-green-100 rounded-lg"
                >
                  ON
                </Button>
              </div>
            </div>

            {/* 관리 기능 (관리자/선생님만) */}
            {(user?.role === "teacher" || user?.role === "admin") && (
              <div className="p-4 border-2 border-orange-200 rounded-xl bg-orange-50">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-orange-600" />
                  관리 기능
                </h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-2 border-orange-300 bg-white hover:bg-orange-100 rounded-lg"
                    onClick={() => {
                      // 채팅 기록 내보내기 기능
                      const chatData = {
                        participants: chatRoom.participantNames,
                        messages: messages.map((msg) => ({
                          sender: msg.senderName,
                          content: msg.content,
                          time: msg.timestamp?.toDate?.()?.toLocaleString() || "알 수 없음",
                        })),
                      }
                      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: "application/json" })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = `chat-${chatId}-${new Date().toISOString().split("T")[0]}.json`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    채팅 기록 내보내기
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-lg"
                    onClick={() => {
                      setShowSettingsDialog(false)
                      setShowLeaveDialog(true)
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    채팅방 삭제
                  </Button>
                </div>
              </div>
            )}

            {/* 도움말 */}
            <div className="p-4 border-2 border-purple-200 rounded-xl bg-purple-50">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Star className="h-4 w-4 text-purple-600" />
                채팅 팁
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Enter로 메시지 전송</li>
                <li>• Shift + Enter로 줄바꿈</li>
                <li>• 상대방이 온라인 상태입니다</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => setShowSettingsDialog(false)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl"
            >
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 채팅 나가기 확인 다이얼로그 */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="bg-gradient-to-br from-white to-red-50 border-red-200 rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5" />
              </div>
              {user?.role === "teacher" || user?.role === "admin" ? "채팅방 삭제" : "접근 권한 없음"}
            </DialogTitle>
          </DialogHeader>

          {user?.role === "teacher" || user?.role === "admin" ? (
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50 rounded-xl">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>경고:</strong> 이 작업은 되돌릴 수 없습니다!
                </AlertDescription>
              </Alert>

              <div className="p-4 border-2 border-red-200 rounded-xl bg-white">
                <h3 className="font-semibold text-gray-800 mb-2">삭제될 내용:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 채팅방 정보</li>
                  <li>• 모든 메시지 ({messages.length}개)</li>
                  <li>• 참가자 기록</li>
                  <li>• 채팅 기록</li>
                </ul>
              </div>

              <DialogDescription className="text-gray-600 text-center">
                <strong>{otherParticipantDisplayName}</strong>와의 채팅방을 완전히 삭제하시겠습니까?
              </DialogDescription>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowLeaveDialog(false)} className="border-2 rounded-xl">
                  취소
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleLeaveChatRoom}
                  className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-xl"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  완전 삭제
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert className="border-orange-200 bg-orange-50 rounded-xl">
                <Shield className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  학생은 채팅방을 삭제할 수 없습니다. 선생님이나 관리자에게 문의하세요.
                </AlertDescription>
              </Alert>

              <div className="p-4 border-2 border-blue-200 rounded-xl bg-blue-50">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-blue-600" />
                  대안 방법:
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 선생님에게 직접 요청</li>
                  <li>• 관리자에게 문의</li>
                  <li>• 채팅을 그냥 두기</li>
                </ul>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={() => setShowLeaveDialog(false)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl"
                >
                  확인
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
