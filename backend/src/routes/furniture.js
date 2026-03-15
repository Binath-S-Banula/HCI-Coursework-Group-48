const router  = require('express').Router()
const ctrl    = require('../controllers/furniture.controller')
const { protect, adminOnly } = require('../middleware/auth.middleware')
const { upload } = require('../middleware/upload.middleware')
const path    = require('path')

// Anyone can browse
router.get('/',    ctrl.getAll)
router.get('/:id', ctrl.getOne)

// Admin: create with image upload
router.post('/', protect, adminOnly, upload.single('image'), async (req, res, next) => {
  try {
    // If file uploaded, build URL; otherwise use imageUrl from body
    if (req.file) {
      req.body.imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    }
    ctrl.create(req, res, next)
  } catch (err) { next(err) }
})

router.put   ('/:id', protect, adminOnly, ctrl.update)
router.delete('/:id', protect, adminOnly, ctrl.remove)

module.exports = router