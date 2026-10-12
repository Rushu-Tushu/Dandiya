import {
  getIdentityKeyPair,
  saveIdentityKeyPair,
  getStoredKeyPairRecord,
  saveRawKeyPairRecord,
  StoredKeyPair,
} from './keyStore';
import { api } from '../api';

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
   * Derives an AES-256-GCM Key Encryption Key (KEK) using PBKDF2 (SHA-256).
   * Zero-Knowledge guarantee: password/passphrase never leaves client.
   */
  private static async deriveKeyEncryptionKey(
    passphrase: string,
    salt: Uint8Array,
    iterations = 100000
  ): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as any,
        iterations: iterations,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Creates an opaque zero-knowledge encrypted backup of the user's private key JWK.
   * Transmitted payload contains ONLY AES-GCM ciphertext + random IV + salt.
   * Server NEVER receives plaintext keys.
   */
  public static async createEncryptedKeyBackup(
    userId: string,
    passphrase: string
  ): Promise<{ encryptedKeyJWK: string; iv: string; salt: string; iterations: number }> {
    const record = await getStoredKeyPairRecord(userId);
    if (!record) {
      throw new Error('No local identity key found to back up.');
    }

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const iterations = 100000;

    const kek = await this.deriveKeyEncryptionKey(passphrase, salt, iterations);
    const plaintextBytes = new TextEncoder().encode(JSON.stringify(record));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      kek,
      plaintextBytes
    );

    return {
      encryptedKeyJWK: arrayBufferToBase64(encryptedBuffer),
      iv: arrayBufferToBase64(iv.buffer),
      salt: arrayBufferToBase64(salt.buffer),
      iterations,
    };
  }

  /**
   * Decrypts an opaque backup envelope using the user's passphrase/credential
   * and restores the identical Identity KeyPair into this device's IndexedDB.
   */
  public static async restoreFromEncryptedKeyBackup(
    userId: string,
    backup: { encryptedKeyJWK: string; iv: string; salt: string; iterations?: number },
    passphrase: string
  ): Promise<boolean> {
    try {
      const salt = new Uint8Array(base64ToArrayBuffer(backup.salt));
      const iv = new Uint8Array(base64ToArrayBuffer(backup.iv));
      const ciphertext = base64ToArrayBuffer(backup.encryptedKeyJWK);
      const iterations = backup.iterations || 100000;

      const kek = await this.deriveKeyEncryptionKey(passphrase, salt, iterations);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        kek,
        ciphertext
      );

      const jsonStr = new TextDecoder().decode(decryptedBuffer);
      const record: StoredKeyPair = JSON.parse(jsonStr);

      if (record && record.privateKeyJWK && record.publicKeyJWK) {
        await saveRawKeyPairRecord({
          userId,
          publicKeyJWK: record.publicKeyJWK,
          privateKeyJWK: record.privateKeyJWK,
          createdAt: record.createdAt || Date.now(),
        });
        this.sessionKeyCache.clear();
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[E2EE] Could not restore backup with provided credential:', err);
      return false;
    }
  }

  /**
   * Initializes or loads the client's Identity Key Pair.
   * If on a new device (e.g. mobile) and a passphrase/credential is available,
   * attempts to restore the canonical keypair from the zero-knowledge backup first.
   */
  public static async initClientKeys(userId: string, passphrase?: string): Promise<string> {
    let keyPair = await getIdentityKeyPair(userId);

    // If no local keypair, attempt zero-knowledge restoration if backup exists
    if (!keyPair && passphrase) {
      try {
        const backup = await api.getKeyBackup();
        if (backup && backup.encryptedKeyJWK) {
          const restored = await this.restoreFromEncryptedKeyBackup(userId, backup, passphrase);
          if (restored) {
            keyPair = await getIdentityKeyPair(userId);
          }
        }
      } catch {
        // No backup on server yet
      }
    }

    if (!keyPair) {
      // Generate new NIST P-256 ECDH KeyPair on this device
      keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256',
        },
        true, // extractable for IndexedDB backup
        ['deriveKey', 'deriveBits']
      );
      await saveIdentityKeyPair(userId, keyPair);

      // If passphrase was provided, automatically upload zero-knowledge backup to backend
      if (passphrase) {
        try {
          const backupPayload = await this.createEncryptedKeyBackup(userId, passphrase);
          await api.saveKeyBackup(backupPayload);
        } catch (backupErr) {
          console.warn('[E2EE] Automatic key backup creation notice:', backupErr);
        }
      }
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
      console.warn('[E2EE] Decryption or integrity check notice:', err);
      return '⚠️ [Decryption error: message integrity compromised or invalid key]';
    }
  }
}
