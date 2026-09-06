import { User } from '../src/users/user.entity';
import { UserRole } from '../src/users/user-role.enum';
import { describe, expect, it } from '@jest/globals';
import * as bcrypt from 'bcryptjs';

describe('User entity', () => {
  it('should not have an ID upon instantiation (handled by DB)', () => {
    const user = new User();
    expect(user.id).toBeUndefined();
  });

  it('should initialize with default STAFF role and active status', () => {
    const user = new User();

    // We are no longer manually setting these. We are testing that the
    // class itself applies the correct defaults when created.
    expect(user.role).toBe(UserRole.STAFF);
    expect(user.active).toBe(true);
  });

  it('should hash the password correctly using setPassword', async () => {
    const user = new User();
    const plainTextPassword = 'secretPassword123';

    // Trigger the actual logic in the entity
    await user.setPassword(plainTextPassword);

    // Verify a hash was generated and it does not equal the plaintext
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe(plainTextPassword);

    // (Optional but recommended) Verify it is a valid bcrypt hash
    const isMatch = await bcrypt.compare(plainTextPassword, user.passwordHash);
    expect(isMatch).toBe(true);
  });
});
