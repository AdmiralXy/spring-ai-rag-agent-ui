/**
 * Client side of the encrypted folder upload (scheme version 1), mirrors the backend UploadCrypto:
 *   master     = PBKDF2-SHA256(password, kdfSalt, kdfIterations) -> 256 bit
 *   sessionKey = HKDF-SHA256(master, salt = keySalt, info = hkdfInfo) -> AES-256-GCM
 *   message    = AES-GCM(sessionKey, iv = 12 random bytes, additionalData = AAD)
 *
 * The password is only used inside `deriveMasterKey`; everything after works with
 * non-extractable CryptoKeys that live in memory for the duration of one upload run.
 */

export const UPLOAD_CRYPTO_VERSION = 1

const AAD_PREFIX = 'envelope-v1|'
const encoder = new TextEncoder()

export interface Sealed {
  iv: string
  data: string
}

export function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
}

/** Fails fast if the backend announces a scheme this client does not implement. */
export function assertSupportedEncryption(cfg: UploadEncryptionConfig) {
  const supported =
    cfg.version === UPLOAD_CRYPTO_VERSION &&
    cfg.kdf === 'PBKDF2-SHA256' &&
    cfg.hkdf === 'HKDF-SHA256' &&
    cfg.cipher === 'AES-256-GCM' &&
    cfg.ivLength === 12 &&
    cfg.tagLength === 16
  if (!supported) {
    throw new Error(
      `Unsupported upload encryption (version ${cfg.version}), please reload the page`
    )
  }
}

/** password -> non-extractable HKDF base key. Slow on purpose (PBKDF2), call once per upload run. */
export async function deriveMasterKey(
  password: string,
  cfg: UploadEncryptionConfig
): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const master = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: encoder.encode(cfg.kdfSalt),
        iterations: cfg.kdfIterations
      },
      passwordKey,
      256
    )
  )
  try {
    return await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveKey'])
  } finally {
    master.fill(0)
  }
}

/** master + per-session keySalt -> non-extractable AES-256-GCM key. Cheap. */
export function deriveSessionKey(
  masterKey: CryptoKey,
  keySalt: Uint8Array<ArrayBuffer>,
  cfg: UploadEncryptionConfig
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: keySalt, info: encoder.encode(cfg.hkdfInfo) },
    masterKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
}

export function randomKeySalt(cfg: UploadEncryptionConfig): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(cfg.keySaltLength))
}

export async function seal(key: CryptoKey, plaintext: BufferSource, aad: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(aad) },
    key,
    plaintext
  )
  return { iv: toBase64(iv), data: toBase64(ciphertext) }
}

export function sealManifest(key: CryptoKey, manifest: UploadManifest) {
  return seal(key, encoder.encode(JSON.stringify(manifest)), `${AAD_PREFIX}create`)
}

export function sealChunk(
  key: CryptoKey,
  uploadId: string,
  fileIndex: number,
  chunkIndex: number,
  bytes: BufferSource
) {
  return seal(key, bytes, `${AAD_PREFIX}chunk|${uploadId.toLowerCase()}|${fileIndex}|${chunkIndex}`)
}

/** Value of the X-Upload-Proof header: `<base64 iv>.<base64 data>` over an empty plaintext. */
export async function uploadProof(key: CryptoKey, action: 'complete' | 'cancel', uploadId: string) {
  const sealed = await seal(
    key,
    new Uint8Array(0),
    `${AAD_PREFIX}${action}|${uploadId.toLowerCase()}`
  )
  return `${sealed.iv}.${sealed.data}`
}
