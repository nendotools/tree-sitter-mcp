class User {
  constructor(id, name, email, active = true) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.active = active;
  }

  getDisplayName() {
    return this.active ? this.name : `${this.name} (inactive)`;
  }

  static createUser(name, email) {
    return new User(User.generateId(), name, email);
  }

  static generateId() {
    return Date.now();
  }
}

class UserRepository {
  constructor() {
    this.users = [];
  }

  save(user) {
    this.users.push(user);
    return user;
  }

  findById(id) {
    return this.users.find(user => user.id === id);
  }

  findByEmail(email) {
    return this.users.find(user => user.email === email);
  }

  findAll() {
    return [...this.users];
  }

  deleteById(id) {
    const index = this.users.findIndex(user => user.id === id);
    if (index !== -1) {
      this.users.splice(index, 1);
      return true;
    }
    return false;
  }
}

module.exports = { User, UserRepository };