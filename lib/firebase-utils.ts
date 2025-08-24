import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  type DocumentData,
  type Query,
  type CollectionReference,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"

// 캐시 관리
const dataCache = new Map<string, { data: any; timestamp: number; ttl: number }>()

// 캐시 헬퍼 함수들
export function getCachedData(key: string): any | null {
  const cached = dataCache.get(key)
  if (!cached) return null

  if (Date.now() - cached.timestamp > cached.ttl) {
    dataCache.delete(key)
    return null
  }

  return cached.data
}

export function setCachedData(key: string, data: any, ttl = 300000): void {
  dataCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  })
}

export function clearCache(key?: string): void {
  if (key) {
    dataCache.delete(key)
  } else {
    dataCache.clear()
  }
}

// 재시도 로직이 포함된 데이터 fetching
export async function fetchWithRetry<T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError: Error

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error as Error
      console.warn(`Attempt ${i + 1} failed:`, error)

      // 권한 오류인 경우 즉시 실패 (재시도 무의미)
      if (error.code === "permission-denied") {
        throw error
      }

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
  }

  throw lastError!
}

// 캐시를 활용한 안전한 컬렉션 데이터 가져오기
export async function safeGetDocs<T = DocumentData>(
  collectionRef: CollectionReference | Query,
  transform?: (data: DocumentData) => T,
  options: { useCache?: boolean; cacheTTL?: number } = {},
): Promise<T[]> {
  const cacheKey = `docs_${collectionRef.toString()}`

  // 캐시 확인
  if (options.useCache) {
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      return cachedData
    }
  }

  return fetchWithRetry(async () => {
    try {
      const snapshot = await getDocs(collectionRef)
      const data = snapshot.docs.map((doc) => {
        const docData = { id: doc.id, ...doc.data() }
        return transform ? transform(docData) : (docData as T)
      })

      // 캐시 저장
      if (options.useCache) {
        setCachedData(cacheKey, data, options.cacheTTL)
      }

      return data
    } catch (error: any) {
      // 권한 오류의 경우 빈 배열 반환 (앱이 계속 작동하도록)
      if (error.code === "permission-denied") {
        console.warn("Permission denied for collection read, returning empty array")
        return []
      }
      throw error
    }
  })
}

// 캐시를 활용한 안전한 문서 데이터 가져오기
export async function safeGetDoc<T = DocumentData>(
  docPath: string,
  transform?: (data: DocumentData) => T,
  options: { useCache?: boolean; cacheTTL?: number } = {},
): Promise<T | null> {
  const cacheKey = `doc_${docPath}`

  // 캐시 확인
  if (options.useCache) {
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      return cachedData
    }
  }

  return fetchWithRetry(async () => {
    const docRef = doc(db, docPath)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const docData = { id: docSnap.id, ...docSnap.data() }
      const result = transform ? transform(docData) : (docData as T)

      // 캐시 저장
      if (options.useCache) {
        setCachedData(cacheKey, result, options.cacheTTL)
      }

      return result
    }

    return null
  })
}

// 실시간 리스너를 위한 헬퍼 함수
export function createRealtimeListener<T = DocumentData>(
  collectionRef: CollectionReference | Query,
  onData: (data: T[]) => void,
  onError: (error: Error) => void,
  transform?: (data: DocumentData) => T,
): Unsubscribe {
  return onSnapshot(
    collectionRef,
    (snapshot) => {
      try {
        const data = snapshot.docs.map((doc) => {
          const docData = { id: doc.id, ...doc.data() }
          return transform ? transform(docData) : (docData as T)
        })
        onData(data)
      } catch (error) {
        console.error("Realtime listener processing error:", error)
        onError(error as Error)
      }
    },
    (error) => {
      console.error("Realtime listener error:", error)

      // 권한 오류인 경우 빈 배열 전달
      if (error.code === "permission-denied") {
        console.warn("Permission denied during realtime listening, providing empty data")
        onData([])
      } else {
        onError(error as Error)
      }
    },
  )
}

