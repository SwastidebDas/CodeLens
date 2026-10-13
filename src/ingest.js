import "dotenv/config";
import fs from "fs";
import path from "path";
import { execSync } from "child_process"; //this helps to run the shell on local computer
import { QdrantClient } from "@qdrant/js-client-rest";
import { OllamaEmbeddings } from "@langchain/ollama";
import { createHash, randomUUID } from "node:crypto";

const REPO_URL = process.env.REPO_URL;
const QDRANT_URL = process.env.QDRANT_URL;
const COLLECTION_NAME = process.env.COLLECTION_NAME;

// const repoName = new URL(REPO_URL)
//     .pathname
//     .split("/")
//     .filter(Boolean)
//     .pop()
//     .replace(/\.git$/, "");

const url = new URL(REPO_URL);

const parts = url.pathname
    .split("/")
    .filter(Boolean);

const owner = parts[0];
const repoName = parts[1].replace(/\.git$/, "");

const repoId = `${owner}/${repoName}`;

const REPO_DIR = path.join("./repodump", owner, repoName);

const qdrant = new QdrantClient({
    url: QDRANT_URL
});

const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text"
});


// ------------------------------------
// cloning the repo.
// ------------------------------------

function cloneRepository() {
    if (fs.existsSync(REPO_DIR)) {
         console.log("Repository already exists. Pulling updates...");

        execSync(
            `git -C "${REPO_DIR}" pull`,
            { stdio: "inherit" }
        );

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
// extracting files
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
// Splitting  the code into chunks
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
// Creating hash of my file content
// ------------------------------------
function getFileHash(content) {
    return createHash("sha256")
        .update(content)
        .digest("hex");
}

// ------------------------------------
// Check to find any existing record over db to avoid duplication
// ------------------------------------
async function getExistingFile(repoId, file) {
    const result = await qdrant.scroll(COLLECTION_NAME, {
        filter: {
            must: [
                {
                    key: "repoId",
                    match: { value: repoId }
                },
                {
                    key: "file",
                    match: { value: file }
                }
            ]
        },
        limit: 1,
        with_payload: true,
        with_vector: false
    });

    return result.points[0]?.payload ?? null;
}


// ------------------------------------
// Creating Qdrant collection
// ------------------------------------
async function createCollection() {
    try {
        await qdrant.getCollection(COLLECTION_NAME);
        console.log("Collection already exists.");
    } catch (error) {
        if (error.status !== 404) {
            throw error;
        }

        console.log("Creating Qdrant collection...");

        await qdrant.createCollection(COLLECTION_NAME, {
            vectors: {
                size: 768,
                distance: "Cosine"
            }
        });
    }
}

// ------------------------------------
// Function generate IDs , to ensure Uniqueness to chunks
// ------------------------------------
function getChunkId(repoId, file, chunkIndex) {
    return createHash("sha256")
        .update(`${repoId}:${file}:${chunkIndex}`)
        .digest("hex")
        .slice(0, 32);
}

// ------------------------------------
// Main ingestion
// ------------------------------------

async function ingest() {

    cloneRepository();

    await createCollection();

    const files = getFiles(REPO_DIR);

    console.log(`Found ${files.length} files.`);

    for (const file of files) {

        if (!isCodeFile(file)) {
            continue;
        }

        let content;

        try {

            content = fs.readFileSync(file,"utf-8");
        } catch {
            continue;
        }
        
        const relativeFile = path
            .relative(REPO_DIR, file)
            .replace(/\\/g, "/");

        const fileHash = getFileHash(content);

        const existing = await getExistingFile(
            repoId,
            relativeFile
        );

        // Skip unchanged files.
        if (existing?.fileHash === fileHash) {
            console.log(`Skipping unchanged file: ${relativeFile}`);
            continue;
        }

        // If the file has changed, remove its old chunks.
        if (existing) {
            console.log(`Updating changed file: ${relativeFile}`);

        
            await qdrant.delete(COLLECTION_NAME, {
                wait: true,
                filter: {
                    must: [
                        {
                            key: "repoId",
                            match: { value: repoId }
                        },
                        {
                            key: "file",
                            match: { value: relativeFile }
                        }
                    ]
                }
            });
        } else {
            console.log(`New file: ${relativeFile}`);
        }


        const chunks = chunkText(content);

        console.log(
            `Processing ${file} -> ${chunks.length} chunks`
        );

        let chunkIndex = 0;
        for (const chunk of chunks) {

            const vector = await embeddings.embedQuery(chunk);

            const payload = {
            repoId,
            file: relativeFile,
            content: chunk,
            fileHash
            };
            
            await qdrant.upsert(
                COLLECTION_NAME,
                {
                    wait: true,
                    points: [
                        {
                            id: getChunkId(repoId,relativeFile,chunkIndex++),
                            vector: vector,
                            payload
                        }
                    ]
                }
            );
        }
    }

    console.log("Ingestion completed.");
}
ingest();
