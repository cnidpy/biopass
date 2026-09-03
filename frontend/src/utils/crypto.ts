/**
 * Zero-Knowledge Client-Side Cryptography Utility
 * Uses the Web Crypto API for standard PBKDF2 key derivation and AES-256-GCM decryption
 */

export interface EncryptedPayload {
  iv: string;         // Base64
  authTag: string;    // Base64
  ciphertext: string; // Base64
}

export class ClientCrypto {
  /**
   * Derives a 256-bit AES-GCM CryptoKey using PBKDF2 from user's 4-digit PIN + Salt
   */
  private static async deriveKey(pin: string, saltHex: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const pinKey = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Convert hex salt to Uint8Array
    const saltBytes = new Uint8Array(
      saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000,
        hash: 'SHA-256',
      },
      pinKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Helper: Base64 string to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Decrypts AES-256-GCM encrypted payload on the browser client
   */
  public static async decryptMedicalBlob(
    encryptedBlobJson: string,
    pin: string,
    saltHex: string
  ): Promise<any> {
    try {
      const payload: EncryptedPayload = JSON.parse(encryptedBlobJson);
      const key = await this.deriveKey(pin, saltHex);

      const iv = this.base64ToArrayBuffer(payload.iv);
      const ciphertext = this.base64ToArrayBuffer(payload.ciphertext);
      const authTag = this.base64ToArrayBuffer(payload.authTag);

      // In Web Crypto AES-GCM, the ciphertext must be concatenated with the 16-byte auth tag at the end
      const combined = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
      combined.set(new Uint8Array(ciphertext), 0);
      combined.set(new Uint8Array(authTag), ciphertext.byteLength);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(iv),
          tagLength: 128,
        },
        key,
        combined
      );

      const dec = new TextDecoder();
      const plaintext = dec.decode(decryptedBuffer);

      try {
        return JSON.parse(plaintext);
      } catch {
        return plaintext;
      }
    } catch (err: any) {
      console.error('Client decryption error:', err);
      throw new Error('PIN incorrecto o no se pudo descifrar la información médica.');
    }
  }
}
