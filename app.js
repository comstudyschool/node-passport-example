const express = require('express');
const session = require('express-session');
const passport = require('passport');
const authRoutes = require('./routes/authRoutes');
require('./config/passport')(passport);
const path = require('path');
const app = express();
require('dotenv').config();

const flash = require('connect-flash');

app.set("view engine", "ejs");
app.set("views", "./views");

app.use(flash());  // Flash 메시지 사용

// 정적 파일 제공 설정 추가 - 'views' 폴더의 정적 파일 제공
app.use(express.static(path.join(__dirname, 'views')));  
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRoutes);

app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`Welcome, ${req.user.username}!`);
  } else {
    res.redirect('/auth/login');
  }
});

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;