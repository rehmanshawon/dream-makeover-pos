import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './transaction.entity';

const PREFIX = 'DM';
const SEQUENCE_PAD = 4;
const MAX_SEQUENCE = 9999;

/**
 * Generates human-readable, per-day sequential invoice numbers.
 *
 * Format: DM-YYYYMMDD-NNNN
 *
 * - DM: fixed brand prefix
 * - YYYYMMDD: date of the sale
 * - NNNN: zero-padded sequence starting at 0001 per day
 *
 * Concurrency:
 * Two concurrent checkouts may compute the same next sequence. The
 * `uq_transactions_invoice` unique constraint on `invoice_id` rejects the
 * second insert. Callers must retry on conflict.
 */
@Injectable()
export class InvoiceNumberService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  /**
   * Returns the next invoice number for the given date.
   *
   * @param date - The date to generate the invoice for. Defaults to now.
   * @returns A string in format DM-YYYYMMDD-NNNN.
   * @throws Error if the daily sequence exceeds 9999.
   */
  async next(date: Date = new Date()): Promise<string> {
    const dayKey = this.formatDate(date);
    const prefix = `${PREFIX}-${dayKey}-`;

    const last = await this.transactionRepository
      .createQueryBuilder('t')
      .where('t.invoiceId LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('t.invoiceId', 'DESC')
      .limit(1)
      .getOne();

    let nextSequence = 1;

    if (last) {
      const lastSequence = this.extractSequence(last.invoiceId, prefix);
      nextSequence = lastSequence + 1;
    }

    if (nextSequence > MAX_SEQUENCE) {
      throw new Error(`Daily invoice sequence exceeded ${MAX_SEQUENCE} for date ${dayKey}`);
    }

    return `${prefix}${String(nextSequence).padStart(SEQUENCE_PAD, '0')}`;
  }

  /**
   * Formats a Date as YYYYMMDD in local server time.
   *
   * Uses local time, not UTC, because business days are defined in the
   * salon's local timezone.
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Extracts the numeric sequence from an existing invoice number.
   * Throws if the format does not match.
   */
  private extractSequence(invoiceId: string, prefix: string): number {
    const tail = invoiceId.slice(prefix.length);
    const parsed = Number.parseInt(tail, 10);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Malformed invoice ID: ${invoiceId}`);
    }
    return parsed;
  }
}
