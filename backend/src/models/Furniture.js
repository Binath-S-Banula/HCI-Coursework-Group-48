const mongoose = require('mongoose')

const furnitureSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  category:    { type: String, required: true, enum: ['sofa','chair','table','bed','storage','lighting','kitchen','bathroom','decor','other'] },
  price:       { type: Number, default: 0 },
  width:       { type: Number, default: 80  },   // cm
  depth:       { type: Number, default: 80  },   // cm
  height:      { type: Number, default: 80  },   // cm
  imageUrl:    { type: String, required: true },  // URL or base64
  model3d:     { type: String, default: null },
  model3dName: { type: String, default: null },
  thumbnailUrl:{ type: String, default: null },
  tags:        [{ type: String }],
  isFeatured:  { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true  },
  visibility:  { type: String, enum: ['public', 'private'], default: 'public' },
  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

furnitureSchema.index({ name: 'text', category: 1 })

module.exports = mongoose.model('Furniture', furnitureSchema)