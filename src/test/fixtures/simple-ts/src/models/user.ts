/**
 * User model with basic operations
 */
export interface UserData {
  id: string
  name: string
  email: string
  createdAt: Date
}

export class User {
  private data: UserData

  constructor(userData: UserData) {
    this.data = userData
  }

  getId(): string {
    return this.data.id
  }

  getName(): string {
    return this.data.name
  }

  getEmail(): string {
    return this.data.email
  }

  updateName(newName: string): void {
    this.data.name = newName
  }

  updateEmail(newEmail: string): void {
    if (!this.isValidEmail(newEmail)) {
      throw new Error('Invalid email format')
    }
    this.data.email = newEmail
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  toJSON(): UserData {
    return { ...this.data }
  }
}

export function createUser(name: string, email: string): User {
  return new User({
    id: Math.random().toString(36).substr(2, 9),
    name,
    email,
    createdAt: new Date(),
  })
}