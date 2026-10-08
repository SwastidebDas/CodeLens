import express from "express";
import dotenv from "dotenv";


dotenv.config();

const app= express();

app.get("/",(req,res)=>{
    res.send("CodeLens is running...");
})

app.listen(process.env.PORT,()=>{
    console.log(`Server Running on Port ${process.env.PORT}`);
})