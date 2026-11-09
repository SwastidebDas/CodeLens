import { deleteRepository } from "../services/dbcleanup.js";

export async function quadrantCleanupController(req, res) {
    try {
        const { repoId } = req.body;

        if (!repoId || typeof repoId !== "string") {
            return res.status(400).json({
                error: "Repository Id is required to complete cleanup."
            });
        }

        const result = await deleteRepository(repoId);

        return res.status(201).json({
            message: "Repository Deleted successfully."
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Failed to Delete repository records."
        });
    }
}
