"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  BookOpen,
  FileText,
  User,
  Users,
  Trash2,
  AlertTriangle,
  CheckCircle,
  GraduationCap,
  School,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDocs, or } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getTodayTimetable, periodTimes, type TimetableData, DUKYOUNG_SCHOOL_INFO } from "@/lib/neis-api"

// 캘린더 이벤트 타입 정의
export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate?: Date
  type: "assignment" | "exam" | "personal" | "class" | "timetable"
  classId?: string
  className?: string
  createdBy: string
  createdByName: string
  assignmentId?: string
  isAllDay: boolean
  color: string
  createdAt: Date
  updatedAt?: Date
  period?: string
  subject?: string
  classroom?: string
  grade?: string
  classNumber?: string
}

interface CalendarProps {
  classId?: string
  showPersonalEvents?: boolean
  compact?: boolean
}

const eventColors = {
  assignment: "bg-blue-500",
  exam: "bg-red-500",
  personal: "bg-green-500",
  class: "bg-purple-500",
  timetable: "bg-orange-500",
}

const eventTextColors = {
  assignment: "text-blue-700",
  exam: "text-red-700",
  personal: "text-green-700",
  class: "text-purple-700",
  timetable: "text-orange-700",
}

const eventBgColors = {
  assignment: "bg-blue-50",
  exam: "bg-red-50",
  personal: "bg-green-50",
  class: "bg-purple-50",
  timetable: "bg-orange-50",
}

