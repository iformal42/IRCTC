import { Router } from "express";
import {
  autoComplete,
  searchStation,
} from "../controllers/search.controller.js";

const router = Router();

router.route("/station").get(searchStation);
router.route("/auto-complete/station").get(autoComplete);

export default router;
