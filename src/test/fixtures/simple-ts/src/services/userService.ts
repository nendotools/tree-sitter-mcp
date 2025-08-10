import { User, UserData, createUser } from '../models/user.js';

/**
 * Service for managing user operations
 */
export class UserService {
  private users: Map<string, User> = new Map();

  async createUser(name: string, email: string): Promise<User> {
    const user = createUser(name, email);
    this.users.set(user.getId(), user);
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.getEmail() === email) {
        return user;
      }
    }
    return null;
  }

  async updateUser(
    id: string,
    updates: Partial<Pick<UserData, 'name' | 'email'>>
  ): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) {
      return false;
    }

    if (updates.name) {
      user.updateName(updates.name);
    }
    if (updates.email) {
      user.updateEmail(updates.email);
    }

    return true;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  getUserCount(): number {
    return this.users.size;
  }
}

// Singleton instance
export const userService = new UserService();
