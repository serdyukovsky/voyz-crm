/**
 * Data Normalization Utilities
 * Pure utility functions for normalizing phone numbers, emails, social links, and text fields
 */

import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

// Re-export CountryCode for use in decorators
export type { CountryCode };
import { promises as dns } from 'dns';

export interface SocialLinks {
  instagram?: string;
  telegram?: string;
  whatsapp?: string;
  vk?: string;
  linkedin?: string;
}

/**
 * Normalize phone number to E.164 format
 * @param phone - Phone number string (can be in any format)
 * @param defaultCountry - Default country code (ISO 3166-1 alpha-2) for parsing
 * @returns Normalized phone number in E.164 format or null if invalid
 */
export function normalizePhone(
  phone: string | null | undefined,
  defaultCountry: CountryCode = 'RU',
): string | null {
  if (!phone) return null;

  const trimmed = phone.trim();
  if (!trimmed) return null;

  try {
    const phoneNumber = parsePhoneNumber(trimmed, defaultCountry);
    if (phoneNumber.isValid()) {
      return phoneNumber.format('E.164');
    }
    return null;
  } catch (error) {
    // If parsing fails, try to clean and parse again
    const cleaned = trimmed.replace(/[^\d+]/g, '');
    if (!cleaned) return null;

    try {
      const phoneNumber = parsePhoneNumber(cleaned, defaultCountry);
      if (phoneNumber.isValid()) {
        return phoneNumber.format('E.164');
      }
    } catch {
      // Ignore parsing errors
    }

    return null;
  }
}

/**
 * Validate phone number format
 * @param phone - Phone number string
 * @param defaultCountry - Default country code for validation
 * @returns true if phone number is valid
 */
export function isValidPhone(phone: string | null | undefined, defaultCountry: CountryCode = 'RU'): boolean {
  if (!phone) return false;
  try {
    return isValidPhoneNumber(phone.trim(), defaultCountry);
  } catch {
    return false;
  }
}

/**
 * Normalize email address: trim, toLowerCase, validate format
 * @param email - Email address string
 * @returns Normalized email or null if invalid
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;

  const trimmed = email.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase();

  // Basic email format validation (RFC 5322 simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Validate email format and optionally check MX record
 * @param email - Email address string
 * @param checkMx - Whether to check MX record (async DNS lookup)
 * @returns Promise<boolean> - true if email is valid (and has MX record if checkMx is true)
 */
export async function isValidEmail(
  email: string | null | undefined,
  checkMx: boolean = false,
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  if (!checkMx) return true;

  try {
    const domain = normalized.split('@')[1];
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords.length > 0;
  } catch {
    // If MX lookup fails, assume invalid
    return false;
  }
}

/**
 * Normalize Instagram username
 * @param username - Instagram username or URL
 * @returns Normalized username (without @ and URL parts)
 */
function normalizeInstagram(username: string): string | null {
  if (!username) return null;

  let cleaned = username.trim();
  if (!cleaned) return null;

  // Remove URL parts
  cleaned = cleaned.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  cleaned = cleaned.replace(/^instagram\.com\//i, '');
  cleaned = cleaned.replace(/^@/, '');

  // Instagram username rules: 1-30 characters, alphanumeric, periods, underscores
  const instagramRegex = /^[a-zA-Z0-9._]{1,30}$/;
  if (!instagramRegex.test(cleaned)) {
    return null;
  }

  return cleaned.toLowerCase();
}

/**
 * Normalize Telegram username
 * @param username - Telegram username or URL
 * @returns Normalized username (without @ and URL parts)
 */
function normalizeTelegram(username: string): string | null {
  if (!username) return null;

  let cleaned = username.trim();
  if (!cleaned) return null;

  // Remove URL parts
  cleaned = cleaned.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '');
  cleaned = cleaned.replace(/^@/, '');

  // Telegram username rules: 5-32 characters, alphanumeric, underscores
  const telegramRegex = /^[a-zA-Z0-9_]{5,32}$/;
  if (!telegramRegex.test(cleaned)) {
    return null;
  }

  return cleaned.toLowerCase();
}

/**
 * Normalize WhatsApp number (phone number format)
 * @param number - WhatsApp number or phone number
 * @param defaultCountry - Default country code for phone parsing
 * @returns Normalized phone number in E.164 format
 */
