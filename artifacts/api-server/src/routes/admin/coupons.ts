import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, couponsTable } from "@workspace/db";
import {
  AdminListCouponsResponse,
  AdminCreateCouponBody,
  AdminCreateCouponResponse,
  AdminGetCouponParams,
  AdminGetCouponResponse,
  AdminUpdateCouponParams,
  AdminUpdateCouponBody,
  AdminUpdateCouponResponse,
  AdminDeleteCouponParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/coupons", async (_req, res): Promise<void> => {
  const coupons = await db.select().from(couponsTable).orderBy(desc(couponsTable.createdAt));
  res.json(AdminListCouponsResponse.parse(coupons));
});

router.post("/coupons", async (req, res): Promise<void> => {
  const body = AdminCreateCouponBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db.select({ id: couponsTable.id }).from(couponsTable).where(eq(couponsTable.code, body.data.code.trim().toUpperCase()));
  if (existing) {
    res.status(409).json({ error: "That coupon code is already in use." });
    return;
  }

  const [coupon] = await db
    .insert(couponsTable)
    .values({ ...body.data, code: body.data.code.trim().toUpperCase() })
    .returning();
  res.status(201).json(AdminCreateCouponResponse.parse(coupon));
});

router.get("/coupons/:id", async (req, res): Promise<void> => {
  const params = AdminGetCouponParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.id, params.data.id));
  if (!coupon) {
    res.status(404).json({ error: "Coupon not found" });
    return;
  }
  res.json(AdminGetCouponResponse.parse(coupon));
});

router.put("/coupons/:id", async (req, res): Promise<void> => {
  const params = AdminUpdateCouponParams.safeParse({ id: parseFloat(req.params.id) });
  const body = AdminUpdateCouponBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error!.message });
    return;
  }

  const [existing] = await db.select().from(couponsTable).where(eq(couponsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Coupon not found" });
    return;
  }

  const [coupon] = await db
    .update(couponsTable)
    .set({ ...body.data, code: body.data.code.trim().toUpperCase(), updatedAt: new Date() })
    .where(eq(couponsTable.id, params.data.id))
    .returning();
  res.json(AdminUpdateCouponResponse.parse(coupon));
});

router.delete("/coupons/:id", async (req, res): Promise<void> => {
  const params = AdminDeleteCouponParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(couponsTable).where(eq(couponsTable.id, params.data.id)).returning({ id: couponsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Coupon not found" });
    return;
  }
  res.status(204).send();
});

export default router;
