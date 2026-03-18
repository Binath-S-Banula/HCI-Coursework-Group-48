const router  = require('express').Router()
const ctrl    = require('../controllers/furniture.controller')
const { protect, adminOnly } = require('../middleware/auth.middleware')
const { upload } = require('../middleware/upload.middleware')

const attachUploadedFurnitureFiles = (req) => {
  const imageFile = req.files?.image?.[0]
  const modelFile = req.files?.model3dFile?.[0]

  if (imageFile) {
    req.uploadedImageUrl = `${req.protocol}://${req.get('host')}/uploads/images/${imageFile.filename}`
  }

  if (modelFile) {
    req.uploadedModelUrl = `${req.protocol}://${req.get('host')}/uploads/modals/${modelFile.filename}`
    req.uploadedModelName = modelFile.originalname
  }
}

// Anyone can browse
router.get('/',    ctrl.getAll)
router.get('/:id', ctrl.getOne)

// Admin: create with image + 3d model upload
router.post('/', protect, adminOnly, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'model3dFile', maxCount: 1 },
]), async (req, res, next) => {
  try {
    attachUploadedFurnitureFiles(req)
    if (req.uploadedImageUrl) req.body.imageUrl = req.uploadedImageUrl
    if (req.uploadedModelUrl) {
      req.body.model3d = req.uploadedModelUrl
      req.body.model3dName = req.uploadedModelName
    }

    ctrl.create(req, res, next)
  } catch (err) { next(err) }
})

router.put   ('/:id', protect, adminOnly, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'model3dFile', maxCount: 1 },
]), async (req, res, next) => {
  try {
    attachUploadedFurnitureFiles(req)
    ctrl.update(req, res, next)
  } catch (err) { next(err) }
})
router.delete('/:id', protect, adminOnly, ctrl.remove)

module.exports = router