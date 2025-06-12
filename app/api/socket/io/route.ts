import { type NextRequest, NextResponse } from "next/server";

// Simple endpoint to indicate Socket.IO is available
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Socket.IO endpoint available",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    message: "Socket.IO endpoint available",
    timestamp: new Date().toISOString(),
  });
}
