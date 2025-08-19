// Minimal TypeScript file with predictable elements for testing
export interface TestUser {
  id: number
  name: string
  email: string
}

export class TestUserService {
  private users: TestUser[] = []

  public addUser(user: TestUser): void {
    this.users.push(user)
  }

  public findUserById(id: number): TestUser | undefined {
    return this.users.find(user => user.id === id)
  }

  public getAllUsers(): TestUser[] {
    return [...this.users]
  }
}

export function createTestUser(name: string, email: string): TestUser {
  return {
    id: Math.random(),
    name,
    email
  }
}

// Deliberately complex function for quality analysis
export function complexTestFunction(input: any): any {
  if (input) {
    if (typeof input === 'string') {
      if (input.length > 0) {
        if (input.includes('test')) {
          if (input.startsWith('test')) {
            return input.toUpperCase()
          } else {
            return input.toLowerCase()
          }
        } else {
          return input.trim()
        }
      } else {
        return 'empty'
      }
    } else {
      return String(input)
    }
  } else {
    return null
  }
}

// Unused function for deadcode analysis
export function unusedTestFunction(): void {
  console.log('This function is never called')
}