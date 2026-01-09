const jwtConfig = require('./jwt');
const securityConfig = require('./security');
const connectDB = require('./database');

module.exports = {
  jwt: jwtConfig,
  security: securityConfig,
  connectDB
};