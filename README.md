여기서는 **Node.js, Passport.js, MySQL, Sequelize**를 사용하여 간단한 인증 시스템을 구축하는 **단계별 실습 메뉴얼**을 제공합니다. 이 메뉴얼은 `app.js` 설정을 참고하며 프로젝트 생성부터 테스트 실행까지 전체 과정을 포함합니다.

## WSL에 MySQL도커 컨테이너 생성

```jsx
# 도커 데스크탑을 먼저 실행
# WSL에서 도커 설치 확인
docker --version

# 새 사용자 계정을 도커 그룹에 추가
sudo usermod -aG docker $USER
# 변경 사항 적용
newgrp docker

docker run -d -it --name my-mysql \
-v ~/mysql_data:/var/lib/mysql \
-e MYSQL_ROOT_PASSWORD=1234 \
-p 3307:3306 \
mysql:5.7

docker ps -a

# vs-code접속 할 경우 퍼미션 변경
sudo chmod 777 /var/run/docker.sock
source ~/.bashrc

# mysql 도커 컨테이너 내부로 진입
docker exec -it my-mysql mysql -uroot -p1234
```

---

## 프로젝트 생성 및 초기 설정

1. **프로젝트 폴더 생성 및 초기화**
    
    ```bash
    mkdir passport-example
    cd passport-example
    npm init -y
    ```
    
2. **필수 패키지 설치**
    
    ```bash
    npm install express mysql2 sequelize passport passport-local bcryptjs express-session dotenv connect-flash ejs
    npm install --save-dev sequelize-cli jest supertest
    ```
    
3. **프로젝트 디렉토리 구조 설정**
    
    ```bash
    passport-example/
    ├── app.js
    ├── config/
    │   ├── config.json
    │   └── passport.js
    ├── models/
    │   ├── index.js
    │   └── user.js
    ├── routes/
    │   └── authRoutes.js
    ├── seeders/
    ├── tests/
    │   └── auth.test.js
    ├── views/
    │   ├── login.ejs
    │   └── dashboard.ejs
    ├── .env
    └── package.json
    
    ```
    

---

## Sequelize 설정 및 데이터베이스 구성

1. **Sequelize 초기화**
    
    ```bash
    npx sequelize-cli init
    
    ```
    
2. **데이터베이스 설정 파일 수정**
    
    `config/config.json` 파일을 열고 MySQL 데이터베이스 설정을 추가합니다.
    
    ```json
    {
      "development": {
        "username": "root",
        "password": "1234",
        "database": "passport_example",
        "host": "127.0.0.1",
        "port": 3306,
        "dialect": "mysql"
      }
    }
    
    ```
    
3. **데이터베이스 생성**
    
    `.env` 파일에 데이터베이스 정보를 넣어도 됩니다. (예: `DATABASE_URL`).
    
    ```bash
    npx sequelize-cli db:create
    
    ```
    

---

## 모델 및 마이그레이션 생성

1. **User 모델 및 마이그레이션 생성**
    
    ```bash
    npx sequelize-cli model:generate --name User --attributes username:string,password:string
    
    ```
    
2. **마이그레이션 실행**
    
    ```bash
    npx sequelize-cli db:migrate
    
    ```
    

---

## Passport 설정

1. **`config/passport.js` 파일 생성**
    
    ```jsx
    const LocalStrategy = require('passport-local').Strategy;
    const bcrypt = require('bcryptjs');
    const { User } = require('../models');
    
    module.exports = (passport) => {
      passport.use(
        new LocalStrategy({ usernameField: 'username' }, async (username, password, done) => {
          try {
            const user = await User.findOne({ where: { username } });
            if (!user) return done(null, false, { message: 'User not found' });
    
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return done(null, false, { message: 'Incorrect password' });
    
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        })
      );
    
      passport.serializeUser((user, done) => done(null, user.id));
    
      passport.deserializeUser(async (id, done) => {
        try {
          const user = await User.findByPk(id);
          done(null, user);
        } catch (error) {
          done(error);
        }
      });
    };
    
    ```
    
2. **패스포트 설정을 `app.js`에 추가**

---

## Express 서버 설정 (`app.js`)

```jsx
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const authRoutes = require('./routes/authRoutes');
require('./config/passport')(passport);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.set("views", "./views");

app.use('/auth', authRoutes);

app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    res.render('dashboard', { username: req.user.username });
  } else {
    res.redirect('/auth/login');
  }
});

module.exports = app;

```

---

## 라우트 설정 (`routes/authRoutes.js`)

```jsx
const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await User.create({ username, password: hashedPassword });
    res.redirect('/auth/login');
  } catch (error) {
    res.status(400).json({ error: 'Registration failed' });
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
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/auth/login');
  });
});

module.exports = router;

```

---

## 뷰 파일 생성 (`views/login.ejs` 및 `views/dashboard.ejs`)

### `views/login.ejs`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Login</title>
</head>
<body>
  <h2>Login</h2>
  <% if (messages.length > 0) { %>
    <div><%= messages[0] %></div>
  <% } %>
  <form action="/auth/login" method="POST">
    <input type="text" name="username" placeholder="Username" required />
    <input type="password" name="password" placeholder="Password" required />
    <button type="submit">Login</button>
  </form>
</body>
</html>

```

### `views/dashboard.ejs`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dashboard</title>
</head>
<body>
  <h1>Welcome, <%= username %>!</h1>
  <a href="/auth/logout">Logout</a>
</body>
</html>

```

---

## Seed 파일을 사용해 테스트 사용자 추가

1. **Seed 파일 생성**
    
    ```bash
    npx sequelize-cli seed:generate --name demo-user
    
    ```
    
2. **Seed 파일 수정 (`seeders/[timestamp]-demo-user.js`)**
    
    ```jsx
    'use strict';
    const bcrypt = require('bcryptjs');
    
    module.exports = {
      async up(queryInterface, Sequelize) {
        const hashedPassword = await bcrypt.hash('1234', 10);
        return queryInterface.bulkInsert('Users', [{
          username: 'user1',
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]);
      },
    
      async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('Users', { username: 'user1' });
      }
    };
    
    ```
    
3. **Seed 파일 실행**
    
    ```bash
    npx sequelize-cli db:seed:all
    
    ```
    

---

## 테스트 설정 (`tests/auth.test.js`)

```jsx
const request = require('supertest');
const app = require('../app');

describe('POST /auth/login', () => {
  it('로그인 성공 시 /dashboard로 리다이렉트해야 합니다.', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'user1', password: '1234' });
    expect(response.headers.location).toBe('/dashboard');
  });
});

```

---

## 서버 실행 및 테스트

1. **서버 실행**
    
    ```bash
    node app.js
    
    ```
    
2. **테스트 실행**
    
    ```bash
    npm test
    
    ```
    

이제 **브라우저에서 `http://localhost:3000/auth/login`에 접속하여 로그인 테스트**를 하거나, **`npm test`로 Jest 테스트**를 실행하여 인증 시스템이 올바르게 동작하는지 확인할 수 있습니다.