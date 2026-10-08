import "dotenv/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import { OllamaEmbeddings, ChatOllama } from "@langchain/ollama";

const QDRANT_URL = process.env.QDRANT_URL;
const COLLECTION_NAME = process.env.COLLECTION_NAME;

const qdrant = new QdrantClient({
    url: QDRANT_URL
});

const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text"
});

const llm = new ChatOllama({
    model: "llama3.2",
    temperature: 0
});


// ------------------------------------
// Search vector DB
// ------------------------------------

async function searchCode(question) {

    const questionVector =
        await embeddings.embedQuery(question);

    const results =
        await qdrant.query(
            COLLECTION_NAME,
            {
                query: questionVector,
                limit: 5,
                with_payload: true
            }
        );

    return results.points;
}


// ------------------------------------
// Ask LLM
// ------------------------------------

async function ask(question) {

    const results =
        await searchCode(question);

    console.log("\nRelevant files:\n");

    for (const result of results) {

        console.log(
            `${result.payload.file} - ${result.score}`
        );
    }

    const context = results
        .map(result => {

            return `
FILE: ${result.payload.file}

${result.payload.content}
`;

        })
        .join("\n-------------------\n");


    const prompt = `
You are a codebase analysis assistant.

Answer the user's question using ONLY
the provided code context.

If the answer cannot be found in the
context, say that you could not find
the answer in the retrieved code.

CODE CONTEXT:

${context}


USER QUESTION:

${question}
`;


    const response =
        await llm.invoke(prompt);

    console.log("\nANSWER:\n");

    console.log(response.content);
}


// ------------------------------------
// Run
// ------------------------------------

const question =
    process.argv.slice(2).join(" ");

if (!question) {

    console.log(
        'Usage: npm run ask -- "How does authentication work?"'
    );

    process.exit(1);
}

ask(question);