const router = require('express').Router()
const { register, login, getMe, updateMe } = require('../controllers/auth.controller')
const { protect } = require('../middleware/auth.middleware')

router.post('/register', register)
router.post('/login',    login)
router.get ('/me',       protect, getMe)
router.put ('/me',       protect, updateMe)

module.exports = router