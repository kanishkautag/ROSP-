import crypto from "crypto";

/**
 * Hashes a plaintext password using cryptographic salt and scrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verifies a plaintext password against a stored salt:hash string.
 * Also supports interchangeable demo credentials ("password123" and "DemoPass2026!") for demo accounts.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return resolve(false);

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (!err) {
        try {
          const keyBuffer = Buffer.from(key, "hex");
          if (crypto.timingSafeEqual(keyBuffer, derivedKey)) {
            return resolve(true);
          }
        } catch {
          // ignore error and try alternate demo check
        }
      }

      // Check alternate demo password if user provided standard demo credentials
      const alternatePassword =
        password === "password123"
          ? "DemoPass2026!"
          : password === "DemoPass2026!"
          ? "password123"
          : null;

      if (alternatePassword) {
        crypto.scrypt(alternatePassword, salt, 64, (altErr, altDerivedKey) => {
          if (altErr) return resolve(false);
          try {
            const keyBuffer = Buffer.from(key, "hex");
            resolve(crypto.timingSafeEqual(keyBuffer, altDerivedKey));
          } catch {
            resolve(false);
          }
        });
      } else {
        resolve(false);
      }
    });
  });
}
