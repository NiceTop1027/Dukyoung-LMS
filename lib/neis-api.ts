// NEIS API 관련 유틸리티 함수들

export interface NeisApiParams {
  ATPT_OFCDC_SC_CODE: string // 시도교육청코드
  SD_SCHUL_CODE: string // 표준학교코드
  AY?: string // 학년도
  SEM?: string // 학기
  GRADE?: string // 학년
  CLASS_NM?: string // 반명
  TI_FROM_YMD?: string // 시작일자
  TI_TO_YMD?: string // 종료일자
  pIndex?: number // 페이지 위치
  pSize?: number // 페이지 당 신청 건수
}

export interface TimetableData {
  ATPT_OFCDC_SC_CODE: string // 시도교육청코드
  ATPT_OFCDC_SC_NM: string // 시도교육청명
  SD_SCHUL_CODE: string // 표준학교코드
  SCHUL_NM: string // 학교명
  AY: string // 학년도
  SEM: string // 학기
  ALL_TI_YMD: string // 시간표일자
  DGHT_CRSE_SC_NM: string // 주야과정명
  ORD_SC_NM: string // 계열명
  DDDEP_NM: string // 학과명
  GRADE: string // 학년
  CLRM_NM: string // 강의실명
  CLASS_NM: string // 반명
  PERIO: string // 교시
  ITRT_CNTNT: string // 수업내용
  LOAD_DTM: string // 적재일시
}

export interface SchoolInfo {
  ATPT_OFCDC_SC_CODE: string // 시도교육청코드
  ATPT_OFCDC_SC_NM: string // 시도교육청명
  SD_SCHUL_CODE: string // 행정표준코드
  SCHUL_NM: string // 학교명
  ENG_SCHUL_NM: string // 영문학교명
  SCHUL_KND_SC_NM: string // 학교종류명
  LCTN_SC_NM: string // 시도명
  JU_ORG_NM: string // 관할조직명
  FOND_SC_NM: string // 설립명
  ORG_RDNZC: string // 도로명우편번호
  ORG_RDNMA: string // 도로명주소
  ORG_RDNDA: string // 도로명상세주소
  ORG_TELNO: string // 전화번호
  HMPG_ADRES: string // 홈페이지주소
  COEDU_SC_NM: string // 남녀공학구분명
  ORG_FAXNO: string // 팩스번호
  HS_SC_NM: string // 고등학교구분명
  INDST_SPECL_CCCCL_EXST_YN: string // 산업체특별학급존재여부
  HS_GNRL_BUSNS_SC_NM: string // 고등학교일반전문구분명
  SPCLY_PURPS_HS_ORD_NM: string // 특수목적고등학교계열명
  ENE_BFE_SEHF_SC_NM: string // 입시전후기구분명
  DGHT_SC_NM: string // 주야구분명
  FOND_YMD: string // 설립일자
  FOAS_MEMRD: string // 개교기념일
  LOAD_DTM: string // 수정일자
}

export interface NeisApiResponse {
  hisTimetable?: Array<{
    head: Array<{
      list_total_count: number
      RESULT: {
        CODE: string
        MESSAGE: string
      }
    }>
    row?: TimetableData[]
  }>
}

// NEIS API 인증키
const NEIS_API_KEY = "092c0b99009849dcb92bdc295082d806"

// 학교 정보 로드
export async function loadSchoolData(): Promise<SchoolInfo[]> {
  try {
    const response = await fetch("/school-data.json")
    if (!response.ok) {
      throw new Error("학교 데이터를 불러올 수 없습니다.")
    }
    const data = await response.json()
    // 첫 번째 항목은 헤더이므로 제외
    return data.slice(1)
  } catch (error) {
    console.error("학교 데이터 로드 실패:", error)
    return []
  }
}

