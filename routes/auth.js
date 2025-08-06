const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { username, email, password, referral } = req.body;
  if (!username || !email || !password) return res.status(400).json({ message: 'Missing fields' });
  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) return res.status(400).json({ message: 'User exists' });
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashedPassword, referral });
  await user.save();
  res.status(201).json({ message: 'Registered successfully' });
});

// Login
router.post('/login', async (req, res) => {
  const { loginId, password } = req.body;
  const user = await User.findOne({ $or: [{ email: loginId }, { username: loginId }] });
  if (!user || !user.password) return res.status(400).json({ message: 'Invalid credentials' });
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || 'jwtsecret', { expiresIn: '1d' });
  res.json({ token, user: { username: user.username, email: user.email } });
});

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  // Successful Google login
  const user = req.user;
  const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || 'jwtsecret', { expiresIn: '1d' });
  res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/?token=${token}`);
});

module.exports = router;
