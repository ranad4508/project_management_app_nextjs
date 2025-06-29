import { LabelController } from "@/src/controllers/label.controller";
import Database from "@/src/config/database";

const labelController = new LabelController();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return labelController.getLabels(req as any, { params });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await Database.connect();
  return labelController.createLabel(req as any, { params });
}
