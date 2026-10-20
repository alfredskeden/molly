/** Every value Molly may send. */
export const FEEDING_TYPES = ['breast milk', 'formula', 'fortified breast milk', 'solid food'] as const;

export const FEEDING_METHODS = [
  'bottle',
  'left breast',
  'right breast',
  'both breasts',
  'parent fed',
  'self fed',
] as const;

/** `''` means no color recorded. */
export const DIAPER_COLORS = ['', 'black', 'brown', 'gray', 'green', 'orange', 'red', 'white', 'yellow'] as const;
