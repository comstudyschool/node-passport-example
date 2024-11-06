const request = require('supertest');
const app = require('../app');
const http = require('http');
const { User } = require('../models');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');

let server;

beforeAll(async () => {
  // 서버 시작
  server = http.createServer(app);
  await promisify(server.listen.bind(server))(3000);

  // 테스트 사용자 생성
  const hashedPassword = await bcrypt.hash('1234', 10);
  await User.create({ username: 'user1', password: hashedPassword });
});

afterAll(async () => {
  // 테스트 사용자 삭제
  await User.destroy({ where: { username: 'user1' } });

  // 서버 종료
  await promisify(server.close.bind(server))();
});

describe('POST /auth/login', () => {
  it('로그인 성공 시 /dashboard로 리다이렉트해야 합니다.', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'user1', password: '1234' });
    expect(response.headers.location).toBe('/dashboard');
  });

//   it('로그인 실패 시 /auth/login으로 리다이렉트해야 합니다.', async () => {
//     const response = await request(app)
//       .post('/auth/login')
//       .send({ username: 'user1', password: 'wrong_password' });
    
//     console.log(response.status);  // 상태 코드 확인
//     console.log(response.headers);  // 헤더 확인
//     console.log(response.body);     // 응답 본문 확인
  
//     expect(response.headers.location).toBe('/auth/login');
//   });
});
