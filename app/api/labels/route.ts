import { LabelController } from "@/src/controllers/label.controller";
import Database from "@/src/config/database";

const labelController = new LabelController();

export async function POST(req: Request) {
  await Database.connect();
  return labelController.createLabel(req as any);
}
