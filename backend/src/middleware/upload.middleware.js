const multer = require('multer')
const path   = require('path')
const fs     = require('fs')

const uploadsRoot = path.join(__dirname, '../../uploads')
const imagesDir = path.join(uploadsRoot, 'images')
const modalsDir = path.join(uploadsRoot, 'modals')

for (const dir of [uploadsRoot, imagesDir, modalsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const modelMimeTypes = [
  'model/gltf-binary',
  'model/gltf+json',
  'application/octet-stream',
  'application/gltf+json',
]

const isModelFile = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase()
  return ext === '.glb' || ext === '.gltf' || modelMimeTypes.includes(file.mimetype)
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'image') return cb(null, imagesDir)
    if (file.fieldname === 'model3dFile' || isModelFile(file)) return cb(null, modalsDir)
    return cb(null, uploadsRoot)
  },
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`
    cb(null, name)
  },
})

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg','image/jpg','image/png','image/webp','image/gif']

  if (file.fieldname === 'image') {
    return allowedImageTypes.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only image files allowed for image field'))
  }

  if (file.fieldname === 'model3dFile') {
    return isModelFile(file)
      ? cb(null, true)
      : cb(new Error('Only .glb or .gltf files allowed for model3dFile field'))
  }

  return cb(new Error('Unsupported file field'))
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 25 * 1024 * 1024 } }) // 25MB

module.exports = { upload }