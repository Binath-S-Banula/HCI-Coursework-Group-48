const router = require('express').Router()
const ctrl   = require('../controllers/project.controller')
const { protect } = require('../middleware/auth.middleware')

router.get('/public', ctrl.getPublic)

router.use(protect)   // all project routes require login

router.get   ('/',              ctrl.getAll)
router.get   ('/:id',           ctrl.getOne)
router.post  ('/',              ctrl.create)
router.put   ('/:id',           ctrl.update)
router.delete('/:id',           ctrl.remove)
router.post  ('/:id/duplicate', ctrl.duplicate)

module.exports = router