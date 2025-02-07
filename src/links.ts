/**
 * Converts a phone number into a `tel:` link.
 *
 * @param phoneNumber Phone number
 * @returns `tel:` link for the phone number
 */

export const getTelLink = (phoneNumber: string): string => `tel:${phoneNumber.replace(/ /g, '')}`;
