import { Router, type IRouter } from "express";
import { db, contactEnquiriesTable } from "@workspace/db";
import {
  SubmitContactEnquiryBody,
  SubmitContactEnquiryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/contact-enquiries", async (req, res): Promise<void> => {
  const parsed = SubmitContactEnquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!parsed.data.consentGiven) {
    res.status(400).json({ error: "Consent is required to submit this form." });
    return;
  }

  const [enquiry] = await db
    .insert(contactEnquiriesTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(SubmitContactEnquiryResponse.parse(enquiry));
});

export default router;