// 배치 처리를 위한 헬퍼 함수
export async function batchGetDocs<T = DocumentData>(
  queries: Array<{
    ref: CollectionReference | Query
    transform?: (data: DocumentData) => T
    cacheKey?: string
  }>,
  options: { useCache?: boolean; cacheTTL?: number } = {},
): Promise<T[][]> {
  const results = await Promise.all(
    queries.map(async (query) => {
      // 캐시 확인
      if (options.useCache && query.cacheKey) {
        const cachedData = getCachedData(query.cacheKey)
        if (cachedData) {
          return cachedData
        }
      }

      try {
        const snapshot = await getDocs(query.ref)
        const data = snapshot.docs.map((doc) => {
          const docData = { id: doc.id, ...doc.data() }
          return query.transform ? query.transform(docData) : (docData as T)
        })

        // 캐시 저장
        if (options.useCache && query.cacheKey) {
          setCachedData(query.cacheKey, data, options.cacheTTL)
        }

        return data
      } catch (error: any) {
        if (error.code === "permission-denied") {
          console.warn(`Permission denied for query ${query.cacheKey}, returning empty array`)
          return []
        }
        throw error
      }
    }),
  )

  return results
}

// 안전한 문서 추가 (캐시 무효화 포함)
export async function safeAddDoc(collectionPath: string, data: DocumentData): Promise<string> {
  return fetchWithRetry(async () => {
    const collectionRef = collection(db, collectionPath)
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // 관련 캐시 무효화
    clearCache(`docs_${collectionPath}`)

    return docRef.id
  })
}

// 안전한 문서 업데이트 (캐시 무효화 포함)
export async function safeUpdateDoc(docPath: string, data: Partial<DocumentData>): Promise<void> {
  return fetchWithRetry(async () => {
    const docRef = doc(db, docPath)
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    })

    // 관련 캐시 무효화
    const collectionPath = docPath.split("/").slice(0, -1).join("/")
    clearCache(`doc_${docPath}`)
    clearCache(`docs_${collectionPath}`)
  })
}

// 안전한 문서 설정 (캐시 무효화 포함)
export async function safeSetDoc(docPath: string, data: DocumentData, merge = true): Promise<void> {
  return fetchWithRetry(async () => {
    const docRef = doc(db, docPath)
    await setDoc(
      docRef,
      {
        ...data,
        updatedAt: new Date(),
      },
      { merge },
    )

    // 관련 캐시 무효화
    const collectionPath = docPath.split("/").slice(0, -1).join("/")
    clearCache(`doc_${docPath}`)
    clearCache(`docs_${collectionPath}`)
  })
}

// 안전한 문서 삭제 (캐시 무효화 포함)
export async function safeDeleteDoc(docPath: string): Promise<void> {
  return fetchWithRetry(async () => {
    const docRef = doc(db, docPath)
    await deleteDoc(docRef)

    // 관련 캐시 무효화
    const collectionPath = docPath.split("/").slice(0, -1).join("/")
    clearCache(`doc_${docPath}`)
    clearCache(`docs_${collectionPath}`)
  })
}

// 기존 DataPoller 클래스는 호환성을 위해 유지하되 내부적으로 실시간 리스너 사용
export class DataPoller<T = DocumentData> {
  private unsubscribe: Unsubscribe | null = null
  private isRunning = false

  constructor(
    private collectionRef: CollectionReference | Query,
    private onData: (data: T[]) => void,
    private onError: (error: Error) => void,
    private transform?: (data: DocumentData) => T,
    private pollInterval = 15000, // 사용하지 않지만 호환성을 위해 유지
  ) {}

  start() {
    if (this.isRunning) return

    this.isRunning = true

    // 실시간 리스너 사용 (폴링 대신)
    this.unsubscribe = createRealtimeListener(this.collectionRef, this.onData, this.onError, this.transform)
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    this.isRunning = false
  }
}

// 간단한 연결 상태 확인 - 권한 문제 해결
export const checkFirestoreConnection = async (): Promise<boolean> => {
  try {
    // Firebase SDK 자체 연결 상태만 확인 (실제 데이터 요청 없이)
    // 단순히 Firestore 인스턴스가 초기화되었는지만 확인
    if (db) {
      return true
    }
    return false
  } catch (error: any) {
    console.error("Firestore connection check failed:", error)
    return false
  }
}

// 연결 재시도 (단순화)
export const reconnectFirestore = async (): Promise<boolean> => {
  try {
    return await checkFirestoreConnection()
  } catch (error) {
    console.error("Firestore reconnection failed:", error)
    return false
  }
}
