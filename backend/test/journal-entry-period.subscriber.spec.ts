import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { AccountingPeriod } from '../src/accounting/accounting-period.entity';
import { JournalEntry } from '../src/accounting/journal-entry.entity';
import { JournalEntryPeriodSubscriber } from '../src/accounting/journal-entry-period.subscriber';

function createInsertEvent(closedAt: Date | null) {
  const manager = {
    getRepository: jest.fn(() => ({
      insert: jest.fn(async () => {
        throw { code: 'ER_DUP_ENTRY' };
      }),
    })),
    query: jest.fn(async () =>
      closedAt ? [{ periodKey: '2026-09', closedAt, closedBy: 'admin' }] : [],
    ),
  };
  return {
    manager,
    event: {
      entity: { entryDate: '2026-09-18' } as JournalEntry,
      manager,
    },
  };
}

describe('JournalEntryPeriodSubscriber', () => {
  it('blocks journal writes for a closed month', async () => {
    const subscriber = new JournalEntryPeriodSubscriber();
    const { event } = createInsertEvent(new Date('2026-10-01T00:00:00Z'));

    await expect(subscriber.beforeInsert(event as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('allows journal writes when the month has not been closed', async () => {
    const subscriber = new JournalEntryPeriodSubscriber();
    const { event, manager } = createInsertEvent(null);

    await expect(subscriber.beforeInsert(event as never)).resolves.toBeUndefined();
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('FOR UPDATE'), ['2026-09']);
  });

  it('identifies journal entries as its subscribed entity', () => {
    expect(new JournalEntryPeriodSubscriber().listenTo()).toBe(JournalEntry);
  });
});
