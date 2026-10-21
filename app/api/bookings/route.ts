import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import jwt from "jsonwebtoken"

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = jwt.verify(
      token, process.env.JWT_SECRET!
    ) as { id: number }

    const { from_address, to_address, package_type } = await req.json()

    if (!from_address || !to_address || !package_type)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    const [result]: any = await getPool().query(
      `INSERT INTO orders
       (user_id, from_address, to_address, package_type, status)
       VALUES (?, ?, ?, ?, ?)`,
      [id, from_address, to_address, package_type, "Pending"]
    )

    return NextResponse.json(
      { success: true, id: result.insertId },
      { status: 201 }
    )
  } catch (error) {
    console.error("Booking error:", error)
    return NextResponse.json({ error: "Failed to save booking" }, { status: 500 })
  }
}