// Type definitions for custom Jest matchers

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeCloseToNumber(expected: number, precision?: number): R;
    }
  }
}

export {};