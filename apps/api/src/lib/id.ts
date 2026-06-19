import { customAlphabet } from "nanoid";

export const newId = () => customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 21)();

/** Short public slug for share URLs */
export const newSlug = () => customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8)();

export const newToken = () => customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", 32)();
