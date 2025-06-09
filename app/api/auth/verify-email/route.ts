import { AuthController } from "@/src/controllers/auth.controller"
import Database from "@/src/config/database"

const authController = new AuthController()

export async function POST(req: Request) {
  await Database.connect()
  return authController.verifyEmail(req as any)
}
