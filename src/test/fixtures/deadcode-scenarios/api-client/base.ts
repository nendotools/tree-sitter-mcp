class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  async get(path: string) {
    return fetch(`${this.baseUrl}${path}`)
  }

  async post(path: string, data: any) {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  }

  async patch(path: string, data: any) {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  }

  async delete(path: string) {
    return fetch(`${this.baseUrl}${path}`, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()