import { apiClient } from './api-client'

// Entire module never imported
export const getGames = () => apiClient.get('/games')
export const createGame = (data: any) => apiClient.post('/games', data)