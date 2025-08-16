// Main application that only uses some of the available exports
import { getUser, listUsers, createUser } from './api-client/users'
// Note: games.ts is never imported - entire module is dead code
// Note: deleteUser, updateUserAvatar, getUserPreferences from users.ts are never imported

export class App {
  async loadUser(id: string) {
    return getUser(id)
  }

  async loadAllUsers() {
    return listUsers()
  }

  async addUser(userData: any) {
    return createUser(userData)
  }
}

export const app = new App()