// Legacy code with more quality issues
export class LegacyProcessor {
  // Method with too many parameters and poor structure
  public process(input: any, config: any, options: any, callbacks: any, state: any, cache: any, logger: any, metrics: any) {
    // Extremely complex nested logic
    if (input && input.data) {
      if (config && config.enabled) {
        if (options && options.mode) {
          if (callbacks && callbacks.onSuccess) {
            if (state && state.isReady) {
              if (cache && cache.isValid) {
                if (logger && logger.isEnabled) {
                  if (metrics && metrics.shouldTrack) {
                    // Deep nesting nightmare
                    let result = null
                    try {
                      if (input.data.type === 'A') {
                        if (config.processingMode === 'fast') {
                          result = this.fastProcess(input.data)
                        } else if (config.processingMode === 'slow') {
                          result = this.slowProcess(input.data)
                        } else {
                          result = this.defaultProcess(input.data)
                        }
                      } else if (input.data.type === 'B') {
                        result = this.processTypeB(input.data)
                      } else {
                        result = this.processUnknown(input.data)
                      }
                      callbacks.onSuccess(result)
                    } catch (error) {
                      if (callbacks.onError) {
                        callbacks.onError(error)
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  private fastProcess(data: any): any { return data }
  private slowProcess(data: any): any { return data }
  private defaultProcess(data: any): any { return data }
  private processTypeB(data: any): any { return data }
  private processUnknown(data: any): any { return data }
}