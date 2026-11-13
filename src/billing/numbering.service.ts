import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { formatDocumentNumber } from './invoice-generation.logic';

type Tx = Prisma.TransactionClient;

/**
 * Gap-free per-school, per-year document numbers. MUST be called inside the same transaction
 * that uses the numbers: the upsert row-locks the sequence until commit, and a rollback
 * returns the numbers.
 */
@Injectable()
export class NumberingService {
  /** Reserves `count` consecutive numbers and returns them formatted. */
  async reserve(
    tx: Tx,
    params: { schoolId: string; schoolCode: string; kind: 'INVOICE' | 'RECEIPT'; year: number; count?: number },
  ): Promise<string[]> {
    const count = params.count ?? 1;
    if (count < 1) return [];
    const rows = await tx.$queryRaw<Array<{ first: number }>>`
      INSERT INTO "payment_mgt"."NumberSequence" ("school_id", "kind", "year", "next_value", "updated_at")
      VALUES (${params.schoolId}, ${params.kind}::"payment_mgt"."NumberSequenceKind", ${params.year}, ${1 + count}, now())
      ON CONFLICT ("school_id", "kind", "year")
      DO UPDATE SET "next_value" = "NumberSequence"."next_value" + ${count}, "updated_at" = now()
      RETURNING ("next_value" - ${count})::int AS "first"`;
    const first = Number(rows[0].first);
    const prefix = params.kind === 'INVOICE' ? 'INV' : 'RCT';
    return Array.from({ length: count }, (_, i) =>
      formatDocumentNumber(params.schoolCode, prefix, params.year, first + i),
    );
  }
}