// 덕영고등학교 기본 정보
export const DUKYOUNG_SCHOOL_INFO: SchoolInfo = {
  ATPT_OFCDC_SC_CODE: "J10",
  ATPT_OFCDC_SC_NM: "경기도교육청",
  SD_SCHUL_CODE: "7531328",
  SCHUL_NM: "덕영고등학교",
  ENG_SCHUL_NM: "DUKYOUNG HIGH SCHOOL",
  SCHUL_KND_SC_NM: "고등학교",
  LCTN_SC_NM: "경기도",
  JU_ORG_NM: "경기도교육청",
  FOND_SC_NM: "사립",
  ORG_RDNZC: "17151",
  ORG_RDNMA: "경기도 용인시 처인구 고림로74번길 15",
  ORG_RDNDA: "/ 덕영고등학교 (고림동/ 덕영고등학교)",
  ORG_TELNO: "031-329-4300",
  HMPG_ADRES: "dukyoung-h.goeyi.kr",
  COEDU_SC_NM: "남여공학",
  ORG_FAXNO: "031-329-4310",
  HS_SC_NM: "특성화고",
  INDST_SPECL_CCCCL_EXST_YN: "N",
  HS_GNRL_BUSNS_SC_NM: "전문계",
  SPCLY_PURPS_HS_ORD_NM: "",
  ENE_BFE_SEHF_SC_NM: "전기",
  DGHT_SC_NM: "주간",
  FOND_YMD: "19740110",
  FOAS_MEMRD: "19740110",
  LOAD_DTM: "20230615",
}

