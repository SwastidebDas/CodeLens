import express from "express";
import dotenv from "dotenv";
import ingestionRouter from "./src/routes/ingestionRoute.js";
import askRouter from "./src/routes/askRoute.js"

dotenv.config();

export const app= express();

app.use(express.json());

app.use("/api",ingestionRouter);
app.use("/api",askRouter);

app.listen(process.env.PORT,()=>{
    console.log(`Server Running on Port ${process.env.PORT}`);
})