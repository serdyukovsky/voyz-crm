/**
 * Contact Mapper
 * Utility functions for mapping and transforming contact data
 */

import { Contact, Prisma } from '@prisma/client';
import { ContactResponseDto } from './dto/contact-response.dto';

export interface ContactWithRelations extends Contact {
  company?: {
    id: string;
    name: string;
    website?: string | null;
    industry?: string | null;
  } | null;
}

export interface ContactStats {
  activeDeals: number;
  closedDeals: number;
  totalDeals: number;
  totalDealVolume: number;
}

/**
 * Type guard to check if contact has social links
 */
export function hasSocialLinks(
  social: any,
): social is {
  instagram?: string;
  telegram?: string;
  whatsapp?: string;
  vk?: string;
} {
  return (
    social &&
    typeof social === 'object' &&
    (social.instagram !== undefined ||
      social.telegram !== undefined ||
      social.whatsapp !== undefined ||
      social.vk !== undefined)
  );
}

/**
 * Map Prisma Contact to ContactResponseDto
 */
export function mapContactToResponseDto(
  contact: ContactWithRelations,
  stats: ContactStats,
): ContactResponseDto {
  return {
    id: contact.id,
    fullName: contact.fullName,
    email: contact.email || undefined,
    phone: contact.phone || undefined,
    position: contact.position || undefined,
    companyName: contact.companyName || undefined,
    tags: contact.tags || [],
    notes: contact.notes || undefined,
    social: hasSocialLinks(contact.social)
      ? {
          instagram: contact.social.instagram,
          telegram: contact.social.telegram,
          whatsapp: contact.social.whatsapp,
          vk: contact.social.vk,
        }
      : undefined,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
    stats,
  };
}

/**
 * Validate contact email format
 */
export function isValidEmail(email?: string | null): boolean {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate contact phone format
 */
export function isValidPhone(phone?: string | null): boolean {
  if (!phone) return true; // Phone is optional
  // Basic phone validation - allows international format
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}






