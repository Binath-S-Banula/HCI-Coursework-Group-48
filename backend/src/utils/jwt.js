const jwt     = require('jsonwebtoken')
const { env } = require('../config/env')

const generateToken = (userId) =>
  jwt.sign({ id: userId }, env.JWT_SECRET, { expiresIn: '7d' })

const verifyToken = (token) =>
  jwt.verify(token, env.JWT_SECRET)

module.exports = { generateToken, verifyToken }