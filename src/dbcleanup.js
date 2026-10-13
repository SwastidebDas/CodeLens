import "dotenv/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import readline from "node:readline/promises";

const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL
});

const REPO_URL = process.env.REPO_URL;
const COLLECTION_NAME = process.env.COLLECTION_NAME;

const reponame = new URL(REPO_URL)
    .pathname
    .split("/")
    .filter(Boolean)
    .pop()
    .replace(/\.git$/, "");


async function deleteRepository(repoName) {
    if (repoName) {
        // Delete only the specified repository's records
        await qdrant.delete(COLLECTION_NAME, {
            wait: true,
            filter: {
                must: [
                    {
                        key: "repoName",
                        match: {
                            value: repoName
                        }
                    }
                ]
            }
        });

        console.log(`Deleted records for repository: ${repoName}`);
    } else {
        // No repoName supplied: clear the entire collection
        // const rl = readline.createInterface({
        //     input: process.stdin,
        //     output: process.stdout
        // });

        // const answer = await rl.question(
        //     `WARNING: This will delete ALL records in "${COLLECTION_NAME}". Continue? (yes/no): `
        // );

        // rl.close();

        // if (answer.trim().toLowerCase() !== "yes") {
        //     console.log("Deletion cancelled.");
        //     return;
        // }

        await qdrant.deleteCollection(COLLECTION_NAME);

        console.log("Collection deleted successfully.");
    }
}

// const repoName = process.argv[2];

// try {
//     await deleteRepository(repoName);
// } catch (error) {
//     console.error("Deletion failed:", error.message);
//     process.exitCode = 1;
// }

deleteRepository();