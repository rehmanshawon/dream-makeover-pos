import { SalonService } from '../src/services/service.entity';
import { describe, expect, it } from '@jest/globals';

describe('SalonService entity', () => {
  it('should have a UUID primary key', () => {
    const service = new SalonService();
    expect(service.id).toBeUndefined();
  });

  it('should store price in minor units', () => {
    const service = new SalonService();
    service.priceMinor = 150000;
    expect(service.priceMinor).toBe(150000);
  });

  it('should default to active true', () => {
    const service = new SalonService();
    service.active = true;
    expect(service.active).toBe(true);
  });

  it('should store duration in minutes', () => {
    const service = new SalonService();
    service.durationMinutes = 90;
    expect(service.durationMinutes).toBe(90);
  });
});
