import { Router } from "express";
import { ingestController } from "../controllers/ingestionController.js";

const ingestionRouter = Router();

ingestionRouter.post("/ingest", ingestController);

export default ingestionRouter;