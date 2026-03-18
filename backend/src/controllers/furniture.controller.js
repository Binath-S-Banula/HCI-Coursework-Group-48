const Furniture = require("../models/Furniture");
const path = require("path");
const fs = require("fs");

const uploadsRoot = path.resolve(__dirname, "../../uploads");

const deleteUploadedFileByUrl = async (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== "string") return;

  try {
    let pathname = fileUrl;
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      pathname = new URL(fileUrl).pathname;
    }

    const uploadsMarker = "/uploads/";
    const markerIndex = pathname.toLowerCase().indexOf(uploadsMarker);
    if (markerIndex < 0) return;

    const relativeUploadPath = decodeURIComponent(
      pathname.slice(markerIndex + uploadsMarker.length)
    );

    const absoluteFilePath = path.resolve(uploadsRoot, relativeUploadPath);
    const safeRoot = `${uploadsRoot}${path.sep}`;
    const safeTarget = path.resolve(absoluteFilePath);

    if (!safeTarget.startsWith(safeRoot)) return;

    await fs.promises.unlink(safeTarget).catch((err) => {
      if (err?.code !== "ENOENT") throw err;
    });
  } catch (err) {
    console.error("Failed to delete uploaded file:", err.message);
  }
};

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
    const existing = await Furniture.findById(req.params.id);
    if (!existing)
      return res.status(404).json({ success: false, message: "Not found" });

    const updates = { ...req.body };

    if (req.uploadedImageUrl) {
      updates.imageUrl = req.uploadedImageUrl;
    }

    if (req.uploadedModelUrl) {
      updates.model3d = req.uploadedModelUrl;
      updates.model3dName = req.uploadedModelName || existing.model3dName;
    }

    const item = await Furniture.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (req.uploadedImageUrl && existing.imageUrl && existing.imageUrl !== item.imageUrl) {
      await deleteUploadedFileByUrl(existing.imageUrl);
    }

    if (req.uploadedModelUrl && existing.model3d && existing.model3d !== item.model3d) {
      await deleteUploadedFileByUrl(existing.model3d);
    }

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/furniture/:id  — admin only
const remove = async (req, res, next) => {
  try {
    const item = await Furniture.findById(req.params.id);
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });

    await Promise.all([
      deleteUploadedFileByUrl(item.imageUrl),
      deleteUploadedFileByUrl(item.model3d),
    ]);

    item.isActive = false;
    await item.save();

    res.json({ success: true, message: "Furniture removed" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, create, update, remove };
