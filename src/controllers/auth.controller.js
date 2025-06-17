const { generateToken } = require('../utils/jwt');
const User = require('../models/user.model');
const bcrypt = require('bcrypt');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken({ 
      id: user._id.toString(),
      username: user.username 
    });

    res.json({ 
      message: 'Login successful', 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login' });
  }
};

const register = async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Check if user already exists
    const existing = await User.findByUsername(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const userId = await User.create({
      username,
      password: hashed,
      email,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Generate token
    const token = generateToken({ id: userId.toString(), username });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: userId,
        username,
        email
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

module.exports = { login, register };