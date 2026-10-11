import "dotenv/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import { OllamaEmbeddings, ChatOllama } from "@langchain/ollama";

const QDRANT_URL = process.env.QDRANT_URL;
const COLLECTION_NAME = process.env.COLLECTION_NAME;
const REPO_URL = process.env.REPO_URL;

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

const llm = new ChatOllama({
    model: "llama3.2",
    temperature: 0
});


// ------------------------------------
// Search vector DB
// ------------------------------------



async function classifyQuestion(question) {
    console.log("\nAnalyzing the question...\n");

    const response = await llm.invoke(`
        You are a question classifier for a codebase analysis assistant.

        Determine whether answering the user's question requires
        understanding the project broadly across multiple files,
        rather than inspecting only a specific file, function,
        or implementation detail.

        Return true for questions asking about:
        - The project's overall purpose or features
        - A summary or overview of the codebase
        - Overall architecture or module interactions
        - How the major components work together
        - A broad explanation of the entire project

        Return false for questions focused on:
        - A specific function, file, class, or variable
        - A particular bug or implementation detail
        - A specific API, query, or code snippet

        Return exactly one word: true or false.
        Do not provide any explanation.

        User question: ${question}
    `);

    const answer = response.content.trim().toLowerCase();

    return answer === "true";
}



async function searchCode(question, reponame) {

    const isOverviewQuestion = await classifyQuestion(question);

    if (isOverviewQuestion) {
        console.log(
            "\nThis is a Overview question: retrieving all project chunks.\n"
        );

        let allPoints = [];
        let offset = null;

        do {
            const results = await qdrant.scroll(
                COLLECTION_NAME,
                {
                    limit: 100,
                    offset: offset,
                    with_payload: true,
                    with_vector: false,
                    filter: {
                        must: [
                            {
                                key: "repoName",
                                match: {
                                    value: reponame
                                }
                            }
                        ]
                    }
                }
            );

            allPoints.push(...results.points);
            offset = results.next_page_offset;

        } while (offset !== null);

        return allPoints;
    }

    console.log("\nRetriving chunks...\n");

    const questionVector = await embeddings.embedQuery(question);

    const results = await qdrant.query(
        COLLECTION_NAME,
        {
            query: questionVector,
            limit: 7,
            with_payload: true,
            filter: {
                must: [
                    {
                        key: "repoName",
                        match: {
                            value: reponame
                        }
                    }
                ]
            }
        }
    );

    return results.points;
}



// ------------------------------------
// Ask LLM
// ------------------------------------

async function ask(question) {

    const results =
        await searchCode(question,repoName);

    console.log(`\nRetrived chunks:${results.length}\n`);

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

    console.log("\nWait till I get you the Answer...\n")

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
        '\nUsage: npm run ask -- "How does authentication work?"\n'
    );

    process.exit(1);
}

ask(question);