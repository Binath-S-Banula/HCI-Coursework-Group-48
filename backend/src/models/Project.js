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
  cat:      String,
  x: Number, y: Number,
  w: Number, h: Number,
  angle: Number,
  color: String,
  width: Number, depth: Number,
  model3d: String,
  model3dName: String,
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
  openings: [{ type: mongoose.Schema.Types.Mixed }],
  floor: {
    x: { type: Number, default: null },
    y: { type: Number, default: null },
    w: { type: Number, default: null },
    h: { type: Number, default: null },
  },
  floorTex: {                     // selected floor texture
    id:    { type: String, default: null },
    name:  { type: String, default: null },
    image: { type: String, default: null },
  },
  floorColor: { type: String, default: '#f5f2ee' },
  wallTex: {                      // selected wall texture
    id:    { type: String, default: null },
    name:  { type: String, default: null },
    image: { type: String, default: null },
  },
  wallColor: { type: String, default: '#e8e2d8' },
  lightIntensity: { type: Number, default: 1 },
  timeOfDay: {
    type: String,
    enum: ['morning', 'day', 'evening', 'night'],
    default: 'day',
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