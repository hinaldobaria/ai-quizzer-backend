const { generateToken } = require('../utils/jwt');
const pool = require('../db/connect');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');

const login = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    // Check if user exists
    let user = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (user.rows.length === 0) {
      // Create new user with hashed password
      const hashedPassword = await bcrypt.hash(password, 10);
      const email = `${username.replace(/\s+/g, '_').toLowerCase()}@aiquizzer.com`;
      
      user = await pool.query(
        `INSERT INTO users (username, password, email)
         VALUES ($1, $2, $3)
         RETURNING id, username, email`,
        [username, hashedPassword, email]
      );
    } else {
      // Verify password for existing user
      const isValid = await bcrypt.compare(password, user.rows[0].password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    const token = generateToken({ 
      id: user.rows[0].id,
      username: user.rows[0].username 
    });

    return res.json({ 
      message: 'Login successful', 
      token,
      user: {
        id: user.rows[0].id,
        username: user.rows[0].username,
        email: user.rows[0].email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
};

module.exports = { login };