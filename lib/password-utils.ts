// 랜덤 비밀번호 생성 유틸리티
export const generateRandomPassword = (length = 8): string => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = ""

  // 최소 요구사항: 소문자, 대문자, 숫자, 특수문자 각각 1개씩
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const numbers = "0123456789"
  const special = "!@#$%^&*"

  // 각 카테고리에서 최소 1개씩 선택
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  // 나머지 길이만큼 랜덤 선택
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }

  // 문자열 섞기
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("")
}

// 비밀번호 강도 검사
export const validatePasswordStrength = (
  password: string,
): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []

  if (password.length < 6) {
    errors.push("비밀번호는 최소 6자 이상이어야 합니다.")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("소문자를 포함해야 합니다.")
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("대문자를 포함해야 합니다.")
  }

  if (!/[0-9]/.test(password)) {
    errors.push("숫자를 포함해야 합니다.")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
