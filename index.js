import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import "dotenv/config";

const app = express();
const port = 8000; //http://localhost:8000

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URL);

let studiosCollection;
export async function connectToMongoDB() {
  try {
    await client.connect();

    console.log("You successfully connected to MongoDB!");

    const db = client.db(); 
    studiosCollection = db.collection("studios");

    console.log("Studios collection is ready!");

    return db;
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
}

app.get("/", (req, res) => {
  res.send({ message: `StudioSpace Server is running fine!` });
});

app.get("/api/studios", async (req, res) => {
  try {
    const studios = await studiosCollection.find({}).toArray();

    res.status(200).send({
      success: true,
      count: studios.length,
      data: studios,
    });
  } catch (err) {
    console.error("Failed to fetch studios:", err);

    res.status(500).send({
      success: false,
      message: "Failed to retrieve studios",
    });
  }
});

async function startServer() {
  await connectToMongoDB();

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

startServer();
