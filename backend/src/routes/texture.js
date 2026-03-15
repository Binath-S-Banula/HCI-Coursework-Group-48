const router = require('express').Router()
const ctrl   = require('../controllers/Texture.controller')
const { protect, adminOnly } = require('../middleware/auth.middleware')
const { upload } = require('../middleware/upload.middleware')

// Anyone can fetch textures
router.get('/', ctrl.getAll)

// Admin: create with image upload
router.post('/', protect, adminOnly, upload.single('image'), async (req, res, next) => {
  try {
    if (req.file) {
      req.body.imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    }
    ctrl.create(req, res, next)
  } catch (err) { next(err) }
})

router.delete('/:id', protect, adminOnly, ctrl.remove)

module.exports = router