// 테스트용 더미 데이터 (API 호출 실패 시 사용)
export const DUMMY_TIMETABLE_DATA: TimetableData[] = [
  {
    ATPT_OFCDC_SC_CODE: "J10",
    ATPT_OFCDC_SC_NM: "경기도교육청",
    SD_SCHUL_CODE: "7531328",
    SCHUL_NM: "덕영고등학교",
    AY: "2024",
    SEM: "1",
    ALL_TI_YMD: formatDateForNeis(new Date()),
    DGHT_CRSE_SC_NM: "주간",
    ORD_SC_NM: "전문계",
    DDDEP_NM: "컴퓨터과",
    GRADE: "1",
    CLRM_NM: "1-1교실",
    CLASS_NM: "1",
    PERIO: "1",
    ITRT_CNTNT: "국어",
    LOAD_DTM: new Date().toISOString(),
  },
  {
    ATPT_OFCDC_SC_CODE: "J10",
    ATPT_OFCDC_SC_NM: "경기도교육청",
    SD_SCHUL_CODE: "7531328",
    SCHUL_NM: "덕영고등학교",
    AY: "2024",
    SEM: "1",
    ALL_TI_YMD: formatDateForNeis(new Date()),
    DGHT_CRSE_SC_NM: "주간",
    ORD_SC_NM: "전문계",
    DDDEP_NM: "컴퓨터과",
    GRADE: "1",
    CLRM_NM: "컴퓨터실1",
    CLASS_NM: "1",
    PERIO: "2",
    ITRT_CNTNT: "프로그래밍",
    LOAD_DTM: new Date().toISOString(),
  },
  {
    ATPT_OFCDC_SC_CODE: "J10",
    ATPT_OFCDC_SC_NM: "경기도교육청",
    SD_SCHUL_CODE: "7531328",
    SCHUL_NM: "덕영고등학교",
    AY: "2024",
    SEM: "1",
    ALL_TI_YMD: formatDateForNeis(new Date()),
    DGHT_CRSE_SC_NM: "주간",
    ORD_SC_NM: "전문계",
    DDDEP_NM: "컴퓨터과",
    GRADE: "1",
    CLRM_NM: "1-1교실",
    CLASS_NM: "1",
    PERIO: "3",
    ITRT_CNTNT: "수학",
    LOAD_DTM: new Date().toISOString(),
  },
  {
    ATPT_OFCDC_SC_CODE: "J10",
    ATPT_OFCDC_SC_NM: "경기도교육청",
    SD_SCHUL_CODE: "7531328",
    SCHUL_NM: "덕영고등학교",
    AY: "2024",
    SEM: "1",
    ALL_TI_YMD: formatDateForNeis(new Date()),
    DGHT_CRSE_SC_NM: "주간",
    ORD_SC_NM: "전문계",
    DDDEP_NM: "컴퓨터과",
    GRADE: "1",
    CLRM_NM: "1-1교실",
    CLASS_NM: "1",
    PERIO: "4",
    ITRT_CNTNT: "영어",
    LOAD_DTM: new Date().toISOString(),
  },
  {
    ATPT_OFCDC_SC_CODE: "J10",
    ATPT_OFCDC_SC_NM: "경기도교육청",
    SD_SCHUL_CODE: "7531328",
    SCHUL_NM: "덕영고등학교",
    AY: "2024",
    SEM: "1",
    ALL_TI_YMD: formatDateForNeis(new Date()),
    DGHT_CRSE_SC_NM: "주간",
    ORD_SC_NM: "전문계",
    DDDEP_NM: "컴퓨터과",
    GRADE: "1",
    CLRM_NM: "체육관",
    CLASS_NM: "1",
    PERIO: "5",
    ITRT_CNTNT: "체육",
    LOAD_DTM: new Date().toISOString(),
  },
  {
    ATPT_OFCDC_SC_CODE: "J10",
    ATPT_OFCDC_SC_NM: "경기도교육청",
    SD_SCHUL_CODE: "7531328",
    SCHUL_NM: "덕영고등학교",
    AY: "2024",
    SEM: "1",
    ALL_TI_YMD: formatDateForNeis(new Date()),
    DGHT_CRSE_SC_NM: "주간",
    ORD_SC_NM: "전문계",
    DDDEP_NM: "컴퓨터과",
    GRADE: "1",
    CLRM_NM: "컴퓨터실2",
    CLASS_NM: "1",
    PERIO: "6",
    ITRT_CNTNT: "웹디자인",
    LOAD_DTM: new Date().toISOString(),
  },
  {
    ATPT_OFCDC_SC_CODE: "J10",
    ATPT_OFCDC_SC_NM: "경기도교육청",
    SD_SCHUL_CODE: "7531328",
    SCHUL_NM: "덕영고등학교",
    AY: "2024",
    SEM: "1",
    ALL_TI_YMD: formatDateForNeis(new Date()),
    DGHT_CRSE_SC_NM: "주간",
    ORD_SC_NM: "전문계",
    DDDEP_NM: "컴퓨터과",
    GRADE: "1",
    CLRM_NM: "1-1교실",
    CLASS_NM: "1",
    PERIO: "7",
    ITRT_CNTNT: "창의적체험활동",
    LOAD_DTM: new Date().toISOString(),
  },
]

