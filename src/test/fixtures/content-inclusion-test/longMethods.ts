/**
 * Test fixture for content inclusion feature
 * Contains 4 functions with similar names and varying lengths
 */

/**
 * A very long method to test full content inclusion (1 result scenario)
 * This method has 200+ lines to test the full content inclusion
 */
export function processUserData(userData: any): any {
  // Line 10
  console.log('Starting user data processing...')
  
  // Validate input data
  if (!userData) {
    throw new Error('User data is required')
  }
  
  // Line 17
  if (!userData.id) {
    throw new Error('User ID is required')
  }
  
  if (!userData.email) {
    throw new Error('Email is required')
  }
  
  // Line 25
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(userData.email)) {
    throw new Error('Invalid email format')
  }
  
  // Normalize user data
  // Line 31
  const normalizedData = {
    id: userData.id.toString().trim(),
    email: userData.email.toLowerCase().trim(),
    firstName: userData.firstName?.trim() || '',
    lastName: userData.lastName?.trim() || '',
    phone: userData.phone?.replace(/\D/g, '') || '',
    address: {
      street: userData.address?.street?.trim() || '',
      city: userData.address?.city?.trim() || '',
      state: userData.address?.state?.toUpperCase()?.trim() || '',
      zipCode: userData.address?.zipCode?.replace(/\D/g, '') || '',
      country: userData.address?.country?.toUpperCase()?.trim() || 'US'
    },
    preferences: {
      notifications: userData.preferences?.notifications !== false,
      marketing: userData.preferences?.marketing === true,
      theme: userData.preferences?.theme || 'light',
      language: userData.preferences?.language || 'en'
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      source: 'api'
    }
  }
  
  // Line 54
  // Validate phone number if provided
  if (normalizedData.phone && normalizedData.phone.length < 10) {
    throw new Error('Phone number must be at least 10 digits')
  }
  
  // Validate address if provided
  // Line 60
  if (normalizedData.address.street || normalizedData.address.city) {
    if (!normalizedData.address.street) {
      throw new Error('Street address is required when city is provided')
    }
    if (!normalizedData.address.city) {
      throw new Error('City is required when street address is provided')
    }
    if (!normalizedData.address.zipCode) {
      throw new Error('ZIP code is required for address')
    }
  }
  
  // Line 71
  // Process user permissions based on email domain
  const emailDomain = normalizedData.email.split('@')[1]
  const trustedDomains = ['company.com', 'trusted.org', 'partner.net']
  const isTrustedDomain = trustedDomains.includes(emailDomain)
  
  let permissions = ['read']
  if (isTrustedDomain) {
    permissions = ['read', 'write', 'delete', 'admin']
  } else if (emailDomain.endsWith('.edu')) {
    permissions = ['read', 'write']
  } else if (emailDomain.endsWith('.gov')) {
    permissions = ['read', 'write', 'audit']
  }
  
  // Line 85
  // Calculate user score based on completeness
  let completenessScore = 0
  if (normalizedData.firstName) completenessScore += 10
  if (normalizedData.lastName) completenessScore += 10
  if (normalizedData.phone) completenessScore += 15
  if (normalizedData.address.street) completenessScore += 20
  if (normalizedData.address.city) completenessScore += 10
  if (normalizedData.address.state) completenessScore += 10
  if (normalizedData.address.zipCode) completenessScore += 15
  if (normalizedData.preferences.notifications) completenessScore += 5
  if (normalizedData.preferences.marketing) completenessScore += 5
  
  // Line 96
  // Determine user tier based on score and domain
  let userTier = 'basic'
  if (completenessScore >= 80 && isTrustedDomain) {
    userTier = 'premium'
  } else if (completenessScore >= 60) {
    userTier = 'standard'
  } else if (completenessScore >= 40) {
    userTier = 'bronze'
  }
  
  // Line 106
  // Generate user profile
  const userProfile = {
    ...normalizedData,
    permissions,
    completenessScore,
    userTier,
    features: {
      canExport: permissions.includes('write'),
      canShare: completenessScore >= 50,
      canCustomize: userTier !== 'basic',
      hasAnalytics: ['premium', 'standard'].includes(userTier),
      supportLevel: isTrustedDomain ? 'priority' : 'standard'
    }
  }
  
  // Line 119
  // Log processing result
  console.log(`Processed user ${userProfile.id} with tier ${userTier}`)
  console.log(`Completeness score: ${completenessScore}/100`)
  console.log(`Permissions: ${permissions.join(', ')}`)
  
  // Additional processing steps
  if (userProfile.preferences.notifications) {
    console.log('User opted in for notifications')
    // Schedule welcome notification
    scheduleNotification(userProfile.id, 'welcome', 0)
    scheduleNotification(userProfile.id, 'tips', 24)
    scheduleNotification(userProfile.id, 'feedback', 168)
  }
  
  // Line 132
  if (userProfile.preferences.marketing) {
    console.log('User opted in for marketing')
    // Add to marketing campaigns
    addToMarketingList(userProfile.id, 'weekly-newsletter')
    addToMarketingList(userProfile.id, 'product-updates')
    if (userTier === 'premium') {
      addToMarketingList(userProfile.id, 'exclusive-offers')
    }
  }
  
  // Line 142
  // Update user analytics
  trackUserEvent('user_processed', {
    userId: userProfile.id,
    tier: userTier,
    score: completenessScore,
    domain: emailDomain,
    trusted: isTrustedDomain
  })
  
  // Final validation
  // Line 152
  if (!userProfile.id || !userProfile.email) {
    throw new Error('Critical data missing after processing')
  }
  
  return userProfile
}

