import crypto from 'crypto'

// Явно указываем, что переменные окружения определены после проверки
const ENCRYPTION_KEY: string = process.env.ENCRYPTION_KEY!
const ENCRYPTION_IV: string = process.env.ENCRYPTION_IV!

if (!ENCRYPTION_KEY || !ENCRYPTION_IV) {
    throw new Error('Encryption key and IV must be set in environment variables')
}

export function encrypt(text: string): string {
    const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        Buffer.from(ENCRYPTION_KEY, 'hex'),
        Buffer.from(ENCRYPTION_IV, 'hex')
    )

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    return JSON.stringify({
        encrypted,
        authTag: authTag.toString('hex')
    })
}

export function decrypt(encryptedData: string): string {
    try {
        const { encrypted, authTag } = JSON.parse(encryptedData)

        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            Buffer.from(ENCRYPTION_KEY, 'hex'),
            Buffer.from(ENCRYPTION_IV, 'hex')
        )

        decipher.setAuthTag(Buffer.from(authTag, 'hex'))

        let decrypted = decipher.update(encrypted, 'hex', 'utf8')
        decrypted += decipher.final('utf8')

        return decrypted
    } catch (error) {
        console.error('Decryption failed:', error)
        throw new Error('Failed to decrypt token')
    }
}