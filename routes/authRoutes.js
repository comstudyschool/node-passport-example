const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const router = express.Router();
const path = require('path');

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
    const newUser = await User.create({ username, password: hashedPassword });
    res.json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    res.status(400).json({ error: 'User registration failed' });
  }
});

router.get('/login', (req, res) => {
  const messages = req.flash('error');
  res.render('login', { messages });
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/auth/login',
  failureFlash: true
}));

router.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/auth/login');
  });
});

module.exports = router;
