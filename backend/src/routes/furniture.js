const router  = require('express').Router()
const ctrl    = require('../controllers/furniture.controller')
const { protect, adminOnly } = require('../middleware/auth.middleware')
const { upload } = require('../middleware/upload.middleware')

// Anyone can browse
router.get('/',    ctrl.getAll)
router.get('/:id', ctrl.getOne)

// Admin: create with image + 3d model upload
router.post('/', protect, adminOnly, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'model3dFile', maxCount: 1 },
]), async (req, res, next) => {
  try {
    const imageFile = req.files?.image?.[0]
    const modelFile = req.files?.model3dFile?.[0]

    if (imageFile) {
      req.body.imageUrl = `${req.protocol}://${req.get('host')}/uploads/images/${imageFile.filename}`
    }

    if (modelFile) {
      req.body.model3d = `${req.protocol}://${req.get('host')}/uploads/modals/${modelFile.filename}`
      req.body.model3dName = modelFile.originalname
    }

    ctrl.create(req, res, next)
  } catch (err) { next(err) }
})

router.put   ('/:id', protect, adminOnly, ctrl.update)
router.delete('/:id', protect, adminOnly, ctrl.remove)

module.exports = router