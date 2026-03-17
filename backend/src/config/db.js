const mongoose = require('mongoose')
const dns = require('dns')
const { env }  = require('./env')

const applyDnsServers = (serverList) => {
  const parsedServers = serverList
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean)

  if (parsedServers.length > 0) {
    dns.setServers(parsedServers)
  }
}

const connectDB = async () => {
  if (env.DNS_SERVERS) {
    applyDnsServers(env.DNS_SERVERS)
  }

  try {
    await mongoose.connect(env.MONGODB_URI)
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`)
  } catch (err) {
    const isSrvDnsRefused = err?.code === 'ECONNREFUSED' && env.MONGODB_URI.startsWith('mongodb+srv://')

    if (isSrvDnsRefused && !env.DNS_SERVERS) {
      try {
        console.warn('⚠️ SRV DNS lookup refused. Retrying MongoDB connection with public DNS resolvers...')
        dns.setServers(['8.8.8.8', '1.1.1.1'])
        await mongoose.connect(env.MONGODB_URI)
        console.log(`✅ MongoDB connected: ${mongoose.connection.host}`)
        return
      } catch (retryErr) {
        console.error('❌ MongoDB connection failed after DNS fallback:', retryErr.message)
        process.exit(1)
      }
    }

    console.error('❌ MongoDB connection failed:', err.message)
    process.exit(1)
  }
}

module.exports = { connectDB }