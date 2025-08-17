import { apiClient } from './api-client'

export const getUser = (id: string) => apiClient.get(`/users/${id}`)
export const createUser = (data: any) => apiClient.post('/users', data)
export const deleteUser = (id: string) => apiClient.get(`/users/${id}`) // Never used
export const updateUserProfile = (id: string, data: any) => apiClient.post(`/users/${id}`, data) // Never used