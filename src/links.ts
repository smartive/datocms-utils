/**
 * Converts a phone number into a `tel:` link.
 *
 * @param phoneNumber Phone number
 * @returns `tel:` link for the phone number
 */

export const getTelLink = (phoneNumber: string): string => {
  if (typeof phoneNumber !== 'string') {
    throw new Error('Phone number must be a string.');
  }

  // Remove non-digit characters except for '+' which is used for international numbers
  const cleanedPhoneNumber = phoneNumber.replace(/[^\d+]/g, '');

  return `tel:${cleanedPhoneNumber}`;
};
