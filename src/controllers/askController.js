import ask from "../services/ask.js"

export async function askController(req,res){
    try{
        const {repoId,question} = req.body;

        if(!repoId||!question)
        {
            return res.status(400).json({
                error: "Both repoId and question fields are required"
            });
        }

        const result = await ask(question,repoId);
        return res.status(200).json({
            answer: result
        })
    }
    catch(err)
    {
        console.error(err);

        return res.status(500).json({
            error: "Failed to answer your query"
        })
    }
}