/**
 * Second method with similar name - medium length (100+ lines)
 */
export function processUserDataBatch(userDataArray: any[]): any[] {
  console.log(`Processing batch of ${userDataArray.length} users`)
  
  const results: any[] = []
  const errors: any[] = []
  
  for (let i = 0; i < userDataArray.length; i++) {
    try {
      const userData = userDataArray[i]
      console.log(`Processing user ${i + 1}/${userDataArray.length}`)
      
      // Basic validation
      if (!userData || typeof userData !== 'object') {
        throw new Error(`Invalid user data at index ${i}`)
      }
      
      // Process individual user
      const processedUser = processUserData(userData)
      results.push(processedUser)
      
      // Add batch-specific metadata
      processedUser.batchInfo = {
        batchId: generateBatchId(),
        position: i,
        totalCount: userDataArray.length,
        processedAt: new Date().toISOString()
      }
      
      console.log(`Successfully processed user ${processedUser.id}`)
      
    } catch (error) {
      console.error(`Error processing user at index ${i}:`, error)
      errors.push({
        index: i,
        userData: userDataArray[i],
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  // Generate batch summary
  const batchSummary = {
    totalProcessed: results.length,
    totalErrors: errors.length,
    successRate: (results.length / userDataArray.length) * 100,
    processedAt: new Date().toISOString(),
    errors: errors.length > 0 ? errors : undefined
  }
  
  console.log('Batch processing complete:', batchSummary)
  
  // Log batch metrics
  trackUserEvent('batch_processed', {
    batchSize: userDataArray.length,
    successCount: results.length,
    errorCount: errors.length,
    successRate: batchSummary.successRate
  })
  
  return results
}

/**
 * Third method with similar name - medium length (80+ lines)
 */
export function processUserDataStream(dataStream: AsyncIterable<any>): AsyncGenerator<any> {
  return (async function* () {
    console.log('Starting user data stream processing')
    
    let processedCount = 0
    let errorCount = 0
    const startTime = Date.now()
    
    try {
      for await (const userData of dataStream) {
        try {
          console.log(`Processing streamed user ${processedCount + 1}`)
          
          // Validate streaming data
          if (!userData) {
            throw new Error('Null user data in stream')
          }
          
          // Process with stream-specific enhancements
          const processedUser = processUserData(userData)
          
          // Add streaming metadata
          processedUser.streamInfo = {
            streamPosition: processedCount,
            processedAt: new Date().toISOString(),
            processingTime: Date.now() - startTime
          }
          
          processedCount++
          yield processedUser
          
          // Periodic logging for long streams
          if (processedCount % 100 === 0) {
            console.log(`Stream progress: ${processedCount} users processed`)
          }
          
        } catch (error) {
          errorCount++
          console.error(`Stream processing error at position ${processedCount}:`, error)
          
          // Yield error result instead of throwing
          yield {
            error: true,
            position: processedCount,
            message: error instanceof Error ? error.message : 'Unknown error',
            originalData: userData
          }
        }
      }
    } finally {
      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      console.log(`Stream processing complete: ${processedCount} processed, ${errorCount} errors in ${totalTime}ms`)
      
      // Log final stream metrics
      trackUserEvent('stream_processed', {
        totalProcessed: processedCount,
        totalErrors: errorCount,
        processingTime: totalTime,
        averageTime: totalTime / (processedCount || 1)
      })
    }
  })()
}

/**
 * Fourth method with similar name - shorter (50+ lines)
 */
export function processUserDataValidation(userData: any): boolean {
  console.log('Validating user data for processing')
  
  // Basic type validation
  if (!userData || typeof userData !== 'object') {
    console.error('Invalid user data: not an object')
    return false
  }
  
  // Required field validation
  const requiredFields = ['id', 'email']
  for (const field of requiredFields) {
    if (!userData[field]) {
      console.error(`Invalid user data: missing required field '${field}'`)
      return false
    }
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(userData.email)) {
    console.error('Invalid user data: email format is invalid')
    return false
  }
  
  // Optional field validation
  if (userData.phone && typeof userData.phone !== 'string') {
    console.error('Invalid user data: phone must be a string')
    return false
  }
  
  if (userData.address && typeof userData.address !== 'object') {
    console.error('Invalid user data: address must be an object')
    return false
  }
  
  // Advanced validation
  if (userData.preferences && typeof userData.preferences !== 'object') {
    console.error('Invalid user data: preferences must be an object')
    return false
  }
  
  console.log('User data validation passed')
  return true
}

// Helper functions referenced by the main methods
function scheduleNotification(userId: string, type: string, delayHours: number): void {
  console.log(`Scheduled ${type} notification for user ${userId} in ${delayHours} hours`)
}

function addToMarketingList(userId: string, listName: string): void {
  console.log(`Added user ${userId} to marketing list: ${listName}`)
}

function trackUserEvent(eventName: string, data: any): void {
  console.log(`Tracked event ${eventName}:`, JSON.stringify(data, null, 2))
}

function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}