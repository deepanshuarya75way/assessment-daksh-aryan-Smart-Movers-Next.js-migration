import { NextRequest } from "next/server"
import { getPool } from "@/lib/db"
import jwt from "jsonwebtoken"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value
  if (!token) return new Response("Unauthorized", { status: 401 })

  let userId: number
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number }
    userId = decoded.id
  } catch {
    return new Response("Unauthorized", { status: 401 })
  }

  const encoder = new TextEncoder()
  let lastCheck = new Date().toISOString()

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      )

      const interval = setInterval(async () => {
        try {
          const pool = getPool()
          const [orders]: any = await pool.query(
            "SELECT * FROM orders WHERE user_id = ? AND updated_at > ? ORDER BY created_at DESC",
            [userId, lastCheck]
          )
          if (orders.length > 0) {
            lastCheck = new Date().toISOString()
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "update", orders })}\n\n`)
            )
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "heartbeat", time: new Date().toISOString() })}\n\n`)
          )
        } catch {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error" })}\n\n`)
          )
        }
      }, 3000)

      req.signal.addEventListener("abort", () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}