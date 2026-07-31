import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import podcastRouter from "./podcast";
import blogRouter from "./blog";
import curatedRouter from "./curated";
import newsletterRouter from "./newsletter";
import collaborationsRouter from "./collaborations";
import contactRouter from "./contact";
import homepageRouter from "./homepage";
import siteSettingsRouter from "./site-settings";
import homepageContentRouter from "./homepage-content";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(podcastRouter);
router.use(blogRouter);
router.use(curatedRouter);
router.use(newsletterRouter);
router.use(collaborationsRouter);
router.use(contactRouter);
router.use(homepageRouter);
router.use(siteSettingsRouter);
router.use(homepageContentRouter);
router.use("/admin", adminRouter);

export default router;
