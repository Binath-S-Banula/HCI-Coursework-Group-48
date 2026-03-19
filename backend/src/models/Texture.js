const mongoose = require('mongoose')

const textureSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  type:       { type: String, required: true, enum: ['wall','floor'] },
  imageUrl:   { type: String, required: true },
  isActive:   { type: Boolean, default: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

module.exports = mongoose.model('Texture', textureSchema)