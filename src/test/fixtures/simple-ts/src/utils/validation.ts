/**
 * Validation utilities
 */

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 50;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export const ValidationError = class extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
};

export async function asyncValidateUniqueEmail(email: string, existingEmails: string[]): Promise<boolean> {
  // Simulate async validation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(!existingEmails.includes(email));
    }, 10);
  });
}