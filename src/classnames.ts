/**
 * Cleans and joins an array of inputs with possible undefined or boolean values.
 *
 * @param classNames Array of class names
 * @returns Clean string to be used for class name
 */
export const classNames = (...classNames: unknown[]) =>
  classNames
    .filter(
      (value): value is string | number =>
        (typeof value === 'string' && value.length > 0) || (typeof value === 'number' && Number.isFinite(value)),
    )
    .join(' ');
