import {askController} from "../controllers/askController.js"
import {Router} from "express"

const askRouter= Router();

askRouter.post("/ask",askController);

export default askRouter;