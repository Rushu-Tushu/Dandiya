// IndexedDB storage for private cryptographic keys
const DB_NAME = 'dandiya_e2ee_keystore';
const DB_VERSION = 1;
const STORE_NAME = 'identity_keys';

function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface StoredKeyPair {
  userId: string;
  publicKeyJWK: JsonWebKey;
  privateKeyJWK: JsonWebKey;
  createdAt: number;
}

export async function saveIdentityKeyPair(userId: string, keyPair: CryptoKeyPair): Promise<StoredKeyPair> {
  const pubJWK = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privJWK = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

  const record: StoredKeyPair = {
    userId,
    publicKeyJWK: pubJWK,
    privateKeyJWK: privJWK,
    createdAt: Date.now(),
  };

  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function getIdentityKeyPair(userId: string): Promise<CryptoKeyPair | null> {
  const db = await openKeyDB();
  const record: StoredKeyPair | null = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(userId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });

  if (!record) return null;

  const publicKey = await window.crypto.subtle.importKey(
    'jwk',
    record.publicKeyJWK,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );

  const privateKey = await window.crypto.subtle.importKey(
    'jwk',
    record.privateKeyJWK,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  return { publicKey, privateKey };
}

export async function hasIdentityKeyPair(userId: string): Promise<boolean> {
  const db = await openKeyDB();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(userId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function getStoredKeyPairRecord(userId: string): Promise<StoredKeyPair | null> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(userId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveRawKeyPairRecord(record: StoredKeyPair): Promise<void> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
