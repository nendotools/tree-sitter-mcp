// API service with some quality issues for testing
export class ApiService {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  // Function with moderate complexity that should be found in analysis
  async fetchData(endpoint: string, options: any = {}): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}`

    if (!endpoint) {
      throw new Error('Endpoint is required')
    }

    if (options.method === 'POST' && !options.body) {
      throw new Error('POST requests require body')
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }
}