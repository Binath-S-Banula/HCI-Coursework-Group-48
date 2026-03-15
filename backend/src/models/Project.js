const mongoose = require('mongoose')

const wallSchema = new mongoose.Schema({
  id:    Number,
  start: { x: Number, y: Number },
  end:   { x: Number, y: Number },
}, { _id: false })

const placedItemSchema = new mongoose.Schema({
  id:       String,
  name:     String,
  image:    String,
  category: String,
  x: Number, y: Number,
  w: Number, h: Number,
  width: Number, depth: Number,
}, { _id: false })

const projectSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, default: 'New Project' },
  description: { type: String, default: '' },
  thumbnail:   { type: String, default: null },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic:    { type: Boolean, default: false },

  // 2D design data
  walls:    [wallSchema],
  placed:   [placedItemSchema],   // placed furniture items
  floorTex: {                     // selected floor texture
    id:    { type: String, default: null },
    name:  { type: String, default: null },
    image: { type: String, default: null },
  },
  wallTex: {                      // selected wall texture
    id:    { type: String, default: null },
    name:  { type: String, default: null },
    image: { type: String, default: null },
  },

  // Settings
  settings: {
    unit:           { type: String, default: 'cm' },
    floorHeight:    { type: Number, default: 280 },
    wallThickness:  { type: Number, default: 15 },
    gridSize:       { type: Number, default: 20 },
  },
}, { timestamps: true })

projectSchema.index({ owner: 1, createdAt: -1 })

module.exports = mongoose.model('Project', projectSchema)