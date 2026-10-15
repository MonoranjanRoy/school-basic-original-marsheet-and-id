import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';

const COST = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export const MIN_PASSWORD_LENGTH = 10;

/** Readable temporary password, e.g. "kite-9472-river". */
export function temporaryPassword(): string {
  const words = ['amber', 'river', 'maple', 'kite', 'lotus', 'cloud', 'tiger', 'pearl', 'cedar', 'comet', 'delta', 'ember', 'falcon', 'harbor', 'jasmine', 'lemon', 'mango', 'orbit', 'quartz', 'sunny'];
  const w = () => words[randomInt(words.length)];
  return `${w()}-${randomInt(1000, 10000)}-${w()}`;
}

/** Hash compared against when the username does not exist, so timing doesn't reveal valid usernames. */
export const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', COST);
