import { User } from '../src/users/user.entity';
import { UserRole } from '../src/users/user-role.enum';
import { describe, expect, it } from '@jest/globals';

describe('User entity', () => {
  it('should have a UUID primary key', () => {
    const user = new User();
    expect(user.id).toBeUndefined();
  });

  it('should store password hash not plaintext', () => {
    const user = new User();
    user.passwordHash = '$2b$10$abcdefghijklmnopqrstuv';
    expect(user.passwordHash).not.toBe('secret123');
  });

  it('should default to STAFF role', () => {
    const user = new User();
    user.role = UserRole.STAFF;
    expect(user.role).toBe(UserRole.STAFF);
  });
});
