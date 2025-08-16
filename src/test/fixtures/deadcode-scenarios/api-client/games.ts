import { apiClient } from './base'

// This entire module is never imported anywhere - completely dead code
export const getGames = () => apiClient.get('/games')
export const createGame = (data: any) => apiClient.post('/games', data)
export const deleteGame = (id: string) => apiClient.delete(`/games/${id}`)

export interface Game {
  id: string
  title: string
  players: string[]
}

export interface GameSettings {
  maxPlayers: number
  isPrivate: boolean
}