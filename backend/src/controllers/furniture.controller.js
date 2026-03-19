const Furniture = require("../models/Furniture");
const User = require("../models/User");
const { verifyToken } = require("../utils/jwt");
const path = require("path");
const fs = require("fs");

const uploadsRoot = path.resolve(__dirname, "../../uploads");

const CATEGORY_DEFAULT_DIMENSIONS_CM = {
  sofa: { width: 220, depth: 95, height: 85 },
  chair: { width: 60, depth: 60, height: 90 },
  table: { width: 160, depth: 90, height: 75 },
  bed: { width: 180, depth: 200, height: 55 },
  storage: { width: 90, depth: 45, height: 200 },
  lighting: { width: 45, depth: 45, height: 170 },
  kitchen: { width: 120, depth: 60, height: 90 },
  bathroom: { width: 80, depth: 60, height: 85 },
  decor: { width: 60, depth: 60, height: 120 },
  other: { width: 100, depth: 80, height: 90 },
};

const normalizeDimension = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

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

const getRequestUser = async (req) => {
  if (req.userId) {
    const user = await User.findById(req.userId).select("_id role");
    if (!user) return null;
    return { id: String(user._id), role: user.role };
  }

  const header = req.headers?.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;

  try {
    const token = header.split(" ")[1];
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select("_id role");
    if (!user) return null;
    return { id: String(user._id), role: user.role };
  } catch {
    return null;
  }
};

const canManageFurniture = (requestUser, furniture) => {
  if (!requestUser || !furniture) return false;
  if (requestUser.role === "admin") return true;
  return String(furniture.uploadedBy || "") === requestUser.id;
};

// GET /api/furniture  — all clients can fetch
const getAll = async (req, res, next) => {
  try {
    const {
      category,
      search,
      featured,
      includeMine,
      page = 1,
      limit = 50,
    } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (featured) filter.isFeatured = true;
    if (search) filter.$text = { $search: search };

    const shouldIncludeMine =
      String(includeMine || "").toLowerCase() === "true" ||
      String(includeMine || "") === "1";

    const publicVisibilityFilter = {
      $or: [{ visibility: "public" }, { visibility: { $exists: false } }],
    };

    if (shouldIncludeMine) {
      const requestUser = await getRequestUser(req);
      if (requestUser?.id) {
        filter.$or = [
          ...publicVisibilityFilter.$or,
          { uploadedBy: requestUser.id },
        ];
      } else {
        filter.$or = publicVisibilityFilter.$or;
      }
    } else {
      filter.$or = publicVisibilityFilter.$or;
    }

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

    if (item.visibility === "private") {
      const requestUser = await getRequestUser(req);
      const canAccess = canManageFurniture(requestUser, item);
      if (!canAccess) {
        return res.status(403).json({ success: false, message: "Not allowed" });
      }
    }

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// POST /api/furniture  — authenticated users can create
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

    const requestUser = await getRequestUser(req);
    if (!requestUser?.id) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const defaults =
      CATEGORY_DEFAULT_DIMENSIONS_CM[category] ||
      CATEGORY_DEFAULT_DIMENSIONS_CM.other;

    const item = await Furniture.create({
      name,
      category,
      price,
      width: normalizeDimension(width, defaults.width),
      depth: normalizeDimension(depth, defaults.depth),
      height: normalizeDimension(height, defaults.height),
      imageUrl,
      model3d,
      model3dName,
      tags,
      isFeatured: requestUser.role === "admin" ? Boolean(isFeatured) : false,
      visibility: requestUser.role === "admin" ? "public" : "private",
      uploadedBy: requestUser.id,
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// PUT /api/furniture/:id  — owner or admin
const update = async (req, res, next) => {
  try {
    const requestUser = await getRequestUser(req);
    if (!requestUser?.id) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const existing = await Furniture.findById(req.params.id);
    if (!existing)
      return res.status(404).json({ success: false, message: "Not found" });

    if (!canManageFurniture(requestUser, existing)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const updates = { ...req.body };

    if (requestUser.role !== "admin") {
      delete updates.visibility;
      delete updates.isFeatured;
      delete updates.isActive;
      delete updates.uploadedBy;
    }

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

// DELETE /api/furniture/:id  — owner or admin
const remove = async (req, res, next) => {
  try {
    const requestUser = await getRequestUser(req);
    if (!requestUser?.id) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const item = await Furniture.findById(req.params.id);
    if (!item)
      return res.status(404).json({ success: false, message: "Not found" });

    if (!canManageFurniture(requestUser, item)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

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
