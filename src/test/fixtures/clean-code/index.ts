export interface User {
  id: number
  name: string
}

export function getUser(id: number): User {
  return {
    id,
    name: `User ${id}`
  }
}

export const users: User[] = []