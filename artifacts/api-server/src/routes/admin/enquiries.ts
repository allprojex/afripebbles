import { Router, type IRouter } from "express";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { db, contactEnquiriesTable, collaborationEnquiriesTable } from "@workspace/db";
import {
  AdminListContactEnquiriesQueryParams,
  AdminListContactEnquiriesResponse,
  AdminUpdateContactEnquiryParams,
  AdminUpdateContactEnquiryBody,
  AdminUpdateContactEnquiryResponse,
  AdminListCollaborationEnquiriesQueryParams,
  AdminListCollaborationEnquiriesResponse,
  AdminUpdateCollaborationEnquiryParams,
  AdminUpdateCollaborationEnquiryBody,
  AdminUpdateCollaborationEnquiryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/contact-enquiries", async (req, res): Promise<void> => {
  const query = AdminListContactEnquiriesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.status) {
    conditions.push(eq(contactEnquiriesTable.status, query.data.status));
  }
  if (query.data.inquiryType) {
    conditions.push(eq(contactEnquiriesTable.inquiryType, query.data.inquiryType));
  }
  if (query.data.search) {
    conditions.push(
      or(
        ilike(contactEnquiriesTable.name, `%${query.data.search}%`),
        ilike(contactEnquiriesTable.email, `%${query.data.search}%`),
        ilike(contactEnquiriesTable.message, `%${query.data.search}%`),
      ),
    );
  }

  const enquiries = await db
    .select()
    .from(contactEnquiriesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(contactEnquiriesTable.createdAt));

  res.json(AdminListContactEnquiriesResponse.parse(enquiries));
});

router.patch("/contact-enquiries/:id", async (req, res): Promise<void> => {
  const params = AdminUpdateContactEnquiryParams.safeParse({ id: parseFloat(req.params.id) });
  const body = AdminUpdateContactEnquiryBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error!.message });
    return;
  }

  const [enquiry] = await db
    .update(contactEnquiriesTable)
    .set(body.data)
    .where(eq(contactEnquiriesTable.id, params.data.id))
    .returning();

  if (!enquiry) {
    res.status(404).json({ error: "Enquiry not found" });
    return;
  }

  res.json(AdminUpdateContactEnquiryResponse.parse(enquiry));
});

router.get("/collaboration-enquiries", async (req, res): Promise<void> => {
  const query = AdminListCollaborationEnquiriesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.status) {
    conditions.push(eq(collaborationEnquiriesTable.status, query.data.status));
  }
  if (query.data.search) {
    conditions.push(
      or(
        ilike(collaborationEnquiriesTable.name, `%${query.data.search}%`),
        ilike(collaborationEnquiriesTable.email, `%${query.data.search}%`),
        ilike(collaborationEnquiriesTable.message, `%${query.data.search}%`),
      ),
    );
  }

  const enquiries = await db
    .select()
    .from(collaborationEnquiriesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(collaborationEnquiriesTable.createdAt));

  res.json(AdminListCollaborationEnquiriesResponse.parse(enquiries));
});

router.patch("/collaboration-enquiries/:id", async (req, res): Promise<void> => {
  const params = AdminUpdateCollaborationEnquiryParams.safeParse({ id: parseFloat(req.params.id) });
  const body = AdminUpdateCollaborationEnquiryBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error!.message });
    return;
  }

  const [enquiry] = await db
    .update(collaborationEnquiriesTable)
    .set(body.data)
    .where(eq(collaborationEnquiriesTable.id, params.data.id))
    .returning();

  if (!enquiry) {
    res.status(404).json({ error: "Enquiry not found" });
    return;
  }

  res.json(AdminUpdateCollaborationEnquiryResponse.parse(enquiry));
});

export default router;
