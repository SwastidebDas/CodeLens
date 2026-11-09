import {quadrantCleanupController} from "../controllers/quadrantCleanupController.js"
import {Router} from "express"

const cleanUpRouter= Router();

cleanUpRouter.post("/cleanup",quadrantCleanupController);

export default cleanUpRouter;