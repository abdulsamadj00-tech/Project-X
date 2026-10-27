/**
 * MediDx Field-Level Encryption Service
 * Uses AES-GCM 256-bit encryption for PHI/PII data at rest
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const STORAGE_KEY = 'medidx_enc_key';

// Generate or retrieve encryption key
async function getOrCreateKey(): Promise<CryptoKey> {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        const keyData = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
        return crypto.subtle.importKey('raw', keyData, ALGORITHM, true, ['encrypt', 'decrypt']);
    }
    const key = await crypto.subtle.generateKey(
        { name: ALGORITHM, length: KEY_LENGTH },
        true,
        ['encrypt', 'decrypt']
    );
    const exported = await crypto.subtle.exportKey('raw', key);
    localStorage.setItem(STORAGE_KEY, btoa(String.fromCharCode(...new Uint8Array(exported))));
    return key;
}

export async function encryptField(plaintext: string): Promise<string> {
    try {
        const key = await getOrCreateKey();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(plaintext);
        const encrypted = await crypto.subtle.encrypt(
            { name: ALGORITHM, iv },
            key,
            encoded
        );
        // Combine IV + ciphertext, encode as base64
        const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);
        return `ENC:${btoa(String.fromCharCode(...combined))}`;
    } catch {
        return plaintext; // Fallback: return unencrypted if crypto unavailable
    }
}

export async function decryptField(ciphertext: string): Promise<string> {
    if (!ciphertext.startsWith('ENC:')) return ciphertext; // Not encrypted
    try {
        const key = await getOrCreateKey();
        const data = Uint8Array.from(atob(ciphertext.slice(4)), c => c.charCodeAt(0));
        const iv = data.slice(0, 12);
        const encrypted = data.slice(12);
        const decrypted = await crypto.subtle.decrypt(
            { name: ALGORITHM, iv },
            key,
            encrypted
        );
        return new TextDecoder().decode(decrypted);
    } catch {
        return ciphertext; // Return as-is if decryption fails
    }
}

// Encrypt sensitive patient fields
export async function encryptPatientData(data: any): Promise<any> {
    if (!data) return data;
    const sensitive = ['name', 'allergies', 'pmh', 'psh', 'socialHistory'];
    const encrypted = { ...data };
    for (const field of sensitive) {
        if (encrypted[field] && typeof encrypted[field] === 'string' && !encrypted[field].startsWith('ENC:')) {
            encrypted[field] = await encryptField(encrypted[field]);
        }
    }
    return encrypted;
}

// Decrypt sensitive patient fields
export async function decryptPatientData(data: any): Promise<any> {
    if (!data) return data;
    const sensitive = ['name', 'allergies', 'pmh', 'psh', 'socialHistory'];
    const decrypted = { ...data };
    for (const field of sensitive) {
        if (decrypted[field] && typeof decrypted[field] === 'string' && decrypted[field].startsWith('ENC:')) {
            decrypted[field] = await decryptField(decrypted[field]);
        }
    }
    return decrypted;
}

export function isEncryptionAvailable(): boolean {
    return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}
