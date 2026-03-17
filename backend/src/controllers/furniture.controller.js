const Furniture = require("../models/Furniture");

// GET /api/furniture  — all clients can fetch
const getAll = async (req, res, next) => {
  try {
    const { category, search, featured, page = 1, limit = 50 } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (featured) filter.isFeatured = true;
    if (search) filter.$text = { $search: search };

    const items = await Furniture.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Furniture.countDocuments(filter);

    res.json({ success: true, data: items, total, page: Number(page) });
  } catch (err) {
    next(err);
  }
};

// GET /api/furniture/:id
const getOne = async (req, res, next) => {
  try {
    const item = await Furniture.findById(req.params.id);
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// POST /api/furniture  — admin only
const create = async (req, res, next) => {
  try {
    const {
      name,
      category,
      price,
      width,
      depth,
      height,
      imageUrl,
      model3d,
      model3dName,
      tags,
      isFeatured,
    } = req.body;
    if (!name || !category || !imageUrl)
      return res
        .status(400)
        .json({
          success: false,
          message: "name, category and imageUrl are required",
        });

    const item = await Furniture.create({
      name,
      category,
      price,
      width,
      depth,
      height,
      imageUrl,
      model3d,
      model3dName,
      tags,
      isFeatured,
      uploadedBy: req.userId,
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// PUT /api/furniture/:id  — admin only
const update = async (req, res, next) => {
  try {
    const item = await Furniture.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/furniture/:id  — admin only
const remove = async (req, res, next) => {
  try {
    await Furniture.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: "Furniture removed" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, create, update, remove };