function normalizeWhatsApp(
  number: string,
  defaultCountry: CountryCode = 'RU',
): string | null {
  if (!number) return null;

  let cleaned = number.trim();
  if (!cleaned) return null;

  // Remove WhatsApp URL parts
  cleaned = cleaned.replace(/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i, '');
  cleaned = cleaned.replace(/^whatsapp:\/\//i, '');

  // Normalize as phone number
  return normalizePhone(cleaned, defaultCountry);
}

/**
 * Normalize VK username
 * @param username - VK username, ID, or URL
 * @returns Normalized username or ID
 */
function normalizeVK(username: string): string | null {
  if (!username) return null;

  let cleaned = username.trim();
  if (!cleaned) return null;

  // Remove URL parts
  cleaned = cleaned.replace(/^https?:\/\/(www\.)?vk\.com\//i, '');
  cleaned = cleaned.replace(/^vk\.com\//i, '');
  cleaned = cleaned.replace(/^@/, '');

  // VK can be numeric ID or username (3-32 characters, alphanumeric, underscores, dots)
  const vkRegex = /^[a-zA-Z0-9._]{3,32}$|^\d+$/;
  if (!vkRegex.test(cleaned)) {
    return null;
  }

  return cleaned.toLowerCase();
}

/**
 * Normalize LinkedIn URL or username
 * @param linkedin - LinkedIn URL or username
 * @returns Normalized LinkedIn URL or username
 */
function normalizeLinkedIn(linkedin: string): string | null {
  if (!linkedin) return null;

  let cleaned = linkedin.trim();
  if (!cleaned) return null;

  // If it's already a full URL, validate and return
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    const linkedinUrlRegex = /^https?:\/\/(www\.)?linkedin\.com\/(in|company|pub|profile)\/[a-zA-Z0-9-]+/i;
    if (linkedinUrlRegex.test(cleaned)) {
      return cleaned;
    }
    return null;
  }

  // If it's just a username, construct URL
  const linkedinUsernameRegex = /^[a-zA-Z0-9-]+$/;
  if (linkedinUsernameRegex.test(cleaned)) {
    return `https://www.linkedin.com/in/${cleaned}`;
  }

  return null;
}

/**
 * Normalize social links object
 * Supports username-only input and full URLs
 * @param social - Social links object
 * @param defaultCountry - Default country code for WhatsApp phone parsing
 * @returns Normalized social links object
 */
export function normalizeSocialLinks(
  social: SocialLinks | null | undefined,
  defaultCountry: CountryCode = 'RU',
): SocialLinks | null {
  if (!social || typeof social !== 'object') {
    return null;
  }

  const normalized: SocialLinks = {};
  let hasAnyLink = false;

  if (social.instagram) {
    const normalizedInstagram = normalizeInstagram(social.instagram);
    if (normalizedInstagram) {
      normalized.instagram = normalizedInstagram;
      hasAnyLink = true;
    }
  }

  if (social.telegram) {
    const normalizedTelegram = normalizeTelegram(social.telegram);
    if (normalizedTelegram) {
      normalized.telegram = normalizedTelegram;
      hasAnyLink = true;
    }
  }

  if (social.whatsapp) {
    const normalizedWhatsApp = normalizeWhatsApp(social.whatsapp, defaultCountry);
    if (normalizedWhatsApp) {
      normalized.whatsapp = normalizedWhatsApp;
      hasAnyLink = true;
    }
  }

  if (social.vk) {
    const normalizedVK = normalizeVK(social.vk);
    if (normalizedVK) {
      normalized.vk = normalizedVK;
      hasAnyLink = true;
    }
  }

  if (social.linkedin) {
    const normalizedLinkedIn = normalizeLinkedIn(social.linkedin);
    if (normalizedLinkedIn) {
      normalized.linkedin = normalizedLinkedIn;
      hasAnyLink = true;
    }
  }

  return hasAnyLink ? normalized : null;
}

/**
 * Sanitize text fields: trim whitespace, remove excessive spaces
 * @param text - Text string to sanitize
 * @returns Sanitized text or null if empty
 */
export function sanitizeTextFields(text: string | null | undefined): string | null {
  if (!text) return null;

  const trimmed = text.trim();
  if (!trimmed) return null;

  // Replace multiple spaces with single space
  const sanitized = trimmed.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Sanitize optional text field
 * @param text - Text string to sanitize
 * @returns Sanitized text or undefined if empty
 */
export function sanitizeOptionalTextFields(text: string | null | undefined): string | undefined {
  const sanitized = sanitizeTextFields(text);
  return sanitized || undefined;
}






