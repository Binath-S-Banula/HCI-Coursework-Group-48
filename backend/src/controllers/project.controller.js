const Project = require("../models/Project");

// GET /api/projects/public
const getPublic = async (req, res, next) => {
  try {
    const projects = await Project.find({ isPublic: true })
      .populate("owner", "name")
      .sort({ updatedAt: -1 });
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
};

// GET /api/projects
const getAll = async (req, res, next) => {
  try {
    const projects = await Project.find({ owner: req.userId }).sort({
      updatedAt: -1,
    });
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
};

// GET /api/projects/:id
const getOne = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    if (project.owner.toString() !== req.userId && !project.isPublic)
      return res.status(403).json({ success: false, message: "Access denied" });
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

// POST /api/projects
const create = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const project = await Project.create({
      name: name || "New Project",
      description,
      owner: req.userId,
    });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

// PUT /api/projects/:id  — saves walls, placed furniture, textures
const update = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ success: false, message: "Not found" });
    if (project.owner.toString() !== req.userId)
      return res
        .status(403)
        .json({ success: false, message: "Not your project" });

    const {
      name,
      description,
      walls,
      placed,
      openings,
      floor,
      floorTex,
      floorColor,
      wallTex,
      wallColor,
      lightIntensity,
      timeOfDay,
      settings,
      thumbnail,
      isPublic,
    } = req.body;

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (walls !== undefined) project.walls = walls;
    if (placed !== undefined) project.placed = placed;
    if (openings !== undefined) project.openings = openings;
    if (floor !== undefined) project.floor = floor;
    if (floorTex !== undefined) project.floorTex = floorTex;
    if (floorColor !== undefined) project.floorColor = floorColor;
    if (wallTex !== undefined) project.wallTex = wallTex;
    if (wallColor !== undefined) project.wallColor = wallColor;
    if (lightIntensity !== undefined) project.lightIntensity = lightIntensity;
    if (timeOfDay !== undefined) project.timeOfDay = timeOfDay;
    if (settings !== undefined)
      project.settings = { ...project.settings, ...settings };
    if (thumbnail !== undefined) project.thumbnail = thumbnail;
    if (isPublic !== undefined) project.isPublic = isPublic;

    await project.save();
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/projects/:id
const remove = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ success: false, message: "Not found" });
    if (project.owner.toString() !== req.userId)
      return res
        .status(403)
        .json({ success: false, message: "Not your project" });
    await project.deleteOne();
    res.json({ success: true, message: "Project deleted" });
  } catch (err) {
    next(err);
  }
};

// POST /api/projects/:id/duplicate
const duplicate = async (req, res, next) => {
  try {
    const original = await Project.findById(req.params.id);
    if (!original)
      return res.status(404).json({ success: false, message: "Not found" });
    if (original.owner.toString() !== req.userId && !original.isPublic)
      return res
        .status(403)
        .json({ success: false, message: "Access denied" });

    const copy = await Project.create({
      name: `${original.name} (Copy)`,
      description: original.description,
      walls: original.walls,
      placed: original.placed,
      openings: original.openings,
      floor: original.floor,
      floorTex: original.floorTex,
      floorColor: original.floorColor,
      wallTex: original.wallTex,
      wallColor: original.wallColor,
      lightIntensity: original.lightIntensity,
      timeOfDay: original.timeOfDay,
      settings: original.settings,
      owner: req.userId,
    });
    res.status(201).json({ success: true, data: copy });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPublic, getAll, getOne, create, update, remove, duplicate };
