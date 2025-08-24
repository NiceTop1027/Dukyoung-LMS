"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useRef } from "react"
import { type User, onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { type UserProfile, getUserProfile } from "@/lib/auth-utils"
import { useFirebaseConnection } from "@/hooks/use-firebase-connection"

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  connectionError: string | null
  isConnected: boolean
  lastChecked: Date
  retryConnection: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  connectionError: null,
  isConnected: true,
  lastChecked: new Date(),
  retryConnection: async () => {},
  logout: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const { isConnected, error: connectionError, lastChecked, retryConnection } = useFirebaseConnection()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mountedRef.current) return

      setUser(user)

      if (user) {
        try {
          const profile = await getUserProfile(user.uid)
          if (mountedRef.current) {
            setUserProfile(profile)
          }
        } catch (error) {
          console.error("Failed to get user profile:", error)
          if (mountedRef.current) {
            setUserProfile(null)
          }
        }
      } else {
        if (mountedRef.current) {
          setUserProfile(null)
        }
      }

      if (mountedRef.current) {
        setLoading(false)
      }
    })

    return () => {
      mountedRef.current = false
      unsubscribe()
    }
  }, [])

  const logout = async () => {
    try {
      await signOut(auth)
      window.location.href = "/login"
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    connectionError,
    isConnected,
    lastChecked,
    retryConnection,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
