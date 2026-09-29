import { BadRequestException } from '@nestjs/common';
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { AccountingPeriod } from './accounting-period.entity';
import { JournalEntry } from './journal-entry.entity';

@EventSubscriber()
export class JournalEntryPeriodSubscriber implements EntitySubscriberInterface<JournalEntry> {
  listenTo(): typeof JournalEntry {
    return JournalEntry;
  }

  async beforeInsert(event: InsertEvent<JournalEntry>): Promise<void> {
    await this.assertPeriodsOpen(event.manager, [event.entity.entryDate]);
  }

  async beforeUpdate(event: UpdateEvent<JournalEntry>): Promise<void> {
    const entry = event.entity as JournalEntry | undefined;
    const previous = event.databaseEntity as JournalEntry | undefined;
    await this.assertPeriodsOpen(
      event.manager,
      [previous?.entryDate, entry?.entryDate].filter((date): date is string => Boolean(date)),
    );
  }

  async beforeRemove(event: RemoveEvent<JournalEntry>): Promise<void> {
    const entry = event.entity;
    if (entry) await this.assertPeriodsOpen(event.manager, [entry.entryDate]);
  }

  private async assertPeriodsOpen(manager: InsertEvent<JournalEntry>['manager'], dates: string[]) {
    const periodKeys = [...new Set(dates.map((date) => date.slice(0, 7)))].sort();
    for (const periodKey of periodKeys) {
      await manager
        .getRepository(AccountingPeriod)
        .insert({
          periodKey,
          closedAt: null,
          closedBy: null,
        })
        .catch((error: { code?: string; driverError?: { code?: string } }) => {
          if (error.code !== 'ER_DUP_ENTRY' && error.driverError?.code !== 'ER_DUP_ENTRY') {
            throw error;
          }
        });
      const periods: AccountingPeriod[] = await manager.query(
        'SELECT period_key AS periodKey, closed_at AS closedAt, closed_by AS closedBy FROM accounting_periods WHERE period_key = ? FOR UPDATE',
        [periodKey],
      );
      if (periods[0]?.closedAt) {
        throw new BadRequestException(
          `Accounting period ${periodKey} is closed. Post a traceable correction in an open period.`,
        );
      }
    }
  }
}
