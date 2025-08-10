/**
 * Main entry point for simple TypeScript fixture
 */

import { userService } from './services/userService.js'

export async function main(): Promise<void> {
  console.log('Simple TypeScript fixture starting...')

  // Create some test users
  const user1 = await userService.createUser('Alice Johnson', 'alice@example.com')
  await userService.createUser('Bob Smith', 'bob@example.com')

  console.log(`Created ${userService.getUserCount()} users`)

  // Find user by email
  const foundUser = await userService.getUserByEmail('alice@example.com')
  if (foundUser) {
    console.log(`Found user: ${foundUser.getName()}`)
  }

  // Update user
  await userService.updateUser(user1.getId(), { name: 'Alice Cooper' })

  // List all users
  const allUsers = await userService.listUsers()
  console.log(`All users: ${allUsers.map(u => u.getName()).join(', ')}`)
}

export { userService } from './services/userService.js'
export { User, createUser } from './models/user.js'
export { validateEmail, validateName, ValidationError } from './utils/validation.js'

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}