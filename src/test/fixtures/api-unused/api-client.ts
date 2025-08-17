export class ApiClient {
  async get(url: string) { return fetch(url) }
  async post(url: string, data: any) { return fetch(url, { method: 'POST', body: JSON.stringify(data) }) }
}

export const apiClient = new ApiClient()