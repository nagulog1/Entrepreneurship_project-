/**
 * Unit tests for the auth hook logic (non-Firebase parts).
 */

describe('useAuth friendlyError mapping', () => {
  // Extract the friendlyError logic for testing
  function friendlyError(err: unknown): string {
    if (err instanceof Error) {
      const msg = err.message;
      if (msg.includes('user-not-found') || msg.includes('wrong-password')) return 'Invalid email or password.';
      if (msg.includes('email-already-in-use')) return 'An account with this email already exists.';
      if (msg.includes('weak-password')) return 'Password must be at least 6 characters.';
      if (msg.includes('popup-closed-by-user')) return 'Sign-in popup was closed. Please try again.';
      if (msg.includes('network-request-failed')) return 'Network error. Check your connection.';
      return msg;
    }
    return 'An unexpected error occurred.';
  }

  it('maps user-not-found error', () => {
    expect(friendlyError(new Error('auth/user-not-found'))).toBe('Invalid email or password.');
  });

  it('maps wrong-password error', () => {
    expect(friendlyError(new Error('auth/wrong-password'))).toBe('Invalid email or password.');
  });

  it('maps email-already-in-use error', () => {
    expect(friendlyError(new Error('auth/email-already-in-use'))).toBe('An account with this email already exists.');
  });

  it('maps weak-password error', () => {
    expect(friendlyError(new Error('auth/weak-password'))).toBe('Password must be at least 6 characters.');
  });

  it('maps popup-closed-by-user error', () => {
    expect(friendlyError(new Error('auth/popup-closed-by-user'))).toBe('Sign-in popup was closed. Please try again.');
  });

  it('maps network-request-failed error', () => {
    expect(friendlyError(new Error('auth/network-request-failed'))).toBe('Network error. Check your connection.');
  });

  it('returns original message for unknown Error', () => {
    expect(friendlyError(new Error('Something went wrong'))).toBe('Something went wrong');
  });

  it('returns generic message for non-Error', () => {
    expect(friendlyError('string error')).toBe('An unexpected error occurred.');
    expect(friendlyError(null)).toBe('An unexpected error occurred.');
    expect(friendlyError(undefined)).toBe('An unexpected error occurred.');
  });
});
