import {
  normalizePhone,
  isValidPhone,
  normalizeEmail,
  isValidEmail,
  normalizeSocialLinks,
  sanitizeTextFields,
  sanitizeOptionalTextFields,
  SocialLinks,
} from './normalization.utils';

describe('Normalization Utils', () => {
  describe('normalizePhone', () => {
    it('should normalize Russian phone number to E.164', () => {
      expect(normalizePhone('+7 999 123 45 67')).toBe('+79991234567');
      expect(normalizePhone('8 (999) 123-45-67')).toBe('+79991234567');
      expect(normalizePhone('999 123 45 67', 'RU')).toBe('+79991234567');
    });

    it('should normalize US phone number to E.164', () => {
      // Test with explicit country code using a valid area code (212 = New York)
      const result1 = normalizePhone('+1 212 555 1234');
      expect(result1).toBe('+12125551234');
      
      // Test without country code but with US default
      const result2 = normalizePhone('(212) 555-1234', 'US');
      expect(result2).toBe('+12125551234');
    });

    it('should return null for invalid phone numbers', () => {
      expect(normalizePhone('invalid')).toBeNull();
      expect(normalizePhone('123')).toBeNull();
      expect(normalizePhone('')).toBeNull();
    });

    it('should return null for null or undefined', () => {
      expect(normalizePhone(null)).toBeNull();
      expect(normalizePhone(undefined)).toBeNull();
    });

    it('should handle phone numbers with special characters', () => {
      expect(normalizePhone('+7 (999) 123-45-67')).toBe('+79991234567');
      expect(normalizePhone('+7-999-123-45-67')).toBe('+79991234567');
    });
  });

  describe('isValidPhone', () => {
    it('should return true for valid phone numbers', () => {
      expect(isValidPhone('+79991234567')).toBe(true);
      // US numbers with country code - using a valid area code (212 = New York)
      expect(isValidPhone('+12125551234')).toBe(true);
      expect(isValidPhone('8 (999) 123-45-67', 'RU')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(isValidPhone('invalid')).toBe(false);
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone(null)).toBe(false);
      expect(isValidPhone(undefined)).toBe(false);
    });
  });

  describe('normalizeEmail', () => {
    it('should normalize email to lowercase', () => {
      expect(normalizeEmail('Test@Example.COM')).toBe('test@example.com');
      expect(normalizeEmail('  User@Domain.Com  ')).toBe('user@domain.com');
    });

    it('should trim whitespace', () => {
      expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
      expect(normalizeEmail('\t\ntest@example.com\n\t')).toBe('test@example.com');
    });

    it('should return null for invalid email formats', () => {
      expect(normalizeEmail('invalid')).toBeNull();
      expect(normalizeEmail('test@')).toBeNull();
      expect(normalizeEmail('@example.com')).toBeNull();
      // Note: 'test@example' is technically valid format (though not a real domain)
      // We'll test with clearly invalid formats
      expect(normalizeEmail('test@.com')).toBeNull();
      expect(normalizeEmail('@')).toBeNull();
    });

    it('should return null for empty strings', () => {
      expect(normalizeEmail('')).toBeNull();
      expect(normalizeEmail('   ')).toBeNull();
    });

    it('should return null for null or undefined', () => {
      expect(normalizeEmail(null)).toBeNull();
      expect(normalizeEmail(undefined)).toBeNull();
    });

    it('should accept valid email formats', () => {
      expect(normalizeEmail('test@example.com')).toBe('test@example.com');
      expect(normalizeEmail('user.name+tag@example.co.uk')).toBe('user.name+tag@example.co.uk');
      expect(normalizeEmail('test123@subdomain.example.com')).toBe('test123@subdomain.example.com');
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', async () => {
      expect(await isValidEmail('test@example.com')).toBe(true);
      expect(await isValidEmail('user@domain.co.uk')).toBe(true);
    });

    it('should return false for invalid emails', async () => {
      expect(await isValidEmail('invalid')).toBe(false);
      expect(await isValidEmail('test@')).toBe(false);
      expect(await isValidEmail(null)).toBe(false);
    });

    // Note: MX check tests would require mocking DNS or using a real domain
    // For unit tests, we'll skip MX validation tests
  });

  describe('normalizeSocialLinks', () => {
    it('should normalize Instagram username from URL', () => {
      const social: SocialLinks = {
        instagram: 'https://www.instagram.com/username',
      };
      const result = normalizeSocialLinks(social);
      expect(result?.instagram).toBe('username');
    });

    it('should normalize Instagram username with @', () => {
      const social: SocialLinks = {
        instagram: '@username',
      };
      const result = normalizeSocialLinks(social);
      expect(result?.instagram).toBe('username');
    });

    it('should normalize Instagram username only', () => {
      const social: SocialLinks = {
        instagram: 'username',
      };
      const result = normalizeSocialLinks(social);
      expect(result?.instagram).toBe('username');
    });

    it('should normalize Telegram username from URL', () => {
      const social: SocialLinks = {
        telegram: 'https://t.me/username',
      };
      const result = normalizeSocialLinks(social);
      expect(result?.telegram).toBe('username');
    });

    it('should normalize Telegram username with @', () => {
      const social: SocialLinks = {
        telegram: '@username',
      };
      const result = normalizeSocialLinks(social);
      expect(result?.telegram).toBe('username');
    });

    it('should normalize Telegram username only', () => {
      const social: SocialLinks = {
        telegram: 'username',
      };
      const result = normalizeSocialLinks(social);
      expect(result?.telegram).toBe('username');
    });

    it('should normalize WhatsApp number from URL', () => {
      const social: SocialLinks = {
        whatsapp: 'https://wa.me/79991234567',
      };
      const result = normalizeSocialLinks(social);
      expect(result?.whatsapp).toBe('+79991234567');
    });

    it('should normalize WhatsApp phone number', () => {
      const social: SocialLinks = {
        whatsapp: '+7 999 123 45 67',
      };
      const result = normalizeSocialLinks(social);
      expect(result?.whatsapp).toBe('+79991234567');
    });

    it('should normalize VK username from URL', () => {
      const social: SocialLinks = {
        vk: 'https://vk.com/username',
      };
      const result = normalizeSocialLinks(social);
      expect(result?.vk).toBe('username');
    });

    it('should normalize VK username with @', () => {
      const social: SocialLinks = {
        vk: '@username',
      };
      const result = normalizeSocialLinks(social);
      expect(result?.vk).toBe('username');
    });

    it('should normalize VK numeric ID', () => {
      const social: SocialLinks = {
        vk: '123456789',
      };
      const result = normalizeSocialLinks(social);
      expect(result?.vk).toBe('123456789');
    });

    it('should normalize LinkedIn URL', () => {
      const social: SocialLinks = {
        linkedin: 'https://www.linkedin.com/in/username',
      };
      const result = normalizeSocialLinks(social);
      expect(result?.linkedin).toBe('https://www.linkedin.com/in/username');
    });

    it('should normalize LinkedIn username to URL', () => {
      const social: SocialLinks = {
        linkedin: 'username',
      };
      const result = normalizeSocialLinks(social);
      expect(result?.linkedin).toBe('https://www.linkedin.com/in/username');
    });

    it('should handle multiple social links', () => {
      const social: SocialLinks = {
        instagram: '@instauser',
        telegram: '@telegramuser',
        whatsapp: '+79991234567',
        vk: 'vkuser',
      };
      const result = normalizeSocialLinks(social);
      expect(result?.instagram).toBe('instauser');
      expect(result?.telegram).toBe('telegramuser');
      expect(result?.whatsapp).toBe('+79991234567');
      expect(result?.vk).toBe('vkuser');
    });

    it('should return null for invalid social links', () => {
      const social: SocialLinks = {
        instagram: 'invalid!@#username',
        telegram: 'ab', // Too short
        whatsapp: 'invalid',
        vk: 'ab', // Too short
      };
      const result = normalizeSocialLinks(social);
      expect(result).toBeNull();
    });

    it('should return null for empty social links object', () => {
      expect(normalizeSocialLinks({})).toBeNull();
      expect(normalizeSocialLinks(null)).toBeNull();
      expect(normalizeSocialLinks(undefined)).toBeNull();
    });

    it('should filter out invalid links and keep valid ones', () => {
      const social: SocialLinks = {
        instagram: 'validuser',
        telegram: 'ab', // Invalid - too short
        whatsapp: '+79991234567', // Valid
      };
      const result = normalizeSocialLinks(social);
      expect(result?.instagram).toBe('validuser');
      expect(result?.telegram).toBeUndefined();
      expect(result?.whatsapp).toBe('+79991234567');
    });
  });

  describe('sanitizeTextFields', () => {
    it('should trim whitespace', () => {
      expect(sanitizeTextFields('  test  ')).toBe('test');
      expect(sanitizeTextFields('\t\ntest\n\t')).toBe('test');
    });

    it('should replace multiple spaces with single space', () => {
      expect(sanitizeTextFields('test    string')).toBe('test string');
      expect(sanitizeTextFields('test   \t  \n  string')).toBe('test string');
    });

    it('should return null for empty strings', () => {
      expect(sanitizeTextFields('')).toBeNull();
      expect(sanitizeTextFields('   ')).toBeNull();
      expect(sanitizeTextFields('\t\n')).toBeNull();
    });

    it('should return null for null or undefined', () => {
      expect(sanitizeTextFields(null)).toBeNull();
      expect(sanitizeTextFields(undefined)).toBeNull();
    });

    it('should preserve single spaces', () => {
      expect(sanitizeTextFields('test string')).toBe('test string');
      expect(sanitizeTextFields('test  string')).toBe('test string');
    });
  });

  describe('sanitizeOptionalTextFields', () => {
    it('should return sanitized string for valid input', () => {
      expect(sanitizeOptionalTextFields('  test  ')).toBe('test');
      expect(sanitizeOptionalTextFields('test    string')).toBe('test string');
    });

    it('should return undefined for empty strings', () => {
      expect(sanitizeOptionalTextFields('')).toBeUndefined();
      expect(sanitizeOptionalTextFields('   ')).toBeUndefined();
    });

    it('should return undefined for null or undefined', () => {
      expect(sanitizeOptionalTextFields(null)).toBeUndefined();
      expect(sanitizeOptionalTextFields(undefined)).toBeUndefined();
    });
  });
});

