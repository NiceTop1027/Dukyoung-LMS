"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, BookOpen, MapPin, RefreshCw, Calendar, GraduationCap, AlertTriangle, Info } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { safeGetDoc } from "@/lib/firebase-utils"
import {
  getTodayTimetable,
  getCurrentPeriod,
  periodTimes,
  type TimetableData,
  DUKYOUNG_SCHOOL_INFO,
} from "@/lib/neis-api"
import Link from "next/link"

interface TimetableWidgetProps {
  classId?: string
  compact?: boolean
}

export function TimetableWidget({ classId, compact = false }: TimetableWidgetProps) {
  const { user, userProfile } = useAuth()
  const [todayTimetable, setTodayTimetable] = useState<TimetableData[]>([])
  const [currentPeriod, setCurrentPeriod] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState("")
  const [classSettings, setClassSettings] = useState<{
    grade: string
    classNumber: string
  } | null>(null)

  // 반 설정 로드
  useEffect(() => {
    const loadClassSettings = async () => {
      if (!classId || !user) return

      try {
        const classInfo = await safeGetDoc(`classes/${classId}`)
        if (classInfo) {
          const settings = {
            grade: classInfo.grade,
            classNumber: classInfo.classNumber,
          }
          setClassSettings(settings)
          setDebugInfo(`반 설정 로드 완료: ${settings.grade}학년 ${settings.classNumber}반`)
        }
      } catch (error) {
        console.error("반 설정 로드 실패:", error)
        setError("반 설정을 불러올 수 없습니다.")
      }
    }

    loadClassSettings()
  }, [classId, user])

  // 오늘의 시간표 로드
  const loadTodayTimetable = async () => {
    if (!classSettings || !classId) {
      setDebugInfo("반 설정이 없어서 시간표를 로드할 수 없습니다.")
      return
    }

    setLoading(true)
    setError("")
    setDebugInfo(`시간표 로드 시작: ${classSettings.grade}학년 ${classSettings.classNumber}반`)

    try {
      const timetable = await getTodayTimetable(classId, classSettings.grade, classSettings.classNumber)
      setTodayTimetable(timetable)
      setDebugInfo(
        `시간표 로드 완료: ${timetable.length}개 교시 (${timetable.map((t) => `${t.PERIO}교시: ${t.ITRT_CNTNT}`).join(", ")})`,
      )
    } catch (error: any) {
      console.error("오늘의 시간표 로드 실패:", error)
      setError("시간표를 불러올 수 없습니다.")
      setDebugInfo(`시간표 로드 실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 현재 교시 업데이트
  useEffect(() => {
    const updateCurrentPeriod = () => {
      setCurrentPeriod(getCurrentPeriod())
    }

    updateCurrentPeriod()
    const interval = setInterval(updateCurrentPeriod, 60000) // 1분마다 업데이트

    return () => clearInterval(interval)
  }, [])

  // 데이터 로드
  useEffect(() => {
    if (classSettings) {
      loadTodayTimetable()
    }
  }, [classSettings])

  // 현재 진행 중인 수업 찾기
  const getCurrentClass = () => {
    if (!currentPeriod || !todayTimetable.length) return null
    return todayTimetable.find((item) => item.PERIO === currentPeriod)
  }

  // 다음 수업 찾기
  const getNextClass = () => {
    if (!todayTimetable.length) return null

    const now = new Date()
    const currentTime = now.getHours() * 100 + now.getMinutes()

    for (const item of todayTimetable.sort((a, b) => Number.parseInt(a.PERIO) - Number.parseInt(b.PERIO))) {
      const [startTime] = (periodTimes[item.PERIO] || "09:00-09:50").split("-")
      const [hours, minutes] = startTime.split(":").map(Number)
      const periodTime = hours * 100 + minutes

      if (periodTime > currentTime) {
        return item
      }
    }

    return null
  }

  const currentClass = getCurrentClass()
  const nextClass = getNextClass()

  if (!user || !userProfile) {
    return null
  }

  if (!classId || !classSettings) {
    return (
      <Card className="overflow-hidden bg-gradient-to-br from-orange-50 via-white to-yellow-50 border-0 shadow-lg">
        <CardContent className="p-6 text-center">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-4">반 정보가 필요합니다</p>
          <Button variant="outline" asChild>
            <Link href="/dashboard">반 선택하기</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-orange-50 via-white to-yellow-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center mr-3">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              오늘의 시간표
            </CardTitle>
            <CardDescription className="ml-11 text-gray-600">
              {DUKYOUNG_SCHOOL_INFO.SCHUL_NM} {classSettings.grade}학년 {classSettings.classNumber}반
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={loadTodayTimetable}
              disabled={loading}
              className="hover:bg-orange-50"
            >
              {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
            <Button size="sm" variant="outline" asChild className="bg-white/50 backdrop-blur-sm">
              <Link href="/timetable">
                <Calendar className="h-3 w-3 mr-1" />
                전체보기
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 디버그 정보 */}
        {debugInfo && (
          <Alert className="mb-4 bg-blue-50/80 backdrop-blur-sm border-blue-200">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">{debugInfo}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4 bg-red-50/80 backdrop-blur-sm border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4" />
            <p className="text-gray-500">시간표를 불러오는 중...</p>
          </div>
        ) : todayTimetable.length > 0 ? (
          <div className="space-y-4">
            {/* 현재 진행 중인 수업 */}
            {currentClass && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    <Clock className="h-3 w-3 mr-1" />
                    현재 수업 중
                  </Badge>
                  <span className="text-sm text-green-700 font-medium">
                    {currentClass.PERIO}교시 ({periodTimes[currentClass.PERIO]})
                  </span>
                </div>
                <h4 className="font-bold text-lg text-green-800 mb-1">{currentClass.ITRT_CNTNT}</h4>
                {currentClass.CLRM_NM && (
                  <p className="text-sm text-green-700 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {currentClass.CLRM_NM}
                  </p>
                )}
              </div>
            )}

            {/* 다음 수업 */}
            {nextClass && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">다음 수업</Badge>
                  <span className="text-sm text-blue-700 font-medium">
                    {nextClass.PERIO}교시 ({periodTimes[nextClass.PERIO]})
                  </span>
                </div>
                <h4 className="font-semibold text-blue-800 mb-1">{nextClass.ITRT_CNTNT}</h4>
                {nextClass.CLRM_NM && (
                  <p className="text-sm text-blue-700 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {nextClass.CLRM_NM}
                  </p>
                )}
              </div>
            )}

            {/* 전체 시간표 */}
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700 mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                오늘의 전체 시간표
              </h5>
              <div className="space-y-2">
                {todayTimetable
                  .sort((a, b) => Number.parseInt(a.PERIO) - Number.parseInt(b.PERIO))
                  .map((item, index) => (
                    <div
                      key={`${item.PERIO}-${index}`}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                        item.PERIO === currentPeriod
                          ? "bg-green-50 border-green-300 shadow-md ring-2 ring-green-200"
                          : "bg-white/70 border-gray-200 hover:bg-gray-50 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-center min-w-[60px]">
                          <Badge
                            variant={item.PERIO === currentPeriod ? "default" : "outline"}
                            className={`${
                              item.PERIO === currentPeriod
                                ? "bg-green-500 text-white border-green-500"
                                : "bg-white text-gray-600 border-gray-300"
                            } font-medium`}
                          >
                            {item.PERIO}교시
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">{periodTimes[item.PERIO] || "시간 미정"}</p>
                        </div>
                        <div className="border-l border-gray-200 pl-4">
                          <h4 className="font-semibold text-gray-800 text-base">{item.ITRT_CNTNT}</h4>
                          {item.CLRM_NM && (
                            <p className="text-sm text-gray-600 flex items-center mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {item.CLRM_NM}
                            </p>
                          )}
                        </div>
                      </div>
                      {item.PERIO === currentPeriod && (
                        <Badge className="bg-green-500 text-white text-xs animate-pulse">진행중</Badge>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-lg mb-2 font-medium">오늘은 수업이 없습니다</p>
            <p className="text-sm mb-4">시간표가 등록되지 않았거나 휴일일 수 있습니다</p>
            <Button variant="outline" size="sm" onClick={loadTodayTimetable} className="bg-white/50 backdrop-blur-sm">
              <RefreshCw className="h-3 w-3 mr-1" />
              다시 확인
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
