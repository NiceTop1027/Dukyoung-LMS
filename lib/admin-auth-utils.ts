import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "./firebase"
import type { User } from "firebase/auth"

/**
 * 관리자/교사가 다른 사용자 계정을 생성할 때 현재 세션을 유지하는 유틸리티
 */
export class AdminAccountManager {
  private originalUser: User | null = null

  /**
   * 현재 사용자 정보를 저장
   */
  saveCurrentUser() {
    this.originalUser = auth.currentUser
  }

  /**
   * 새 계정을 생성하고 원래 사용자로 세션 복원
   */
  async createUserAndRestoreSession(
    email: string,
    password: string,
    originalUserEmail: string,
    originalUserPassword?: string,
  ): Promise<User> {
    try {
      // 새 계정 생성 (이때 자동으로 해당 계정으로 로그인됨)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const newUser = userCredential.user

      // 원래 사용자로 다시 로그인하여 세션 복원
      if (this.originalUser) {
        try {
          // updateCurrentUser를 사용하여 세션 복원 시도
          await auth.updateCurrentUser(this.originalUser)
        } catch (updateError) {
          console.warn("updateCurrentUser failed, trying alternative method:", updateError)

          // updateCurrentUser가 실패하면 경고만 표시
          // 실제 운영 환경에서는 관리자가 다시 로그인해야 할 수 있음
          throw new Error("세션 복원에 실패했습니다. 페이지를 새로고침하거나 다시 로그인해주세요.")
        }
      }

      return newUser
    } catch (error) {
      console.error("Error in createUserAndRestoreSession:", error)
      throw error
    }
  }

  /**
   * 정리 작업
   */
  cleanup() {
    this.originalUser = null
  }
}

/**
 * 간단한 헬퍼 함수 - 계정 생성 후 세션 복원
 */
export async function createUserWithSessionRestore(newUserEmail: string, newUserPassword: string): Promise<User> {
  const currentUser = auth.currentUser

  if (!currentUser) {
    throw new Error("현재 로그인된 사용자가 없습니다.")
  }

  try {
    // 새 계정 생성
    const userCredential = await createUserWithEmailAndPassword(auth, newUserEmail, newUserPassword)
    const newUser = userCredential.user

    // 원래 사용자로 세션 복원
    await auth.updateCurrentUser(currentUser)

    return newUser
  } catch (error: any) {
    console.error("Error creating user with session restore:", error)

    if (error.message?.includes("updateCurrentUser")) {
      throw new Error("계정은 생성되었지만 세션 복원에 실패했습니다. 페이지를 새로고침해주세요.")
    }

    throw error
  }
}
