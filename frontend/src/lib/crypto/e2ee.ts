import { getIdentityKeyPair, saveIdentityKeyPair } from './keyStore';

// Base64 helpers
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const bytes = new Uint8Array(binary_string.length);
  for (let i = 0; i < binary_string.length; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface E2EEMessagePayload {
  ciphertext: string;
  iv: string;
  ephemeralPubKey: string;
}

export class E2EEService {
  private static sessionKeyCache = new Map<string, CryptoKey>();

  /**
   * Initializes or loads the client's Identity Key Pair.
   * Returns the public key JSON string ready for publication to backend.
   */
  public static async initClientKeys(userId: string): Promise<string> {
    let keyPair = await getIdentityKeyPair(userId);
    if (!keyPair) {
      // Generate new NIST P-256 ECDH KeyPair
      keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256',
        },
        true, // extractable for IndexedDB backup
        ['deriveKey', 'deriveBits']
      );
      await saveIdentityKeyPair(userId, keyPair);
    }

    const pubJWK = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
    return JSON.stringify(pubJWK);
  }

  /**
   * Derives symmetric AES-256-GCM session key via ECDH + HKDF.
   */
  public static async getSessionKey(
    myUserId: string,
    recipientPubKeyStr: string,
    conversationId: string
  ): Promise<CryptoKey> {
    const cacheKey = `${conversationId}:${myUserId}`;
    if (this.sessionKeyCache.has(cacheKey)) {
      return this.sessionKeyCache.get(cacheKey)!;
    }

    const myKeyPair = await getIdentityKeyPair(myUserId);
    if (!myKeyPair) {
      throw new Error('Local cryptographic identity not initialized.');
    }

    // Import recipient's public key
    const recipientJWK = JSON.parse(recipientPubKeyStr) as JsonWebKey;
    const recipientPubKey = await window.crypto.subtle.importKey(
      'jwk',
      recipientJWK,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    // 1. ECDH Shared Secret (256 bits)
    const sharedSecretBits = await window.crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: recipientPubKey,
      },
      myKeyPair.privateKey,
      256
    );

    // 2. Import shared bits as HKDF Master Key
    const hkdfKey = await window.crypto.subtle.importKey(
      'raw',
      sharedSecretBits,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );

    // 3. Derive AES-GCM-256 Session Key using conversationId as salt
    const enc = new TextEncoder();
    const sessionKey = await window.crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: enc.encode(conversationId),
        info: enc.encode('dandiya-e2ee-aes-gcm-256'),
      },
      hkdfKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    this.sessionKeyCache.set(cacheKey, sessionKey);
    return sessionKey;
  }

  /**
   * Client-side Authenticated Encryption (AES-GCM-256)
   */
  public static async encrypt(
    plaintext: string,
    myUserId: string,
    recipientPubKeyStr: string,
    conversationId: string
  ): Promise<E2EEMessagePayload> {
    const sessionKey = await this.getSessionKey(myUserId, recipientPubKeyStr, conversationId);

    // Generate cryptographically random 12-byte IV for every single message
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedPlaintext = new TextEncoder().encode(plaintext);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      sessionKey,
      encodedPlaintext
    );

    // Get my public key for reference
    const myKeyPair = await getIdentityKeyPair(myUserId);
    const pubJWK = myKeyPair ? await window.crypto.subtle.exportKey('jwk', myKeyPair.publicKey) : {};

    return {
      ciphertext: arrayBufferToBase64(ciphertextBuffer),
      iv: arrayBufferToBase64(iv.buffer),
      ephemeralPubKey: JSON.stringify(pubJWK),
    };
  }

  /**
   * Client-side Authenticated Decryption (AES-GCM-256)
   */
  public static async decrypt(
    ciphertextB64: string,
    ivB64: string,
    myUserId: string,
    senderPubKeyStr: string,
    conversationId: string
  ): Promise<string> {
    try {
      const sessionKey = await this.getSessionKey(myUserId, senderPubKeyStr, conversationId);
      const ciphertext = base64ToArrayBuffer(ciphertextB64);
      const iv = base64ToArrayBuffer(ivB64);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(iv),
        },
        sessionKey,
        ciphertext
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (err) {
      console.error('[E2EE] Decryption or integrity check failed:', err);
      return '⚠️ [Decryption error: message integrity compromised or invalid key]';
    }
  }
}
