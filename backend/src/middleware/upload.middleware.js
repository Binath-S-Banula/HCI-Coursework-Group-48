const multer = require('multer')
const path   = require('path')
const fs     = require('fs')

// Save to /uploads folder
const uploadDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname)
    const name = `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`
    cb(null, name)
  },
})

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg','image/jpg','image/png','image/webp','image/gif']
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only image files allowed'))
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }) // 10MB

module.exports = { upload }