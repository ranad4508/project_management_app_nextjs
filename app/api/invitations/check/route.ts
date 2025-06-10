import { type NextRequest, NextResponse } from "next/server";
import { Invitation } from "@/src/models/invitation";
import Database from "@/src/config/database";
import { InvitationStatus } from "@/src/enums/invitation.enum";

export async function GET(req: NextRequest) {
  try {
    await Database.connect();

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Token is required",
        },
        { status: 400 }
      );
    }

    const invitation = await Invitation.findOne({
      token,
      status: InvitationStatus.PENDING,
    }).populate("workspace", "name");

    if (!invitation || invitation.isExpired()) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired invitation",
        },
        { status: 404 }
      );
    }

    const workspace = invitation.workspace as any;

    return NextResponse.json({
      success: true,
      data: {
        email: invitation.email,
        workspaceName: workspace.name,
        role: invitation.role,
        token,
      },
    });
  } catch (error) {
    console.error("Check invitation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
