import { apiClient } from './base'

// API functions - some used, some not
export const getUser = (id: string) => apiClient.get(`/users/${id}`)
export const listUsers = () => apiClient.get('/users')
export const createUser = (data: any) => apiClient.post('/users', data)

// These are never imported anywhere - dead code
export const deleteUser = (id: string) => apiClient.delete(`/users/${id}`)
export const updateUserAvatar = (id: string, avatar: string) => apiClient.patch(`/users/${id}/avatar`, { avatar })
export const getUserPreferences = (id: string) => apiClient.get(`/users/${id}/preferences`)

export interface User {
  id: string
  name: string
  email: string
}

// This interface is never used
export interface UserStats {
  loginCount: number
  lastLogin: Date
}