"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Calendar,
  Clock,
  School,
  BookOpen,
  Users,
  MapPin,
  Search,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  GraduationCap,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  fetchTimetableFromNeis,
  fetchHistoricalTimetable,
  groupTimetableByDay,
  periodTimes,
  getCurrentSemester,
  getThisWeekRange,
  type TimetableData,
  type NeisApiParams,
} from "@/lib/neis-api"

interface TimetableViewerProps {
  classId?: string
  defaultSchoolCode?: string
  defaultEducationOfficeCode?: string
}

export function TimetableViewer({
  classId,
  defaultSchoolCode = "7530174",
  defaultEducationOfficeCode = "J10",
}: TimetableViewerProps) {
  const { user, userProfile } = useAuth()
  const [timetableData, setTimetableData] = useState<TimetableData[]>([])
  const [groupedData, setGroupedData] = useState<Record<string, TimetableData[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState<TimetableData | null>(null)

  // 검색 조건
  const [searchParams, setSearchParams] = useState<NeisApiParams>({
    ATPT_OFCDC_SC_CODE: defaultEducationOfficeCode,
    SD_SCHUL_CODE: defaultSchoolCode,
    AY: getCurrentSemester().year,
    SEM: getCurrentSemester().semester,
    GRADE: "",
    CLASS_NM: "",
    ...getThisWeekRange(),
    TI_FROM_YMD: getThisWeekRange().start,
    TI_TO_YMD: getThisWeekRange().end,
  })

  // 시간표 데이터 로드
  const loadTimetable = async (useHistorical = false) => {
    if (!searchParams.ATPT_OFCDC_SC_CODE || !searchParams.SD_SCHUL_CODE) {
      setError("교육청 코드와 학교 코드를 입력해주세요.")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      let data: TimetableData[]

      if (useHistorical) {
        data = await fetchHistoricalTimetable(searchParams)
      } else {
        data = await fetchTimetableFromNeis(searchParams)
      }

      setTimetableData(data)
      setGroupedData(groupTimetableByDay(data))
      setSuccess(`시간표 데이터를 성공적으로 불러왔습니다. (${data.length}건)`)
    } catch (error: any) {
      console.error("시간표 로드 실패:", error)
      setError(`시간표 로드 실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 컴포넌트 마운트 시 기본 데이터 로드
  useEffect(() => {
    if (user) {
      loadTimetable()
    }
  }, [user])

  // 검색 조건 업데이트
  const updateSearchParam = (key: keyof NeisApiParams, value: string) => {
    setSearchParams((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  // 이번 주 시간표로 설정
  const setThisWeek = () => {
    const thisWeek = getThisWeekRange()
    setSearchParams((prev) => ({
      ...prev,
      TI_FROM_YMD: thisWeek.start,
      TI_TO_YMD: thisWeek.end,
    }))
  }

  // CSV 다운로드
  const downloadCSV = () => {
    if (timetableData.length === 0) {
      setError("다운로드할 데이터가 없습니다.")
      return
    }

    const headers = ["학년도", "학기", "일자", "계열명", "학과명", "학년", "반명", "교시", "수업내용", "강의실명"]

    const csvContent = [
      headers.join(","),
      ...timetableData.map((item) =>
        [
          item.AY,
          item.SEM,
          item.ALL_TI_YMD,
          item.ORD_SC_NM,
          item.DDDEP_NM,
          item.GRADE,
          item.CLASS_NM,
          item.PERIO,
          `"${item.ITRT_CNTNT}"`,
          item.CLRM_NM,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `timetable_${searchParams.AY}_${searchParams.SEM}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const dayOrder = ["월", "화", "수", "목", "금", "토", "일"]
  const sortedDays = dayOrder.filter((day) => groupedData[day])

  if (!user || !userProfile) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">로그인이 필요합니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 검색 조건 */}
      <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-3">
              <Search className="h-5 w-5 text-white" />
            </div>
            시간표 검색
          </CardTitle>
          <CardDescription>NEIS API를 통해 학교 시간표를 조회합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="educationOffice">교육청 코드</Label>
              <Input
                id="educationOffice"
                value={searchParams.ATPT_OFCDC_SC_CODE}
                onChange={(e) => updateSearchParam("ATPT_OFCDC_SC_CODE", e.target.value)}
                placeholder="예: J10"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolCode">학교 코드</Label>
              <Input
                id="schoolCode"
                value={searchParams.SD_SCHUL_CODE}
                onChange={(e) => updateSearchParam("SD_SCHUL_CODE", e.target.value)}
                placeholder="예: 7530174"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">학년도</Label>
              <Select value={searchParams.AY || "2023"} onValueChange={(value) => updateSearchParam("AY", value)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="학년도 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, i) => {
                    const year = new Date().getFullYear() - i
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}학년도
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">학기</Label>
              <Select value={searchParams.SEM || "1"} onValueChange={(value) => updateSearchParam("SEM", value)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="학기 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1학기</SelectItem>
                  <SelectItem value="2">2학기</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">학년</Label>
              <Select value={searchParams.GRADE || "전체"} onValueChange={(value) => updateSearchParam("GRADE", value)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="학년 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="전체">전체</SelectItem>
                  <SelectItem value="1">1학년</SelectItem>
                  <SelectItem value="2">2학년</SelectItem>
                  <SelectItem value="3">3학년</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="className">반명</Label>
              <Input
                id="className"
                value={searchParams.CLASS_NM || ""}
                onChange={(e) => updateSearchParam("CLASS_NM", e.target.value)}
                placeholder="예: 1, 2, 3..."
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">시작일</Label>
              <Input
                id="startDate"
                type="date"
                value={
                  searchParams.TI_FROM_YMD
                    ? `${searchParams.TI_FROM_YMD.slice(0, 4)}-${searchParams.TI_FROM_YMD.slice(4, 6)}-${searchParams.TI_FROM_YMD.slice(6, 8)}`
                    : ""
                }
                onChange={(e) => {
                  const date = e.target.value.replace(/-/g, "")
                  updateSearchParam("TI_FROM_YMD", date)
                }}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">종료일</Label>
              <Input
                id="endDate"
                type="date"
                value={
                  searchParams.TI_TO_YMD
                    ? `${searchParams.TI_TO_YMD.slice(0, 4)}-${searchParams.TI_TO_YMD.slice(4, 6)}-${searchParams.TI_TO_YMD.slice(6, 8)}`
                    : ""
                }
                onChange={(e) => {
                  const date = e.target.value.replace(/-/g, "")
                  updateSearchParam("TI_TO_YMD", date)
                }}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => loadTimetable(false)}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-xl"
            >
              {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              시간표 조회
            </Button>

            <Button
              onClick={() => loadTimetable(true)}
              disabled={loading}
              variant="outline"
              className="rounded-xl border-purple-200 text-purple-600 hover:bg-purple-50"
            >
              <Calendar className="h-4 w-4 mr-2" />
              과거 데이터 조회
            </Button>

            <Button onClick={setThisWeek} variant="outline" className="rounded-xl bg-transparent">
              <Clock className="h-4 w-4 mr-2" />
              이번 주
            </Button>

            <Button
              onClick={downloadCSV}
              disabled={timetableData.length === 0}
              variant="outline"
              className="rounded-xl bg-transparent"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV 다운로드
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 알림 */}
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

      {/* 시간표 표시 */}
      {Object.keys(groupedData).length > 0 && (
        <Card className="overflow-hidden bg-gradient-to-br from-green-50 via-white to-blue-50 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center mr-3">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              시간표
            </CardTitle>
            <CardDescription>
              {timetableData.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                    {timetableData[0].SCHUL_NM}
                  </Badge>
                  <Badge variant="outline">
                    {timetableData[0].AY}학년도 {timetableData[0].SEM}학기
                  </Badge>
                  {timetableData[0].GRADE && <Badge variant="outline">{timetableData[0].GRADE}학년</Badge>}
                  {timetableData[0].CLASS_NM && <Badge variant="outline">{timetableData[0].CLASS_NM}반</Badge>}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={sortedDays[0]} className="w-full">
              <TabsList className="grid w-full grid-cols-5 lg:grid-cols-7 mb-6">
                {sortedDays.map((day) => (
                  <TabsTrigger key={day} value={day} className="rounded-xl">
                    {day}요일
                  </TabsTrigger>
                ))}
              </TabsList>

              {sortedDays.map((day) => (
                <TabsContent key={day} value={day} className="space-y-4">
                  <div className="grid gap-3">
                    {groupedData[day]?.map((period, index) => (
                      <div
                        key={`${period.ALL_TI_YMD}-${period.PERIO}-${index}`}
                        className="p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-100 hover:shadow-md transition-all duration-300 cursor-pointer"
                        onClick={() => setSelectedPeriod(period)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                {period.PERIO}교시
                              </Badge>
                              <span className="text-sm text-gray-600">{periodTimes[period.PERIO] || "시간 미정"}</span>
                              {period.CLRM_NM && (
                                <Badge variant="outline" className="flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {period.CLRM_NM}
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-semibold text-lg text-gray-800 mb-1">{period.ITRT_CNTNT}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              {period.ORD_SC_NM && (
                                <span className="flex items-center">
                                  <School className="h-4 w-4 mr-1" />
                                  {period.ORD_SC_NM}
                                </span>
                              )}
                              {period.DDDEP_NM && <span>{period.DDDEP_NM}</span>}
                              {period.GRADE && period.CLASS_NM && (
                                <span className="flex items-center">
                                  <Users className="h-4 w-4 mr-1" />
                                  {period.GRADE}학년 {period.CLASS_NM}반
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(!groupedData[day] || groupedData[day].length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>해당 요일에 시간표가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* 시간표가 없을 때 */}
      {Object.keys(groupedData).length === 0 && !loading && (
        <Card className="overflow-hidden bg-gradient-to-br from-gray-50 via-white to-slate-50 border-0 shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
              <BookOpen className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">시간표가 없습니다</h3>
            <p className="text-gray-500 mb-6">검색 조건을 설정하고 시간표를 조회해보세요</p>
            <Button
              onClick={() => loadTimetable(false)}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-xl"
            >
              <Search className="h-4 w-4 mr-2" />
              시간표 조회하기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 수업 상세 정보 모달 */}
      {selectedPeriod && (
        <Dialog open={!!selectedPeriod} onOpenChange={() => setSelectedPeriod(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                수업 상세 정보
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{selectedPeriod.ITRT_CNTNT}</h3>
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    {selectedPeriod.PERIO}교시
                  </Badge>
                  <span className="text-sm text-gray-600">{periodTimes[selectedPeriod.PERIO] || "시간 미정"}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600 font-medium">일자</span>
                  <span className="font-medium text-gray-800">
                    {selectedPeriod.ALL_TI_YMD.replace(/(\d{4})(\d{2})(\d{2})/, "$1년 $2월 $3일")}
                  </span>
                </div>

                {selectedPeriod.CLRM_NM && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">강의실</span>
                    <span className="font-medium text-gray-800 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {selectedPeriod.CLRM_NM}
                    </span>
                  </div>
                )}

                {selectedPeriod.ORD_SC_NM && (
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-blue-700 font-medium">계열</span>
                    <span className="font-medium text-blue-800">{selectedPeriod.ORD_SC_NM}</span>
                  </div>
                )}

                {selectedPeriod.DDDEP_NM && (
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-green-700 font-medium">학과</span>
                    <span className="font-medium text-green-800">{selectedPeriod.DDDEP_NM}</span>
                  </div>
                )}

                {selectedPeriod.GRADE && selectedPeriod.CLASS_NM && (
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <span className="text-purple-700 font-medium">학급</span>
                    <span className="font-medium text-purple-800 flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {selectedPeriod.GRADE}학년 {selectedPeriod.CLASS_NM}반
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600 font-medium">학년도/학기</span>
                  <span className="font-medium text-gray-800">
                    {selectedPeriod.AY}학년도 {selectedPeriod.SEM}학기
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedPeriod(null)}>
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
