const User = require('../models/User')

const seedAdmin = async () => {
  try {
    const existing = await User.findOne({ email: 'admin@homeplan3d.com' })
    if (existing) {
      console.log('✅ Admin already exists — skipping seed')
      return
    }

    await User.create({
      name:     'Admin',
      email:    'admin@homeplan3d.com',
      password: 'admin123456',
      role:     'admin',
      plan:     'business',
    })

    console.log('🌱 Admin user created!')
    console.log('   Email:    admin@homeplan3d.com')
    console.log('   Password: admin123456')
    console.log('   ⚠️  Change this password in production!')

  } catch (err) {
    console.error('❌ Admin seed failed:', err.message)
  }
}

module.exports = { seedAdmin }