export const runtime = 'nodejs'
import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db" 
import jwt from "jsonwebtoken"

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Verify token
    const { id: userId } = jwt.verify(token, process.env.JWT_SECRET!) as { id: number }
    
    const { from_address, to_address, package_type } = await req.json()
    
    // FIX: Execute getPool() as a function before calling .query()
    const pool = typeof getPool === 'function' ? getPool() : (getPool as any);
    
    await pool.query(
      "INSERT INTO orders (user_id, from_address, to_address, package_type) VALUES (?, ?, ?, ?)",
      [userId, from_address, to_address, package_type]
    )
    
    return NextResponse.json({ message: "Order placed!" }, { status: 201 })
  } catch (error) {
    console.error("POST Order Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Verify token safely
    const { id: userId } = jwt.verify(token, process.env.JWT_SECRET!) as { id: number }
    console.log("Fetching orders for user ID:", userId) 

    // FIX: Execute getPool() as a function before calling .query()
    const pool = typeof getPool === 'function' ? getPool() : (getPool as any);

    const [rows]: any = await pool.query(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    )
    
    // Ensure rows is always returned as an array to the frontend
    return NextResponse.json({ orders: rows || [] })
    
  } catch (error) {
    console.error("GET Orders Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
