"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where, onSnapshot, addDoc, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Plus, Search, Shield, Sparkles, Crown, GraduationCap, BookOpen, Star } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ChatRoom {
  id: string
  participants: string[]
  participantNames: { [key: string]: string }
  lastMessage: string
  lastMessageTime: any
  unreadCount: number
  createdBy: string
  isAdminChat?: boolean
}

interface User {
  id: string
  name: string
  displayName?: string
  role: string
  email: string
  profileImage?: string
  profileImageUrl?: string
  uniqueId?: string
  grade?: string
  class?: string
  teacherSubject?: string
}

interface ChatListProps {
  onSelectChat: (chatId: string) => void
  selectedChatId?: string
}

export function ChatList({ onSelectChat, selectedChatId }: ChatListProps) {
  const { user } = useAuth()
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [admins, setAdmins] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [participantProfiles, setParticipantProfiles] = useState<{ [key: string]: any }>({})
  const [profilesLoading, setProfilesLoading] = useState(false)

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

  // Helper functions defined early to avoid initialization errors
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
        return <Crown className="h-4 w-4 text-yellow-500" />
      case "teacher":
        return <GraduationCap className="h-4 w-4 text-blue-500" />
      case "student":
        return <BookOpen className="h-4 w-4 text-green-500" />
      default:
        return <MessageCircle className="h-4 w-4 text-gray-500" />
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

  const formatTime = (timestamp: any) => {
    if (!timestamp) return ""
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "방금 전"
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return date.toLocaleDateString()
  }

  const getProfileImageUrl = (profile: any) => {
    return profile?.profileImageUrl || profile?.profileImage || "/placeholder.svg"
  }

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    // 채팅방 목록 실시간 구독
    const chatQuery = query(collection(db, "chatRooms"))

    const unsubscribe = onSnapshot(
      chatQuery,
      (snapshot) => {
        try {
          const rooms: ChatRoom[] = []
          snapshot.forEach((doc) => {
            const data = doc.data() as ChatRoom
            // 클라이언트 사이드에서 필터링
            if (data.participants && data.participants.includes(user.uid)) {
              rooms.push({ id: doc.id, ...data })
            }
          })

          // 최신 메시지 순으로 정렬
          rooms.sort((a, b) => {
            const aTime = a.lastMessageTime?.toDate?.() || new Date(a.lastMessageTime || 0)
            const bTime = b.lastMessageTime?.toDate?.() || new Date(b.lastMessageTime || 0)
            return bTime.getTime() - aTime.getTime()
          })

          setChatRooms(rooms)
          setLoading(false)
        } catch (error) {
          console.error("채팅방 데이터 처리 오류:", error)
          setLoading(false)
        }
      },
      (error) => {
        console.error("채팅방 구독 실패:", error)
        setChatRooms([])
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [user])

  // 참가자 프로필 로딩 개선
  useEffect(() => {
    const loadParticipantProfiles = async () => {
      if (chatRooms.length === 0 || !user) return

      console.log("참가자 프로필 로딩 시작", chatRooms.length, "개 채팅방")
      setProfilesLoading(true)
      const profiles: { [key: string]: any } = { ...participantProfiles }
      const loadPromises: Promise<void>[] = []

      for (const room of chatRooms) {
        for (const participantId of room.participants) {
          if (participantId !== user.uid && !profiles[participantId]) {
            loadPromises.push(
              fetchUserProfile(participantId)
                .then((profile) => {
                  if (profile) {
                    profiles[participantId] = profile
                  } else {
                    // 프로필이 없는 경우 기본값 설정
                    const fallbackName = room.participantNames[participantId] || "사용자"
                    profiles[participantId] = {
                      uid: participantId,
                      id: participantId,
                      name: fallbackName,
                      role: "student",
                      email: "",
                    }
                    console.log(`기본값 프로필 설정: ${participantId}`, profiles[participantId])
                  }
                })
                .catch((error) => {
                  console.error(`프로필 로드 실패 (${participantId}):`, error)
                  // 에러 시에도 기본값 설정
                  const fallbackName = room.participantNames[participantId] || "사용자"
                  profiles[participantId] = {
                    uid: participantId,
                    id: participantId,
                    name: fallbackName,
                    role: "student",
                    email: "",
                  }
                }),
            )
          }
        }
      }

      if (loadPromises.length > 0) {
        console.log(`${loadPromises.length}개 프로필 로딩 중...`)
        await Promise.all(loadPromises)
        console.log("모든 프로필 로딩 완료", profiles)
      }

      setParticipantProfiles(profiles)
      setProfilesLoading(false)
    }

    loadParticipantProfiles()
  }, [chatRooms, user])

  useEffect(() => {
    if (!user?.uid) return

    // 사용자 목록과 관리자 목록 가져오기
    const fetchUsersAndAdmins = async () => {
      try {
        // 교사인 경우 학생 목록 가져오기
        if (user.role === "teacher") {
          const usersQuery = query(collection(db, "users"), where("role", "==", "student"))
          const snapshot = await getDocs(usersQuery)
          const userList: User[] = []
          snapshot.forEach((doc) => {
            const userData = doc.data() as User
            userList.push({
              id: doc.id,
              ...userData,
              name: userData.name || userData.displayName || userData.email?.split("@")[0] || "학생",
            })
          })
          setUsers(userList.sort((a, b) => a.name.localeCompare(b.name)))
        }

        // 관리자 목록 가져오기
        const adminQuery = query(collection(db, "users"), where("role", "==", "admin"))
        const adminSnapshot = await getDocs(adminQuery)
        const adminList: User[] = []
        adminSnapshot.forEach((doc) => {
          const adminData = doc.data() as User
          adminList.push({
            id: doc.id,
            ...adminData,
            name: adminData.name || adminData.displayName || "관리자",
          })
        })
        setAdmins(adminList)
      } catch (error: any) {
        console.error("사용자 목록 로드 실패:", error)
        setUsers([])
        setAdmins([])
      }
    }

    fetchUsersAndAdmins()
  }, [user])

  const createChatRoom = async (targetUserId: string, targetUserName: string, isAdmin = false) => {
    if (!user || !targetUserId) return

    try {
      // 이미 존재하는 채팅방 확인
      const existingRoom = chatRooms.find((room) => room.participants.includes(targetUserId))

      if (existingRoom) {
        onSelectChat(existingRoom.id)
        setIsCreateDialogOpen(false)
        return
      }

      // 현재 사용자 프로필 가져오기
      const currentUserProfile = await fetchUserProfile(user.uid)

      const currentUserName = currentUserProfile?.name || user.displayName || user.email?.split("@")[0] || "사용자"

      // 새 채팅방 생성
      const chatRoomData = {
        participants: [user.uid, targetUserId],
        participantNames: {
          [user.uid]: currentUserName,
          [targetUserId]: targetUserName,
        },
        lastMessage: "",
        lastMessageTime: new Date(),
        unreadCount: 0,
        createdBy: user.uid,
        createdAt: new Date(),
        isAdminChat: isAdmin,
      }

      const docRef = await addDoc(collection(db, "chatRooms"), chatRoomData)
      onSelectChat(docRef.id)
      setIsCreateDialogOpen(false)
      setSelectedUserId("")
    } catch (error) {
      console.error("채팅방 생성 실패:", error)
    }
  }

  const startAdminChat = async (adminId: string, adminName: string) => {
    await createChatRoom(adminId, adminName, true)
  }

  const filteredChatRooms = chatRooms.filter((room) => {
    const otherParticipant = room.participants.find((p) => p !== user?.uid)
    const otherParticipantProfile = participantProfiles[otherParticipant || ""]
    const otherParticipantName = getDisplayName(otherParticipantProfile, room.participantNames[otherParticipant || ""])
    return otherParticipantName?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="p-6 border-b border-blue-200/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <MessageCircle className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-32 animate-pulse"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-200 to-indigo-300 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4 mb-3"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="p-6 border-b border-blue-200/50 bg-white/70 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                1:1 채팅
              </h1>
              <p className="text-sm text-gray-500 mt-1">실시간 메시지로 소통하세요</p>
            </div>
          </div>

          <div className="flex gap-3">
            {/* 관리자 문의 버튼 */}
            {admins.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    관리자 문의
                    <Sparkles className="h-3 w-3 ml-2 animate-pulse" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gradient-to-br from-white to-orange-50 border-orange-200">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-orange-600">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Shield className="h-5 w-5" />
                      </div>
                      관리자와 채팅하기
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Alert className="border-orange-200 bg-orange-50">
                      <Shield className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        관리자와 직접 1:1 채팅으로 문의하실 수 있습니다. 빠른 답변을 받아보세요!
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-3">
                      {admins.map((admin) => (
                        <div
                          key={admin.id}
                          className="group flex items-center justify-between p-4 border-2 border-orange-200 rounded-xl bg-white hover:bg-orange-50 transition-all duration-300 cursor-pointer hover:shadow-lg"
                          onClick={() => startAdminChat(admin.id, admin.name)}
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border-2 border-orange-300 shadow-md">
                              <AvatarImage src={getProfileImageUrl(admin) || "/placeholder.svg"} alt={admin.name} />
                              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white font-bold text-lg">
                                <Crown className="h-6 w-6" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-gray-800 text-lg">{getDisplayName(admin)}</p>
                              <p className="text-sm text-gray-500">{admin.email}</p>
                              <p className="text-xs text-orange-600 font-medium">즉시 응답 가능</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 group-hover:scale-105 transition-transform duration-200"
                          >
                            채팅 시작
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* 새 채팅 버튼 (교사만) */}
            {user?.role === "teacher" && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />새 채팅
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gradient-to-br from-white to-blue-50 border-blue-200">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-blue-600">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Plus className="h-5 w-5" />
                      </div>
                      새 채팅 시작
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold mb-3 block text-gray-700">학생 선택</label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger className="border-2 border-blue-200 focus:border-blue-400 rounded-xl">
                          <SelectValue placeholder="채팅할 학생을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              <div className="flex items-center gap-3">
                                <div className="p-1 bg-green-100 rounded-full">{getRoleIcon(student.role)}</div>
                                <div>
                                  <p className="font-medium">{getDisplayName(student)}</p>
                                  <p className="text-xs text-gray-500">{student.email}</p>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="border-2 rounded-xl"
                      >
                        취소
                      </Button>
                      <Button
                        onClick={() => {
                          const selectedUser = users.find((u) => u.id === selectedUserId)
                          if (selectedUser) {
                            createChatRoom(selectedUserId, selectedUser.name)
                          }
                        }}
                        disabled={!selectedUserId}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl"
                      >
                        채팅 시작
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="채팅 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 border-2 border-blue-200 focus:border-blue-400 rounded-xl bg-white/80 backdrop-blur-sm h-12 text-base"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-4">
          {profilesLoading && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-sm font-medium">프로필 정보를 불러오는 중...</span>
              </div>
            </div>
          )}

          {filteredChatRooms.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center">
                <MessageCircle className="h-12 w-12 text-blue-400" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-gray-600">채팅방이 없습니다</h3>
              <p className="text-base text-gray-500 mb-6 leading-relaxed">
                {user?.role === "teacher"
                  ? "새 채팅 버튼을 눌러 학생과 채팅을 시작해보세요."
                  : "선생님이 채팅을 시작하거나 관리자에게 문의하세요."}
              </p>
              <div className="flex justify-center gap-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
                <div
                  className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          ) : (
            filteredChatRooms.map((room) => {
              const otherParticipant = room.participants.find((p) => p !== user?.uid)
              const otherParticipantProfile = participantProfiles[otherParticipant || ""]
              const displayName = getDisplayName(otherParticipantProfile, room.participantNames[otherParticipant || ""])
              const isAdminChat = otherParticipantProfile?.role === "admin"
              const isTeacherChat = otherParticipantProfile?.role === "teacher"

              console.log(`채팅방 ${room.id} 렌더링:`, {
                otherParticipant,
                otherParticipantProfile,
                displayName,
                isAdminChat,
                isTeacherChat,
              })

              return (
                <div
                  key={room.id}
                  className={`group p-5 cursor-pointer rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl ${
                    selectedChatId === room.id
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-2xl scale-[1.02]"
                      : "bg-white/80 hover:bg-white shadow-lg border border-blue-100 hover:border-blue-200"
                  }`}
                  onClick={() => onSelectChat(room.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Avatar
                        className={`h-14 w-14 border-3 shadow-lg transition-all duration-300 ${
                          selectedChatId === room.id ? "border-white" : "border-blue-200 group-hover:border-blue-300"
                        }`}
                      >
                        <AvatarImage
                          src={getProfileImageUrl(otherParticipantProfile) || "/placeholder.svg"}
                          alt={displayName}
                        />
                        <AvatarFallback
                          className={`font-bold text-lg ${
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
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                          <Shield className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {/* 선생님 배지 */}
                      {isTeacherChat && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                          <Star className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p
                          className={`text-base font-bold truncate ${
                            selectedChatId === room.id ? "text-white" : "text-gray-800"
                          }`}
                        >
                          {displayName}
                        </p>
                        <div className="flex items-center gap-2">
                          {room.unreadCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 animate-pulse"
                            >
                              {room.unreadCount}
                            </Badge>
                          )}
                          <span className={`text-xs ${selectedChatId === room.id ? "text-blue-100" : "text-gray-400"}`}>
                            {formatTime(room.lastMessageTime)}
                          </span>
                        </div>
                      </div>
                      <p
                        className={`text-sm truncate ${selectedChatId === room.id ? "text-blue-100" : "text-gray-500"}`}
                      >
                        {room.lastMessage || "새 채팅방입니다. 첫 메시지를 보내보세요! 👋"}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
