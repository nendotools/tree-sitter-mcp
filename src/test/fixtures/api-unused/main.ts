import { getUser, createUser } from './users-api'
// Note: games-api is never imported, deleteUser and updateUserProfile are never imported

export const app = {
  loadUser: getUser,
  saveUser: createUser
}