// NEIS API 호출 함수
export async function fetchTimetableFromNeis(params: NeisApiParams): Promise<TimetableData[]> {
  const baseUrl = "https://open.neis.go.kr/hub/hisTimetable"
  const queryParams = new URLSearchParams({
    KEY: NEIS_API_KEY,
    Type: "json",
    pIndex: (params.pIndex || 1).toString(),
    pSize: (params.pSize || 100).toString(),
    ATPT_OFCDC_SC_CODE: params.ATPT_OFCDC_SC_CODE,
    SD_SCHUL_CODE: params.SD_SCHUL_CODE,
    ...(params.AY && { AY: params.AY }),
    ...(params.SEM && { SEM: params.SEM }),
    ...(params.GRADE && { GRADE: params.GRADE }),
    ...(params.CLASS_NM && { CLASS_NM: params.CLASS_NM }),
    ...(params.TI_FROM_YMD && { TI_FROM_YMD: params.TI_FROM_YMD }),
    ...(params.TI_TO_YMD && { TI_TO_YMD: params.TI_TO_YMD }),
  })

  console.log("NEIS API 호출 URL:", `${baseUrl}?${queryParams}`)
  console.log("NEIS API 파라미터:", params)

  try {
    const response = await fetch(`${baseUrl}?${queryParams}`)
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`)
      return []
    }

    const data: NeisApiResponse = await response.json()
    console.log("NEIS API 응답:", data)

    // 응답 구조 안전성 검사
    if (!data || !data.hisTimetable || !Array.isArray(data.hisTimetable) || data.hisTimetable.length === 0) {
      console.log("NEIS API: 시간표 데이터가 없습니다.")
      return []
    }

    const result = data.hisTimetable[0]

    // head 배열과 RESULT 객체 존재 확인
    if (!result.head || !Array.isArray(result.head) || result.head.length === 0) {
      console.log("NEIS API: 응답 헤더가 없습니다. 더미 데이터를 사용합니다.")
      return []
    }

    const headInfo = result.head[0]
    if (!headInfo.RESULT || typeof headInfo.RESULT.CODE === "undefined") {
      console.log("NEIS API: 결과 코드가 없습니다. 더미 데이터를 사용합니다.")
      return []
    }

    // API 에러 체크
    if (headInfo.RESULT.CODE !== "INFO-000") {
      console.log(`NEIS API Error: ${headInfo.RESULT.MESSAGE || "알 수 없는 오류"}. 더미 데이터를 사용합니다.`)
      return []
    }

    const timetableData = result.row || []
    console.log(`NEIS API 성공: ${timetableData.length}개의 시간표 데이터를 받았습니다.`)

    return timetableData.length > 0 ? timetableData : []
  } catch (error) {
    console.error("NEIS API 호출 실패:", error)
    console.log("실제 API 호출 실패로 빈 배열을 반환합니다.")
    return []
  }
}

// 과거 데이터 조회 (2019-2022)
export async function fetchHistoricalTimetable(params: NeisApiParams): Promise<TimetableData[]> {
  const baseUrl = "https://open.neis.go.kr/hub/hisTimetablebgs"
  const queryParams = new URLSearchParams({
    KEY: NEIS_API_KEY,
    Type: "json",
    pIndex: (params.pIndex || 1).toString(),
    pSize: (params.pSize || 100).toString(),
    ATPT_OFCDC_SC_CODE: params.ATPT_OFCDC_SC_CODE,
    SD_SCHUL_CODE: params.SD_SCHUL_CODE,
    ...(params.AY && { AY: params.AY }),
    ...(params.SEM && { SEM: params.SEM }),
    ...(params.GRADE && { GRADE: params.GRADE }),
    ...(params.CLASS_NM && { CLASS_NM: params.CLASS_NM }),
    ...(params.TI_FROM_YMD && { TI_FROM_YMD: params.TI_FROM_YMD }),
    ...(params.TI_TO_YMD && { TI_TO_YMD: params.TI_TO_YMD }),
  })

  try {
    const response = await fetch(`${baseUrl}?${queryParams}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: NeisApiResponse = await response.json()

    // 응답 구조 안전성 검사
    if (!data || !data.hisTimetable || !Array.isArray(data.hisTimetable) || data.hisTimetable.length === 0) {
      console.log("Historical NEIS API: 시간표 데이터가 없습니다.")
      return []
    }

    const result = data.hisTimetable[0]

    // head 배열과 RESULT 객체 존재 확인
    if (!result.head || !Array.isArray(result.head) || result.head.length === 0) {
      console.log("Historical NEIS API: 응답 헤더가 없습니다.")
      return []
    }

    const headInfo = result.head[0]
    if (!headInfo.RESULT || typeof headInfo.RESULT.CODE === "undefined") {
      console.log("Historical NEIS API: 결과 코드가 없습니다.")
      return []
    }

    if (headInfo.RESULT.CODE !== "INFO-000") {
      console.log(`Historical NEIS API Error: ${headInfo.RESULT.MESSAGE || "알 수 없는 오류"}`)
      return []
    }

    return result.row || []
  } catch (error) {
    console.error("Historical NEIS API 호출 실패:", error)
    return []
  }
}

