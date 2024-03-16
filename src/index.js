import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { app } from "./app.js";
import connectDB from "./db/index.js";



dotenv.config({
    path:'./env'
})

const swaggerJsDocs = YAML.load("src/api.yaml")

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerJsDocs)
)



connectDB()
    .then(() => {
        app.listen(process.env.PORT || 1010, () => {
            console.log(`Server is running at port: ${process.env.PORT}`)
        })
    })
    .catch((err) => {
        console.log("MongoDB connection failed !!",err)
    })

