import "dotenv/config";
import { QdrantClient } from "@qdrant/js-client-rest";

const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL
});

const REPO_URL = process.env.REPO_URL;
const COLLECTION_NAME = process.env.COLLECTION_NAME;

const url = new URL(REPO_URL);

const parts = url.pathname
    .split("/")
    .filter(Boolean);

const owner = parts[0];
const repoName = parts[1].replace(/\.git$/, "");

const repoId = `${owner}/${repoName}`;



async function deleteRepository(repoId) {
    try {
        const collections = await qdrant.getCollections();

        const exists = collections.collections.some(
            collection => collection.name === COLLECTION_NAME
        );

        if (!exists) {
            console.log(`Collection "${COLLECTION_NAME}" does not exist.`);
            return;
        }

        if (repoId) {
            await qdrant.delete(COLLECTION_NAME, {
                wait: true,
                filter: {
                    must: [
                        {
                            key: "repoId",
                            match: {
                                value: repoId
                            }
                        }
                    ]
                }
            });

            console.log(`Deletion request completed for repository: ${repoId}`);
        } else {
            await qdrant.deleteCollection(COLLECTION_NAME);
            console.log("Collection deleted successfully.");
        }
    } catch (error) {
        console.error("Vector DB cleanup Failure: ", error.message);
    }
}

deleteRepository(repoId);