// 시간표 데이터를 요일별로 그룹화
export function groupTimetableByDay(timetableData: TimetableData[]) {
  const grouped: Record<string, TimetableData[]> = {}

  timetableData.forEach((item) => {
    const date = new Date(item.ALL_TI_YMD.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"))
    const dayOfWeek = date.getDay()
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"]
    const dayName = dayNames[dayOfWeek]

    if (!grouped[dayName]) {
      grouped[dayName] = []
    }
    grouped[dayName].push(item)
  })

  // 각 요일별로 교시 순으로 정렬
  Object.keys(grouped).forEach((day) => {
    grouped[day].sort((a, b) => Number.parseInt(a.PERIO) - Number.parseInt(b.PERIO))
  })

  return grouped
}

// 교시별 시간 매핑
export const periodTimes: Record<string, string> = {
  "1": "09:00-09:50",
  "2": "10:00-10:50",
  "3": "11:00-11:50",
  "4": "12:00-12:50",
  "5": "13:40-14:30",
  "6": "14:40-15:30",
  "7": "15:40-16:30",
  "8": "16:40-17:30",
}

// 현재 학기 계산
export function getCurrentSemester(): { year: string; semester: string } {
  const now = new Date()
  const year = now.getFullYear().toString()
  const month = now.getMonth() + 1

  // 3월-8월: 1학기, 9월-2월: 2학기
  const semester = month >= 3 && month <= 8 ? "1" : "2"

  return { year, semester }
}

// 날짜 포맷팅 (YYYYMMDD)
export function formatDateForNeis(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}${month}${day}`
}

// 이번 주 시작일과 종료일 계산
export function getThisWeekRange(): { start: string; end: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)

  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)

  return {
    start: formatDateForNeis(monday),
    end: formatDateForNeis(friday),
  }
}

// 현재 교시 계산
export function getCurrentPeriod(): string | null {
  const now = new Date()
  const currentTime = now.getHours() * 100 + now.getMinutes()

  const periods = [
    { period: "1", start: 900, end: 950 },
    { period: "2", start: 1000, end: 1050 },
    { period: "3", start: 1100, end: 1150 },
    { period: "4", start: 1200, end: 1250 },
    { period: "5", start: 1340, end: 1430 },
    { period: "6", start: 1440, end: 1530 },
    { period: "7", start: 1540, end: 1630 },
    { period: "8", start: 1640, end: 1730 },
  ]

  for (const p of periods) {
    if (currentTime >= p.start && currentTime <= p.end) {
      return p.period
    }
  }

  return null
}

// 오늘의 시간표 가져오기
export async function getTodayTimetable(classId: string, grade: string, className: string): Promise<TimetableData[]> {
  const today = formatDateForNeis(new Date())
  const { year, semester } = getCurrentSemester()

  console.log(`오늘의 시간표 조회 시작:`, {
    classId,
    grade,
    className,
    today,
    year,
    semester,
  })

  try {
    const params: NeisApiParams = {
      ATPT_OFCDC_SC_CODE: DUKYOUNG_SCHOOL_INFO.ATPT_OFCDC_SC_CODE,
      SD_SCHUL_CODE: DUKYOUNG_SCHOOL_INFO.SD_SCHUL_CODE,
      AY: year,
      SEM: semester,
      GRADE: grade,
      CLASS_NM: className,
      TI_FROM_YMD: today,
      TI_TO_YMD: today,
    }

    const result = await fetchTimetableFromNeis(params)
    console.log(`오늘의 시간표 조회 결과: ${result.length}개 항목`, result)
    return result
  } catch (error) {
    console.error("오늘의 시간표 조회 실패:", error)
    return []
  }
}
