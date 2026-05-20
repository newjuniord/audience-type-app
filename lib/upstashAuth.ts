import { redis } from './redis'

export const upstashSession = {
  async open(phoneNumber: string, type: 'whatsapp' | 'sms') {
    const key = `session:${type}:${phoneNumber.trim()}`
    await redis.set(key, true, { ex: 72000 }) // Expiration 20h
  },
  async checkActive(phoneNumber: string, type: 'whatsapp' | 'sms'): Promise<boolean> {
    const key = `session:${type}:${phoneNumber.trim()}`
    const isActive = await redis.get<boolean>(key)
    return isActive === true
  }
}

export const upstashSpamShield = {
  async checkAndIncrement(phoneNumber: string, type: 'whatsapp' | 'sms'): Promise<{ isBlocked: boolean; attemptsLeft: number }> {
    const key = `spam:check:${type}:${phoneNumber.trim()}`
    const maxLimit = type === 'whatsapp' ? 5 : 3
    
    const currentAttempts = await redis.incr(key)
    
    if (currentAttempts === 1) {
      await redis.expire(key, 86400) // Expiration 24h fixée au premier clic
    }
    
    if (currentAttempts > maxLimit) {
      return { isBlocked: true, attemptsLeft: 0 }
    }
    
    return { isBlocked: false, attemptsLeft: maxLimit - currentAttempts }
  }
}
