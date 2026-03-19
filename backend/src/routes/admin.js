const router = require('express').Router()
const User   = require('../models/User')
const Project = require('../models/Project')
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

// GET /api/admin/projects  — list all projects
router.get('/projects', protect, adminOnly, async (req, res, next) => {
  try {
    const projects = await Project.find()
      .populate('owner', 'name email')
      .sort({ updatedAt: -1 })
    res.json({ success:true, data:projects })
  } catch (err) { next(err) }
})

// PUT /api/admin/projects/:id/visibility  — toggle project public visibility
router.put('/projects/:id/visibility', protect, adminOnly, async (req, res, next) => {
  try {
    const { isPublic } = req.body
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ success:false, message:'isPublic must be boolean' })
    }
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { isPublic },
      { new:true }
    ).populate('owner', 'name email')
    if (!project) return res.status(404).json({ success:false, message:'Project not found' })
    res.json({ success:true, data:project })
  } catch (err) { next(err) }
})

// DELETE /api/admin/projects/:id  — delete any project
router.delete('/projects/:id', protect, adminOnly, async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ success:false, message:'Project not found' })
    await project.deleteOne()
    res.json({ success:true, message:'Project deleted' })
  } catch (err) { next(err) }
})

module.exports = router