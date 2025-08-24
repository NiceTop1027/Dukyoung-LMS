"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { CollectionReference, Query, DocumentData, Unsubscribe } from "firebase/firestore"
import { onSnapshot } from "firebase/firestore"

// 캐시 관리 클래스
class DataCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private static instance: DataCache

  static getInstance(): DataCache {
    if (!DataCache.instance) {
      DataCache.instance = new DataCache()
    }
    return DataCache.instance
  }

  set(key: string, data: any, ttl = 300000): void {
    // 기본 5분 TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  get(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }
}

// 실시간 데이터 관리 클래스
export class RealtimeDataManager<T = DocumentData> {
  private unsubscribe: Unsubscribe | null = null
  private cache = DataCache.getInstance()
  private cacheKey: string
  private isStatic: boolean
  private lastDataString = "" // 이전 데이터의 문자열 표현
  private isProcessing = false // 처리 중 플래그

  constructor(
    private collectionRef: CollectionReference | Query,
    private onData: (data: T[]) => void,
    private onError: (error: string) => void,
    private transform?: (data: DocumentData) => T,
    private options: {
      useCache?: boolean
      cacheTTL?: number
      isStatic?: boolean
    } = {},
  ) {
    this.cacheKey = this.generateCacheKey()
    this.isStatic = options.isStatic || false
  }

  private generateCacheKey(): string {
    // Date.now() 제거하여 안정적인 캐시 키 생성
    const path = "path" in this.collectionRef ? this.collectionRef.path : "query"
    return `firestore_${path}`
  }

  start(): void {
    if (this.unsubscribe) return

    // 정적 데이터이고 캐시가 있으면 캐시 사용
    if (this.isStatic && this.options.useCache) {
      const cachedData = this.cache.get(this.cacheKey)
      if (cachedData) {
        this.onData(cachedData)
        return
      }
    }

    console.log("Starting realtime listener for:", this.cacheKey)

    // 실시간 리스너 설정
    this.unsubscribe = onSnapshot(
      this.collectionRef,
      (snapshot) => {
        // 이미 처리 중이면 무시
        if (this.isProcessing) return
        this.isProcessing = true

        try {
          const data = snapshot.docs.map((doc) => {
            const docData = { id: doc.id, ...doc.data() }
            return this.transform ? this.transform(docData) : (docData as T)
          })

          console.log(`Received ${data.length} documents from ${this.cacheKey}`)

          // 데이터 변경 여부 확인
          const currentDataString = JSON.stringify(data)
          if (currentDataString !== this.lastDataString) {
            this.lastDataString = currentDataString

            // 캐시 저장 (정적 데이터인 경우)
            if (this.isStatic && this.options.useCache) {
              this.cache.set(this.cacheKey, data, this.options.cacheTTL)
            }

            // 비동기로 onData 호출하여 동기 처리 방지
            setTimeout(() => {
              this.onData(data)
            }, 0)
          }
        } catch (error) {
          console.error("Error processing snapshot:", error)
          // 처리 오류 시 빈 배열 반환
          setTimeout(() => {
            this.onData([])
          }, 0)
        } finally {
          this.isProcessing = false
        }
      },
      (error) => {
        console.log("Firestore error (suppressed):", error.code)
        // 모든 오류를 조용히 처리하고 빈 배열 반환
        setTimeout(() => {
          this.onData([])
        }, 0)
      },
    )
  }

  stop(): void {
    if (this.unsubscribe) {
      console.log("Stopping realtime listener for:", this.cacheKey)
      this.unsubscribe()
      this.unsubscribe = null
    }
    this.isProcessing = false
  }

  clearCache(): void {
    this.cache.clear(this.cacheKey)
  }
}

export function useRealtimeData<T = DocumentData>(
  collectionRef: CollectionReference | Query | null,
  transform?: (data: DocumentData) => T,
  options: {
    useCache?: boolean
    cacheTTL?: number
    isStatic?: boolean
  } = {},
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const managerRef = useRef<RealtimeDataManager<T> | null>(null)
  const mountedRef = useRef(true)
  const collectionRefString = useRef<string>("")

  // collectionRef를 문자열로 변환하여 실제 변경 감지
  const currentRefString = collectionRef
    ? JSON.stringify({
        path: "path" in collectionRef ? collectionRef.path : "query",
        type: collectionRef.type || "collection",
      })
    : "null"

  useEffect(() => {
    mountedRef.current = true

    // collectionRef가 실제로 변경되지 않았으면 무시
    if (collectionRefString.current === currentRefString) {
      return
    }

    collectionRefString.current = currentRefString

    // 이전 매니저 정리
    if (managerRef.current) {
      managerRef.current.stop()
      managerRef.current = null
    }

    if (!collectionRef) {
      setLoading(false)
      setData([])
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    // 콜백 함수들을 useEffect 내부에서 정의
    const handleData = (newData: T[]) => {
      if (!mountedRef.current) return
      console.log("Setting data:", newData.length, "items")
      setData(newData)
      setLoading(false)
      setError(null)
    }

    const handleError = (errorMessage: string) => {
      console.log("Handling error (suppressed):", errorMessage)
      // 모든 오류를 무시하고 빈 배열 설정
      if (!mountedRef.current) return
      setData([])
      setLoading(false)
      setError(null)
    }

    const newManager = new RealtimeDataManager(collectionRef, handleData, handleError, transform, options)
    managerRef.current = newManager
    newManager.start()

    return () => {
      mountedRef.current = false
      if (managerRef.current) {
        managerRef.current.stop()
        managerRef.current = null
      }
    }
  }, [currentRefString]) // 문자열화된 collectionRef만 의존성으로 설정

  const refresh = useCallback(() => {
    if (managerRef.current && collectionRef && mountedRef.current) {
      console.log("Manual refresh triggered")
      setLoading(true)
      setError(null)
      managerRef.current.clearCache()
      managerRef.current.stop()
      managerRef.current.start()
    }
  }, [collectionRef])

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    data,
    loading,
    error,
    refresh,
  }
}

// 기존 폴링 훅과의 호환성을 위한 별칭
export const usePollingData = useRealtimeData
