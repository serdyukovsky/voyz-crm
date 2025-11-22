import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { normalizeEmail } from '../utils/normalization.utils';

/**
 * Custom validator decorator for normalized email addresses
 * Validates email format and ensures it's normalized (trimmed, lowercase)
 */
export function IsEmailNormalized(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isEmailNormalized',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === null || value === undefined || value === '') {
            return true; // Optional field
          }
          if (typeof value !== 'string') {
            return false;
          }
          return normalizeEmail(value) !== null;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid email address`;
        },
      },
    });
  };
}

