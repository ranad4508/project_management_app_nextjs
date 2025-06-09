import { WorkspaceController } from "@/src/controllers/workspace.controller"
import Database from "@/src/config/database"

const workspaceController = new WorkspaceController()

// Update a member's role
// export async function PUT(req: NextRequest, { params }: { params: { id: string; userId: string } }) {
//   try {
//     const session = await getServerSession(authOptions)

//     if (!session || !session.user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
//     }

//     const { id, userId } = params
//     const { role } = await req.json()

//     if (!["admin", "member", "guest"].includes(role)) {
//       return NextResponse.json({ error: "Invalid role" }, { status: 400 })
//     }

//     await connectDB()

//     // Check if user has permission to update roles
//     const workspace = await Workspace.findOne({
//       _id: id,
//       "members.user": session.user.id,
//     })

//     if (!workspace) {
//       return NextResponse.json({ error: "Workspace not found or you do not have access" }, { status: 404 })
//     }

//     // Check if current user is admin or owner
//     const currentUserMember = workspace.members.find((member) => member.user.toString() === session.user.id)

//     if (!currentUserMember || (currentUserMember.role !== "admin" && workspace.owner.toString() !== session.user.id)) {
//       return NextResponse.json({ error: "You do not have permission to update member roles" }, { status: 403 })
//     }

//     // Check if target user is the owner
//     if (workspace.owner.toString() === userId) {
//       return NextResponse.json({ error: "Cannot change the role of the workspace owner" }, { status: 403 })
//     }

//     // Update member role
//     const memberIndex = workspace.members.findIndex((member) => member.user.toString() === userId)

//     if (memberIndex === -1) {
//       return NextResponse.json({ error: "Member not found in this workspace" }, { status: 404 })
//     }

//     workspace.members[memberIndex].role = role
//     await workspace.save()

//     return NextResponse.json({ message: "Member role updated successfully" }, { status: 200 })
//   } catch (error) {
//     console.error("Update member role error:", error)
//     return NextResponse.json({ error: "An error occurred while updating the member role" }, { status: 500 })
//   }
// }

export async function PUT(req: Request, { params }: { params: { id: string; userId: string } }) {
  await Database.connect()
  return workspaceController.updateMemberRole(req as any, { params })
}

// Remove a member from the workspace
// export async function DELETE(req: NextRequest, { params }: { params: { id: string; userId: string } }) {
//   try {
//     const session = await getServerSession(authOptions)

//     if (!session || !session.user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
//     }

//     const { id, userId } = params

//     await connectDB()

//     // Check if user has permission to remove members
//     const workspace = await Workspace.findOne({
//       _id: id,
//       "members.user": session.user.id,
//     })

//     if (!workspace) {
//       return NextResponse.json({ error: "Workspace not found or you do not have access" }, { status: 404 })
//     }

//     // Check if target user is the owner
//     if (workspace.owner.toString() === userId) {
//       return NextResponse.json({ error: "Cannot remove the workspace owner" }, { status: 403 })
//     }

//     // Check if current user is admin, owner, or removing themselves
//     const currentUserMember = workspace.members.find((member) => member.user.toString() === session.user.id)

//     const isSelfRemoval = session.user.id === userId

//     if (
//       !isSelfRemoval &&
//       (!currentUserMember || (currentUserMember.role !== "admin" && workspace.owner.toString() !== session.user.id))
//     ) {
//       return NextResponse.json({ error: "You do not have permission to remove members" }, { status: 403 })
//     }

//     // Remove member
//     workspace.members = workspace.members.filter((member) => member.user.toString() !== userId)

//     await workspace.save()

//     return NextResponse.json({ message: "Member removed successfully" }, { status: 200 })
//   } catch (error) {
//     console.error("Remove member error:", error)
//     return NextResponse.json({ error: "An error occurred while removing the member" }, { status: 500 })
//   }
// }

export async function DELETE(req: Request, { params }: { params: { id: string; userId: string } }) {
  await Database.connect()
  return workspaceController.removeMember(req as any, { params })
}
