import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import "dotenv/config";

import studioRoutes, { setStudiosCollection } from "./routes/studioRoutes.js";

const app = express();
const port = 8000;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URL);

async function connectToMongoDB() {
  try {
    await client.connect();

    const db = client.db("studio_space");
    const studiosCollection = db.collection("StudioSpace");

    setStudiosCollection(studiosCollection);

    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}

// Root route
app.get("/", (req, res) => {
  res.send({
    message: "StudioSpace server is running fine!",
  });
});

// Studio routes
app.use("/api/studios", studioRoutes);

async function startServer() {
  await connectToMongoDB();

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

startServer();
