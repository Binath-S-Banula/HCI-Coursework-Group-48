const router = require('express').Router()
const User   = require('../models/User')
const { protect, adminOnly } = require('../middleware/auth.middleware')

// GET /api/admin/users  — list all users
router.get('/users', protect, adminOnly, async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 })
    res.json({ success:true, data:users })
  } catch (err) { next(err) }
})

// PUT /api/admin/users/:id/role  — change user role
router.put('/users/:id/role', protect, adminOnly, async (req, res, next) => {
  try {
    const { role } = req.body
    if (!['user','admin'].includes(role))
      return res.status(400).json({ success:false, message:'Invalid role' })
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new:true })
    res.json({ success:true, data:user })
  } catch (err) { next(err) }
})

// POST /api/admin/make-admin  — TEMPORARY: make yourself admin (remove in production)
router.post('/make-admin', protect, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.userId, { role:'admin' }, { new:true })
    res.json({ success:true, message:`${user.email} is now admin`, data:user })
  } catch (err) { next(err) }
})

module.exports = router