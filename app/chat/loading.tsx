import { Card, CardContent } from "@/components/ui/card"
import { MessageCircle } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card>
        <CardContent className="p-8 text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">채팅을 불러오는 중...</p>
        </CardContent>
      </Card>
    </div>
  )
}
