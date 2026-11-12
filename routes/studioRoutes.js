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

    // Validate price range
    const min =
      minPrice === undefined || minPrice === "" ? undefined : Number(minPrice);

    const max =
      maxPrice === undefined || maxPrice === "" ? undefined : Number(maxPrice);

    if (
      (min !== undefined &&
        (!Number.isFinite(min) || min < 0 || min > 100000)) ||
      (max !== undefined && (!Number.isFinite(max) || max < 0 || max > 100000))
    ) {
      return res.status(400).send({
        success: false,
        message: "Price must be between 0 and 100,000.",
      });
    }

    if (min !== undefined && max !== undefined && max < min) {
      return res.status(400).send({
        success: false,
        message: "Maximum price cannot be lower than minimum price.",
      });
    }

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
      if (category.toLowerCase() === "others") {
        query.category = { $in: [null, ""] };
      } else {
        query.category = category;
      }
    }

    if (location) {
      query.location = {
        $regex: location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    if (min !== undefined || max !== undefined) {
      query.hourlyRate = {};

      if (min !== undefined) {
        query.hourlyRate.$gte = min;
      }

      if (max !== undefined) {
        query.hourlyRate.$lte = max;
      }
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
    const featuredStudios = await studiosCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    res.status(200).json({
      success: true,
      count: featuredStudios.length,
      data: featuredStudios,
    });
  } catch (error) {
    console.error("Featured studios error:", error);

    res.status(500).json({
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

// POST a new studio
router.post("/", async (req, res) => {
  try {
    const {
      title,
      category,
      hourlyRate,
      securityDeposit,
      maxCapacity,
      location,
      imageUrl,
      amenities,
      overview,
    } = req.body;

    // Validate required text fields
    if (
      !title?.trim() ||
      !category?.trim() ||
      !location?.trim() ||
      !overview?.trim() ||
      !imageUrl?.trim()
    ) {
      return res.status(400).send({
        success: false,
        message: "Please provide all required studio information.",
      });
    }

    // Validate numeric fields
    const rate = Number(hourlyRate);
    const deposit = Number(securityDeposit);
    const capacity = Number(maxCapacity);

    if (
      !Number.isFinite(rate) ||
      rate <= 0 ||
      rate > 100000 ||
      !Number.isFinite(deposit) ||
      deposit < 0 ||
      deposit > 100000 ||
      !Number.isInteger(capacity) ||
      capacity <= 0
    ) {
      return res.status(400).send({
        success: false,
        message: "Please provide valid price, deposit, and capacity values.",
      });
    }

    // Validate image URL
    let parsedImageUrl;

    try {
      parsedImageUrl = new URL(imageUrl);
    } catch {
      return res.status(400).send({
        success: false,
        message: "Please provide a valid image URL.",
      });
    }

    if (!["http:", "https:"].includes(parsedImageUrl.protocol)) {
      return res.status(400).send({
        success: false,
        message: "Image URL must use HTTP or HTTPS.",
      });
    }

    // Validate amenities
    if (
      amenities !== undefined &&
      (!Array.isArray(amenities) ||
        !amenities.every((item) => typeof item === "string" && item.trim()))
    ) {
      return res.status(400).send({
        success: false,
        message: "Amenities must be an array of valid strings.",
      });
    }

    // Prepare studio document
    const newStudio = {
      title: title.trim(),
      category: category.trim(),
      hourlyRate: rate,
      securityDeposit: deposit,
      maxCapacity: capacity,
      location: location.trim(),
      imageUrl: imageUrl.trim(),
      amenities: (amenities || []).map((item) => item.trim()),
      overview: overview.trim(),
      rating: 0,
      reviewCount: 0,
      isFeatured: false,
      createdAt: new Date(),
    };

    // Insert into MongoDB
    const result = await studiosCollection.insertOne(newStudio);

    res.status(201).send({
      success: true,
      message: "Studio added successfully.",
      data: {
        ...newStudio,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Failed to add studio:", error);

    res.status(500).send({
      success: false,
      message: "Failed to add studio.",
    });
  }
});

export default router;
