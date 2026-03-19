const Texture = require("../models/Texture");

// GET /api/textures
const getAll = async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = { isActive: true };
    if (type) filter.type = type;
    const items = await Texture.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

// POST /api/textures  — admin only
const create = async (req, res, next) => {
  try {
    const { name, type, imageUrl } = req.body;
    if (!name || !type || !imageUrl)
      return res
        .status(400)
        .json({
          success: false,
          message: "name, type and imageUrl are required",
        });
    const item = await Texture.create({
      name,
      type,
      imageUrl,
      uploadedBy: req.userId,
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/textures/:id  — admin only
const remove = async (req, res, next) => {
  try {
    await Texture.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: "Texture removed" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, create, remove };
