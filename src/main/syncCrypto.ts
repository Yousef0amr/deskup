import { createCipheriv, createDecipheriv, randomBytes, scrypt as scryptCb } from 'crypto'

/**
 * Encryption for team/personal sync folders protected by a passphrase.
 *
 * - The key is derived from the passphrase with scrypt (salt stored in workspace.json).
 * - Every device file is sealed with AES-256-GCM (random IV per write, auth tag checked
 *   on read), so the cloud provider — or anyone who only gets the folder — sees nothing.
 * - workspace.json carries a sealed known value ("check") so a wrong passphrase is caught
 *   before anything is written.
 */

export interface Sealed {
  iv: string
  tag: string
  data: string
}

export interface EncryptionInfo {
  alg: 'aes-256-gcm'
  kdf: 'scrypt'
  /** scrypt cost parameters, stored so they can be raised later without breaking old folders. */
  N: number
  r: number
  p: number
  salt: string
  check: Sealed
}

const CHECK_TEXT = 'deskup-sync-key-check-v1'
const DEFAULT_COST = { N: 1 << 15, r: 8, p: 1 }

function scrypt(passphrase: string, salt: Buffer, cost: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(passphrase.normalize('NFKC'), salt, 32, { ...cost, maxmem: 256 * cost.N * cost.r }, (err, key) =>
      err ? reject(err) : resolve(key)
    )
  })
}

export function seal(key: Buffer, plaintext: string): Sealed {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') }
}

/** Throws if the key is wrong or the data was tampered with. */
export function open(key: Buffer, sealed: Sealed): string {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(sealed.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(sealed.tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(sealed.data, 'base64')), decipher.final()]).toString('utf8')
}

/** New encryption settings for a folder, plus the derived key. */
export async function createEncryption(passphrase: string): Promise<{ info: EncryptionInfo; key: Buffer }> {
  const salt = randomBytes(16)
  const key = await scrypt(passphrase, salt, DEFAULT_COST)
  return {
    key,
    info: { alg: 'aes-256-gcm', kdf: 'scrypt', ...DEFAULT_COST, salt: salt.toString('base64'), check: seal(key, CHECK_TEXT) }
  }
}

/** Derive the key for an existing folder; throws a friendly error on a wrong passphrase. */
export async function unlockEncryption(info: EncryptionInfo, passphrase: string): Promise<Buffer> {
  const key = await scrypt(passphrase, Buffer.from(info.salt, 'base64'), { N: info.N, r: info.r, p: info.p })
  if (!verifyKey(info, key)) throw new Error('That passphrase does not match this sync folder')
  return key
}

export function verifyKey(info: EncryptionInfo, key: Buffer): boolean {
  try {
    return open(key, info.check) === CHECK_TEXT
  } catch {
    return false
  }
}

export function isSealed(value: unknown): value is Sealed {
  const v = value as Sealed
  return !!v && typeof v.iv === 'string' && typeof v.tag === 'string' && typeof v.data === 'string'
}