export function Calendar({ classId, showPersonalEvents = true, compact = false }: CalendarProps) {
  const { user, userProfile } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"month" | "week">("month")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(true)

  // 데이터 상태
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [timetableData, setTimetableData] = useState<TimetableData[]>([])
  const [classSettings, setClassSettings] = useState<{
    grade: string
    classNumber: string
  } | null>(null)
  const [myClasses, setMyClasses] = useState<string[]>([])

  // 새 이벤트 생성 상태
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    type: "personal" as CalendarEvent["type"],
    isAllDay: true,
    classId: classId || "",
  })

  // 내가 속한 반 목록 가져오기
  useEffect(() => {
    const loadMyClasses = async () => {
      if (!user) return

      try {
        const membershipsQuery = query(collection(db, "classMembers"), where("memberId", "==", user.uid))
        const membershipsSnapshot = await getDocs(membershipsQuery)
        const classIds = membershipsSnapshot.docs.map((doc) => doc.data().classId)
        setMyClasses(classIds)
      } catch (error) {
        console.error("내 반 목록 로드 실패:", error)
      }
    }

    loadMyClasses()
  }, [user])

  // 반 설정 로드
  useEffect(() => {
    const loadClassSettings = async () => {
      if (!classId || !user) return

      try {
        const classDoc = await getDocs(query(collection(db, "classes"), where("id", "==", classId)))
        if (!classDoc.empty) {
          const classInfo = classDoc.docs[0].data()
          setClassSettings({
            grade: classInfo.grade,
            classNumber: classInfo.classNumber,
          })
        }
      } catch (error) {
        console.error("반 설정 로드 실패:", error)
      }
    }

    loadClassSettings()
  }, [classId, user])

  // 캘린더 이벤트 실시간 구독
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let eventsQuery
    if (classId) {
      // 특정 반의 모든 이벤트 보기
      eventsQuery = query(collection(db, "calendarEvents"), where("classId", "==", classId))
    } else {
      // 대시보드에서는 개인 이벤트 + 내가 속한 반들의 공개 이벤트 보기
      const queries = []

      // 개인 이벤트
      if (showPersonalEvents) {
        queries.push(where("createdBy", "==", user.uid))
        queries.push(where("type", "==", "personal"))
      }

      // 내가 속한 반들의 공개 이벤트 (exam, class)
      if (myClasses.length > 0) {
        queries.push(where("classId", "in", myClasses), where("type", "in", ["exam", "class"]))
      }

      if (queries.length > 0) {
        eventsQuery = query(collection(db, "calendarEvents"), or(...queries))
      } else {
        setLoading(false)
        return
      }
    }

    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const events: CalendarEvent[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          events.push({
            id: doc.id,
            ...data,
            startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
            endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate ? new Date(data.endDate) : undefined,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate
              ? data.updatedAt.toDate()
              : data.updatedAt
                ? new Date(data.updatedAt)
                : undefined,
          } as CalendarEvent)
        })
        setCalendarEvents(events)
        setLoading(false)
      },
      (error) => {
        console.error("캘린더 이벤트 구독 실패:", error)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [user, classId, showPersonalEvents, myClasses])

  // 과제 데이터 구독
  useEffect(() => {
    if (!user) return

    let assignmentsQuery
    if (classId) {
      assignmentsQuery = query(collection(db, "assignments"), where("classId", "==", classId))
    } else if (myClasses.length > 0) {
      assignmentsQuery = query(collection(db, "assignments"), where("classId", "in", myClasses))
    } else {
      return
    }

    const unsubscribe = onSnapshot(
      assignmentsQuery,
      (snapshot) => {
        const assignmentList: any[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          assignmentList.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate),
          })
        })
        setAssignments(assignmentList)
      },
      (error) => {
        console.error("과제 데이터 구독 실패:", error)
      },
    )

    return () => unsubscribe()
  }, [user, classId, myClasses])

  // 시간표 데이터 로드
  useEffect(() => {
    const loadTimetableData = async () => {
      if (!classSettings || !classId) return

      try {
        const today = new Date()
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay() + 1)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)

        const weekTimetable: TimetableData[] = []
        for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
          try {
            const dayTimetable = await getTodayTimetable(classId, classSettings.grade, classSettings.classNumber)
            weekTimetable.push(...dayTimetable)
          } catch (error) {
            console.error("일별 시간표 로드 실패:", error)
          }
        }

        setTimetableData(weekTimetable)
      } catch (error) {
        console.error("시간표 데이터 로드 실패:", error)
      }
    }

    loadTimetableData()
  }, [classSettings, classId])

  // 과제를 캘린더 이벤트로 변환
  const assignmentEvents: CalendarEvent[] = React.useMemo(() => {
    return assignments
      .filter((assignment) => {
        if (classId) return assignment.classId === classId
        return myClasses.includes(assignment.classId)
      })
      .map((assignment) => ({
        id: `assignment-${assignment.id}`,
        title: `📝 ${assignment.title}`,
        description: `과제 마감일`,
        startDate: assignment.dueDate,
        type: "assignment" as const,
        classId: assignment.classId,
        assignmentId: assignment.id,
        createdBy: assignment.createdBy,
        createdByName: "시스템",
        isAllDay: true,
        color: eventColors.assignment,
        createdAt: assignment.createdAt,
      }))
  }, [assignments, classId, myClasses])

  // 시간표를 캘린더 이벤트로 변환
  const timetableEvents: CalendarEvent[] = React.useMemo(() => {
    if (!timetableData || !classId) return []

    return timetableData.map((timetable) => {
      const date = new Date(timetable.ALL_TI_YMD.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"))
      const [startTime] = (periodTimes[timetable.PERIO] || "09:00-09:50").split("-")
      const [hours, minutes] = startTime.split(":").map(Number)

      const startDate = new Date(date)
      startDate.setHours(hours, minutes, 0, 0)

      return {
        id: `timetable-${timetable.ALL_TI_YMD}-${timetable.PERIO}-${timetable.CLASS_NM}`,
        title: `📚 ${timetable.ITRT_CNTNT}`,
        description: `${timetable.PERIO}교시 - ${timetable.CLRM_NM || "강의실 미정"}`,
        startDate,
        type: "timetable" as const,
        classId: classId,
        createdBy: "system",
        createdByName: "시간표",
        isAllDay: false,
        color: eventColors.timetable,
        period: timetable.PERIO,
        subject: timetable.ITRT_CNTNT,
        classroom: timetable.CLRM_NM,
        grade: timetable.GRADE,
        classNumber: timetable.CLASS_NM,
        createdAt: new Date(),
      }
    })
  }, [timetableData, classId])

  // 모든 이벤트 합치기
  const allEvents = React.useMemo(() => {
    const combined = [...assignmentEvents, ...calendarEvents, ...timetableEvents]
    return combined.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  }, [assignmentEvents, calendarEvents, timetableEvents])

  // 달력 렌더링을 위한 날짜 계산
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // 이전 달의 날짜들
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({ date: prevDate, isCurrentMonth: false })
    }

    // 현재 달의 날짜들
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true })
    }

    // 다음 달의 날짜들 (42개 칸 채우기)
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false })
    }

    return days
  }

  // 특정 날짜의 이벤트 가져오기
  const getEventsForDate = (date: Date) => {
    return allEvents.filter((event) => {
      const eventDate = new Date(event.startDate)
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      )
    })
  }

  // 이벤트 생성
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEvent.title || !newEvent.startDate) {
      setError("제목과 시작 날짜를 입력해주세요.")
      return
    }

    setError("")
    setSuccess("")

    try {
      const eventData = {
        title: newEvent.title,
        description: newEvent.description || "",
        startDate: new Date(newEvent.startDate),
        endDate: newEvent.endDate ? new Date(newEvent.endDate) : null,
        type: newEvent.type,
        classId: newEvent.classId || null,
        createdBy: user!.uid,
        createdByName: userProfile!.name,
        isAllDay: newEvent.isAllDay,
        color: eventColors[newEvent.type],
        createdAt: new Date(),
      }

      await addDoc(collection(db, "calendarEvents"), eventData)
      setSuccess("일정이 성공적으로 생성되었습니다.")
      setNewEvent({
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        type: "personal",
        isAllDay: true,
        classId: classId || "",
      })
      setIsCreatingEvent(false)
    } catch (error: any) {
      console.error("Error creating event:", error)
      setError("일정 생성 중 오류가 발생했습니다.")
    }
  }

  // 이벤트 삭제
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("정말로 이 일정을 삭제하시겠습니까?")) return

    try {
      await deleteDoc(doc(db, "calendarEvents", eventId))
      setSuccess("일정이 삭제되었습니다.")
      setSelectedEvent(null)
    } catch (error) {
      console.error("Error deleting event:", error)
      setError("일정 삭제 중 오류가 발생했습니다.")
    }
  }

  // 월 변경
  const changeMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  // 오늘로 이동
  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const days = getDaysInMonth(currentDate)
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"]

  if (!user || !userProfile) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">로그인이 필요합니다.</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">캘린더를 불러오는 중...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="bg-red-50/80 backdrop-blur-sm border-red-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50/80 backdrop-blur-sm border-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-0 shadow-xl">
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-3">
                  <CalendarIcon className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {classId ? "반 캘린더" : "내 캘린더"}
                </span>
              </CardTitle>
              <CardDescription className="ml-13 text-gray-600">
                과제 마감일, 시간표, 일정을 한눈에 확인하세요
                {classSettings && (
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                      <School className="h-3 w-3 mr-1" />
                      {DUKYOUNG_SCHOOL_INFO.SCHUL_NM}
                    </Badge>
                    <Badge variant="outline">
                      {classSettings.grade}학년 {classSettings.classNumber}반
                    </Badge>
                  </div>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="bg-white/50 backdrop-blur-sm border-gray-200 hover:bg-white/80"
              >
                오늘
              </Button>
              <Dialog open={isCreatingEvent} onOpenChange={setIsCreatingEvent}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-xl">
                    <Plus className="h-4 w-4 mr-2" />
                    일정 추가
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>새 일정 만들기</DialogTitle>
                    <DialogDescription>새로운 일정을 추가하세요.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateEvent} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="eventTitle">제목</Label>
                      <Input
                        id="eventTitle"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="일정 제목을 입력하세요"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="eventType">종류</Label>
                      <Select
                        value={newEvent.type}
                        onValueChange={(value: CalendarEvent["type"]) =>
                          setNewEvent((prev) => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">개인 일정</SelectItem>
                          {userProfile.role === "teacher" && (
                            <>
                              <SelectItem value="exam">시험</SelectItem>
                              <SelectItem value="class">수업</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="eventStartDate">시작 날짜</Label>
                      <Input
                        id="eventStartDate"
                        type={newEvent.isAllDay ? "date" : "datetime-local"}
                        value={newEvent.startDate}
                        onChange={(e) => setNewEvent((prev) => ({ ...prev, startDate: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isAllDay"
                        checked={newEvent.isAllDay}
                        onChange={(e) => setNewEvent((prev) => ({ ...prev, isAllDay: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="isAllDay" className="text-sm">
                        하루 종일
                      </Label>
                    </div>

                    {!newEvent.isAllDay && (
                      <div className="space-y-2">
                        <Label htmlFor="eventEndDate">종료 날짜 (선택사항)</Label>
                        <Input
                          id="eventEndDate"
                          type="datetime-local"
                          value={newEvent.endDate}
                          onChange={(e) => setNewEvent((prev) => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="eventDescription">설명 (선택사항)</Label>
                      <Textarea
                        id="eventDescription"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="일정에 대한 설명을 입력하세요"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreatingEvent(false)}>
                        취소
                      </Button>
                      <Button type="submit">생성</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* 캘린더 헤더 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => changeMonth("prev")} className="hover:bg-blue-50">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold text-gray-900">
                {currentDate.getFullYear()}년 {monthNames[currentDate.getMonth()]}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => changeMonth("next")} className="hover:bg-blue-50">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>과제</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>시간표</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>시험</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>개인</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span>수업</span>
                </div>
              </div>
            </div>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {dayNames.map((day, index) => (
              <div
                key={day}
                className={`p-3 text-center text-sm font-medium ${
                  index === 0 ? "text-red-600" : index === 6 ? "text-blue-600" : "text-gray-700"
                } bg-gray-50`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 캘린더 그리드 */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dayEvents = getEventsForDate(day.date)
              const isToday =
                day.date.getFullYear() === new Date().getFullYear() &&
                day.date.getMonth() === new Date().getMonth() &&
                day.date.getDate() === new Date().getDate()

              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border-r border-b border-gray-200 ${
                    !day.isCurrentMonth ? "bg-gray-50" : "bg-white"
                  } hover:bg-blue-50/30 transition-colors cursor-pointer`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm ${
                        !day.isCurrentMonth
                          ? "text-gray-400"
                          : isToday
                            ? "bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-medium"
                            : index % 7 === 0
                              ? "text-red-600"
                              : index % 7 === 6
                                ? "text-blue-600"
                                : "text-gray-900"
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event, eventIndex) => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${
                          eventBgColors[event.type]
                        } ${eventTextColors[event.type]} border border-opacity-20`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedEvent(event)
                        }}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">+{dayEvents.length - 3}개 더</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 이벤트 상세 보기 모달 */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                {selectedEvent.type === "assignment" && <FileText className="h-5 w-5 text-blue-600" />}
                {selectedEvent.type === "exam" && <BookOpen className="h-5 w-5 text-red-600" />}
                {selectedEvent.type === "personal" && <User className="h-5 w-5 text-green-600" />}
                {selectedEvent.type === "class" && <Users className="h-5 w-5 text-purple-600" />}
                {selectedEvent.type === "timetable" && <GraduationCap className="h-5 w-5 text-orange-600" />}
                <span>{selectedEvent.title}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Badge className={`${eventColors[selectedEvent.type]} text-white`}>
                  {selectedEvent.type === "assignment" && "과제"}
                  {selectedEvent.type === "exam" && "시험"}
                  {selectedEvent.type === "personal" && "개인"}
                  {selectedEvent.type === "class" && "수업"}
                  {selectedEvent.type === "timetable" && "시간표"}
                </Badge>
                <span className="text-sm text-gray-600">{selectedEvent.createdByName}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>
                    {selectedEvent.startDate.toLocaleDateString()}
                    {!selectedEvent.isAllDay && ` ${selectedEvent.startDate.toLocaleTimeString()}`}
                  </span>
                </div>
                {selectedEvent.endDate && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className="ml-6">
                      ~ {selectedEvent.endDate.toLocaleDateString()}
                      {!selectedEvent.isAllDay && ` ${selectedEvent.endDate.toLocaleTimeString()}`}
                    </span>
                  </div>
                )}
              </div>

              {selectedEvent.type === "timetable" && (
                <div className="space-y-2 bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-orange-700">교시</span>
                    <span className="text-sm text-orange-800">{selectedEvent.period}교시</span>
                  </div>
                  {selectedEvent.classroom && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-orange-700">강의실</span>
                      <span className="text-sm text-orange-800">{selectedEvent.classroom}</span>
                    </div>
                  )}
                  {selectedEvent.grade && selectedEvent.classNumber && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-orange-700">학급</span>
                      <span className="text-sm text-orange-800">
                        {selectedEvent.grade}학년 {selectedEvent.classNumber}반
                      </span>
                    </div>
                  )}
                </div>
              )}

              {selectedEvent.description && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">설명</Label>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedEvent.description}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                {selectedEvent.createdBy === user.uid &&
                  selectedEvent.type !== "assignment" &&
                  selectedEvent.type !== "timetable" && (
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteEvent(selectedEvent.id)}>
                      <Trash2 className="h-3 w-3 mr-1" />
                      삭제
                    </Button>
                  )}
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  닫기
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
