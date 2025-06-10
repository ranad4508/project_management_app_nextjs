import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    { message: "Socket.io endpoint is working" },
    { status: 200 }
  );
}

export const dynamic = "force-dynamic";
