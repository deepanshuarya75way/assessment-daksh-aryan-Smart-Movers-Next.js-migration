"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"

type Order = {
  id: number
  from_address: string
  to_address: string
  package_type: string
  status: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const [lastSync, setLastSync] = useState<string>("")
  const eventSourceRef = useRef<EventSource | null>(null)
const fetchOrders = async () => {
  try {
    const res = await fetch("/api/orders");
    
    // 1. Read the stream ONLY ONCE
    const data = await res.json();
    console.log("Fetched order data:", data); // Fixed empty log

    if (res.ok) {
      // 2. Use the "data" variable we already extracted
      setOrders(Array.isArray(data) ? data : data.orders || []);
    } else {
      console.error("Server returned an error:", data.message || res.statusText);
    }
  } catch (error) {
    console.error("Failed to fetch orders:", error);
  } finally {
    setLoading(false); // Keeps loading safe even if fetch crashes
  }
};


  const connectSSE = () => {
    if (eventSourceRef.current) eventSourceRef.current.close()
    setConnectionStatus("connecting")
    const es = new EventSource("/api/orders/stream")
    eventSourceRef.current = es

    es.onopen = () => setConnectionStatus("connected")

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === "connected") {
        setConnectionStatus("connected")
        fetchOrders()
      }
      if (data.type === "update") {
        fetchOrders()
        setLastSync(new Date().toLocaleTimeString())
      }
      if (data.type === "heartbeat") {
        setLastSync(new Date().toLocaleTimeString())
      }
    }

    es.onerror = () => {
      setConnectionStatus("disconnected")
      es.close()
      setTimeout(connectSSE, 5000)
    }
  }

  useEffect(() => {
    fetchOrders()
    connectSSE()
    return () => eventSourceRef.current?.close()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Orders 📦</h1>

          {/* Connection Status */}
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow text-sm">
            <span className={`w-2 h-2 rounded-full ${
              connectionStatus === "connected" ? "bg-green-400" :
              connectionStatus === "disconnected" ? "bg-red-400" : "bg-yellow-400"
            }`}></span>
            <span className="text-gray-600 capitalize">{connectionStatus}</span>
            {lastSync && <span className="text-gray-400">· Synced {lastSync}</span>}
          </div>
        </div>

        {/* Orders */}
        {loading ? (
          <p className="text-gray-500">Loading orders...</p>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow">
            <p className="text-gray-500 mb-4">No orders yet</p>
            <button
              onClick={() => router.push("/book")}
              className="bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600"
            >
              Book a Move
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl p-6 shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">Order #{order.id}</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    order.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                    order.status === "completed" ? "bg-green-100 text-green-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">📍 From: {order.from_address}</p>
                <p className="text-sm text-gray-600">📍 To: {order.to_address}</p>
                {order.package_type && (
                  <p className="text-sm text-gray-600">📦 Package: {order.package_type}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}