import express from "express";
import { ObjectId } from "mongodb";

const router = express.Router();

let studiosCollection;

// Receive MongoDB collection from index.js
export function setStudiosCollection(collection) {
  studiosCollection = collection;
}

// GET all studios
// GET, SEARCH, FILTER AND SORT STUDIOS
router.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      location,
      minPrice,
      maxPrice,
      sortBy,
      order,
      page = 1,
      limit = 12,
    } = req.query;

    // Build MongoDB query
    const query = {};

    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );

      query.$or = [
        { title: searchRegex },
        { category: searchRegex },
        { location: searchRegex },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (location) {
      query.location = {
        $regex: location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    if (minPrice || maxPrice) {
      query.hourlyRate = {};

      if (minPrice) query.hourlyRate.$gte = Number(minPrice);
      if (maxPrice) query.hourlyRate.$lte = Number(maxPrice);
    }

    // Sorting
    const allowedSortFields = ["hourlyRate", "rating", "createdAt", "title"];

    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const sortOrder = order === "asc" ? 1 : -1;

    // Pagination
    const currentPage = Math.max(1, parseInt(page) || 1);
    const itemsPerPage = Math.min(50, Math.max(1, parseInt(limit) || 12));

    const totalStudios = await studiosCollection.countDocuments(query);

    const studios = await studiosCollection
      .find(query)
      .sort({ [sortField]: sortOrder })
      .skip((currentPage - 1) * itemsPerPage)
      .limit(itemsPerPage)
      .toArray();

    res.status(200).send({
      success: true,
      count: studios.length,
      total: totalStudios,
      page: currentPage,
      totalPages: Math.ceil(totalStudios / itemsPerPage),
      data: studios,
    });
  } catch (error) {
    console.error("Failed to fetch studios:", error);

    res.status(500).send({
      success: false,
      message: "Failed to retrieve studios.",
    });
  }
});


// GET six featured studios
router.get("/featured", async (req, res) => {
    try {
        const studios = await studiosCollection.find({}).limit(6).toArray();

        res.status(200).send({
      success: true,
      count: studios.length,
      data: studios,
    });
  } catch (error) {
    console.error("Failed to fetch featured studios:", error);

    res.status(500).send({
      success: false,
      message: "Failed to retrieve featured studios.",
    });
  }
});

// GET all available studio categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await studiosCollection.distinct("category");

    res.status(200).send({
      success: true,
      count: categories.length,
      data: categories.sort(),
    });
  } catch (error) {
      console.error("Failed to fetch categories:", error);

      res.status(500).send({
      success: false,
      message: "Failed to retrieve categories.",
    });
  }
});

// GET a single studio by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const studio = await studiosCollection.findOne({
      _id: new ObjectId(id),
    });

    // Check if studio exists
    if (!studio) {
      return res.status(404).send({
        success: false,
        message: "Studio not found.",
      });
    }

    res.status(200).send({
      success: true,
      data: studio,
    });
  } catch (error) {
    console.error("Failed to fetch studio:", error);

    res.status(500).send({
      success: false,
      message: "Failed to retrieve studio.",
    });
  }
});

export default router;
