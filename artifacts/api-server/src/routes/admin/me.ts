import { Router, type IRouter } from "express";
import { GetAdminMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// requireAdmin (applied by the parent admin router) has already verified the
// token and loaded req.admin — reaching this handler at all confirms admin
// access, which is exactly what the frontend uses this endpoint for.
router.get("/me", (req, res): void => {
  res.json(GetAdminMeResponse.parse(req.admin));
});

export default router;
