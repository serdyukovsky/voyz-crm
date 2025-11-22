import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { isValidPhone, CountryCode } from '../utils/normalization.utils';

/**
 * Custom validator decorator for phone numbers
 * Validates phone number format using libphonenumber-js
 */
export function IsPhone(
  defaultCountry: CountryCode = 'RU',
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isPhone',
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
          return isValidPhone(value, defaultCountry);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid phone number`;
        },
      },
    });
  };
}

