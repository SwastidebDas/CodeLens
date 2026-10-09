import "dotenv/config";
import fs from "fs";
import path from "path";
import { execSync } from "child_process"; //this helps to run the shell on local computer
import { QdrantClient } from "@qdrant/js-client-rest";
import { OllamaEmbeddings } from "@langchain/ollama";

const REPO_URL = process.env.REPO_URL;
const QDRANT_URL = process.env.QDRANT_URL;
const COLLECTION_NAME = process.env.COLLECTION_NAME;

const REPO_DIR = "./repo";

const repoName = new URL(REPO_URL)
    .pathname
    .split("/")
    .filter(Boolean)
    .pop()
    .replace(/\.git$/, "");

const qdrant = new QdrantClient({
    url: QDRANT_URL
});

const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text"
});


// ------------------------------------
// 1. Clone repository
// ------------------------------------

function cloneRepository() {

    if (fs.existsSync(REPO_DIR)) {
        console.log("Repository already exists.");
        return;
    }

    console.log("Cloning repository...");

    execSync(
        `git clone ${REPO_URL} ${REPO_DIR}`,
        { stdio: "inherit" }// this helps to see the live git clone status over the terminal of ur code
    );

    console.log("Repository cloned.");
}


// ------------------------------------
// 2. Read files recursively
// ------------------------------------

function getFiles(dir) {

    let files = [];

    const entries = fs.readdirSync(dir);

    for (const entry of entries) {

        const fullPath = path.join(dir, entry);

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {

            if (
                entry === "node_modules" ||
                entry === ".git" ||
                entry === "dist" ||
                entry === "build" ||
                entry === "bin" ||
                entry === "obj"
            ) {
                continue;
            }

            files = files.concat(getFiles(fullPath));

        } else {

            files.push(fullPath);
        }
    }

    return files;
}


// ------------------------------------
// 3. Check whether file is useful
// ------------------------------------

function isCodeFile(file) {

    const extensions = [
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".cs",
        ".cpp",
        ".h",
        ".hpp",
        ".java",
        ".py",
        ".go",
        ".rs",
        ".php",
        ".rb",
        ".sql",
        ".html",
        ".css",
        ".json",
        ".md"
    ];

    return extensions.includes(path.extname(file));
}


// ------------------------------------
// 4. Split code into chunks
// ------------------------------------

function chunkText(text, chunkSize = 1500) {

    const chunks = [];

    for (let i = 0; i < text.length; i += chunkSize) {

        chunks.push(
            text.substring(i, i + chunkSize)
        );
    }

    return chunks;
}


// ------------------------------------
// 5. Create Qdrant collection
// ------------------------------------

async function createCollection() {

    const vectorSize = 768;

    try {

        await qdrant.getCollection(COLLECTION_NAME);

        console.log("Collection already exists.");

    } catch {

        console.log("Creating Qdrant collection...");

        await qdrant.createCollection(
            COLLECTION_NAME,
            {
                vectors: {
                    size: vectorSize,
                    distance: "Cosine"
                }
            }
        );
    }
}


// ------------------------------------
// 6. Main ingestion
// ------------------------------------

async function ingest() {

    cloneRepository();

    await createCollection();

    const files = getFiles(REPO_DIR);

    console.log(`Found ${files.length} files.`);

    let id = 0;

    for (const file of files) {

        if (!isCodeFile(file)) {
            continue;
        }

        let content;

        try {

            content = fs.readFileSync(
                file,
                "utf-8"
            );

        } catch {

            continue;
        }

        const chunks = chunkText(content);

        console.log(
            `Processing ${file} -> ${chunks.length} chunks`
        );

        for (const chunk of chunks) {

            const vector =
                await embeddings.embedQuery(chunk);

            await qdrant.upsert(
                COLLECTION_NAME,
                {
                    wait: true,

                    points: [
                        {
                            id: id++,

                            vector: vector,

                            payload: {
                                repoName:repoName,
                                content: chunk,

                                file: path.relative(
                                    REPO_DIR,
                                    file
                                )
                            }
                        }
                    ]
                }
            );
        }
    }

    console.log("Ingestion completed.");
}


ingest();