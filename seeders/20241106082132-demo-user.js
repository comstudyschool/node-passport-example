'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('1234', 10);
    return queryInterface.bulkInsert('Users', [{
      username: 'user2',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Users', { username: 'user1' });
  }
};
