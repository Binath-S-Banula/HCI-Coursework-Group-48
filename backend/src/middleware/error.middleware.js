const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message)

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(400).json({ success:false, message:`${field} already exists` })
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message)
    return res.status(400).json({ success:false, message: messages.join(', ') })
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError')
    return res.status(401).json({ success:false, message:'Invalid token' })
  if (err.name === 'TokenExpiredError')
    return res.status(401).json({ success:false, message:'Token expired' })

  // Cast error (bad MongoDB ID)
  if (err.name === 'CastError')
    return res.status(400).json({ success:false, message:'Invalid ID format' })

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  })
}

module.exports = { errorHandler }