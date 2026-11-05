
import { ingest } from "../services/ingest.js";

export async function ingestController(req, res) {
    try {
        const { repoUrl } = req.body;

        if (!repoUrl || typeof repoUrl !== "string") {
            return res.status(400).json({
                error: "Repository URL is required."
            });
        }

        const result = await ingest(repoUrl);

        return res.status(201).json({
            message: "Repository ingested successfully.",
            repoId: result.repoId
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Failed to ingest repository."
        });
    }
}
