import { Router, type IRouter } from "express";
import { requireAdmin } from "../../middlewares/auth";
import meRouter from "./me";
import dashboardRouter from "./dashboard";
import productsRouter from "./products";
import podcastRouter from "./podcast";
import blogRouter from "./blog";
import curatedRouter from "./curated";
import ugcRouter from "./ugc";
import testimonialsRouter from "./testimonials";
import homepageRouter from "./homepage";
import settingsRouter from "./settings";
import enquiriesRouter from "./enquiries";
import newsletterRouter from "./newsletter";
import uploadsRouter from "./uploads";

const router: IRouter = Router();

// Every admin route requires a verified admin bearer token — enforced here,
// not just by hiding admin nav links in the frontend.
router.use(requireAdmin);

router.use(meRouter);
router.use(dashboardRouter);
router.use(productsRouter);
router.use(podcastRouter);
router.use(blogRouter);
router.use(curatedRouter);
router.use(ugcRouter);
router.use(testimonialsRouter);
router.use(homepageRouter);
router.use(settingsRouter);
router.use(enquiriesRouter);
router.use(newsletterRouter);
router.use(uploadsRouter);

export default router;
