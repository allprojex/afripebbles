import { Router, type IRouter } from "express";
import { db, collaborationEnquiriesTable } from "@workspace/db";
import {
  SubmitCollaborationEnquiryBody,
  SubmitCollaborationEnquiryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/collaboration-enquiries", async (req, res): Promise<void> => {
  const parsed = SubmitCollaborationEnquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [enquiry] = await db
    .insert(collaborationEnquiriesTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(SubmitCollaborationEnquiryResponse.parse(enquiry));
});

export default router;
