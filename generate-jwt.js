const jwt = require('jsonwebtoken');

// Generate JWT for athlete 76265575
const token = jwt.sign(
  { athlete_id: 76265575 },
  process.env.JWT_SECRET || 'dev_secret',
  { expiresIn: '30d' }
);

console.log('New JWT for athlete 76265575:');
console.log(token);
