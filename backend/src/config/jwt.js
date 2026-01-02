require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret_key_min_32_chars',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
};

