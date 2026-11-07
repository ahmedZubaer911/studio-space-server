
import express from 'express';

const router = express.Router();

let studiosCollection;

// Receive MongoDB collection from index.js
export function setStudiosCollection(collection) {
  studiosCollection = collection;
}

// GET all studios
router.get('/', async (req, res) => {
  try {
    const studios = await studiosCollection.find({}).toArray();

    res.status(200).send({
      success: true,
      count: studios.length,
      data: studios,
    });
  } catch (error) {
    console.error('Failed to fetch studios:', error);

    res.status(500).send({
      success: false,
      message: 'Failed to retrieve studios.',
    });
  }
});

// GET six featured studios
router.get('/featured', async (req, res) => {
  try {
    const studios = await studiosCollection
      .find({})
      .limit(6)
      .toArray();

    res.status(200).send({
      success: true,
      count: studios.length,
      data: studios,
    });
  } catch (error) {
    console.error('Failed to fetch featured studios:', error);

    res.status(500).send({
      success: false,
      message: 'Failed to retrieve featured studios.',
    });
  }
});

export default router;
