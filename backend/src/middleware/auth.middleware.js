const { verifyToken } = require('../utils/jwt')

// Require valid JWT
const protect = (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ success:false, message:'Not authenticated' })

    const token   = header.split(' ')[1]
    const decoded = verifyToken(token)
    req.userId = decoded.id
    next()
  } catch {
    res.status(401).json({ success:false, message:'Token invalid or expired' })
  }
}

// Require admin role
const adminOnly = async (req, res, next) => {
  try {
    const User = require('../models/User')
    const user = await User.findById(req.userId)
    if (!user || user.role !== 'admin')
      return res.status(403).json({ success:false, message:'Admin access required' })
    next()
  } catch (err) { next(err) }
}

module.exports = { protect, adminOnly }