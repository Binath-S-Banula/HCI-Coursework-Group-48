require('dotenv').config()

const env = {
  PORT:         process.env.PORT         || 5000,
  NODE_ENV:     process.env.NODE_ENV     || 'development',
  CLIENT_URL:   process.env.CLIENT_URL   || 'http://localhost:5173',
  MONGODB_URI:  process.env.MONGODB_URI  || 'mongodb://localhost:27017/homeplan3d',
  DNS_SERVERS:  process.env.DNS_SERVERS  || '',
  JWT_SECRET:   process.env.JWT_SECRET   || 'fallback_secret_change_me',
  JWT_EXPIRES:  process.env.JWT_EXPIRES_IN || '7d',
}

module.exports = { env }