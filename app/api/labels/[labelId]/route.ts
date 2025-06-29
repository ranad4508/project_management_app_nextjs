import { LabelController } from "@/src/controllers/label.controller";
import Database from "@/src/config/database";

const labelController = new LabelController();

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ labelId: string }> }
) {
  await Database.connect();
  return labelController.updateLabel(req as any, { params });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ labelId: string }> }
) {
  await Database.connect();
  return labelController.deleteLabel(req as any, { params });
}
