/* Semillero — cifrado de respaldos con Web Crypto (AES-GCM 256 + PBKDF2-SHA256). */
'use strict';

const Vault = (() => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const ITERATIONS = 310000;

  function toB64(buf) {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(s);
  }

  function fromB64(str) {
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function deriveKey(pass, salt, iterations) {
    const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encrypt(obj, pass) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(pass, salt, ITERATIONS);
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
    return JSON.stringify({
      app: 'semillero-backup', v: 1, cipher: 'AES-GCM-256', kdf: 'PBKDF2-SHA256',
      iterations: ITERATIONS, salt: toB64(salt), iv: toB64(iv), data: toB64(data)
    });
  }

  async function decrypt(text, pass) {
    let pkg;
    try { pkg = JSON.parse(text); } catch (e) { throw new Error('El archivo no se puede leer.'); }
    if (pkg.app !== 'semillero-backup') throw new Error('El archivo no es un respaldo cifrado de Semillero.');
    const key = await deriveKey(pass, fromB64(pkg.salt), pkg.iterations);
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(pkg.iv) }, key, fromB64(pkg.data));
      return JSON.parse(dec.decode(plain));
    } catch (e) {
      throw new Error('Contraseña incorrecta o archivo dañado.');
    }
  }

  return { encrypt, decrypt };
})();
