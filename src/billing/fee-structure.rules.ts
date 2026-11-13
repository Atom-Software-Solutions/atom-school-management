/**
 * Pure fee-structure rules (no Prisma), kept separate so they are easy to unit test.
 */

/** Fields that define what was billed; frozen once any non-draft invoice references the structure. */
export const LOCKED_WHEN_INVOICED = [
  'academic_year_id',
  'term_template_item_id',
  'classroom_definition_id',
  'fee_category_id',
  'amount',
  'frequency',
] as const;

/** Returns the locked fields the update tries to change (normalising Decimal/strings/nulls). */
export function lockedFieldChanges(
  current: Record<string, unknown>,
  update: Record<string, unknown>,
): string[] {
  const norm = (v: unknown) => {
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    if (typeof v === 'object' && v !== null && 'toFixed' in v) return (v as { toFixed(n: number): string }).toFixed(2);
    if (typeof v === 'number' || (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v))) return Number(v).toFixed(2);
    return v;
  };
  return LOCKED_WHEN_INVOICED.filter((field) => {
    if (!(field in update) || update[field] === undefined) return false;
    return norm(update[field]) !== norm(current[field]);
  });
}

/**
 * Maps source term ids to target term ids by ordinal (Term 1 -> Term 1, ...).
 * Source terms with no counterpart in the target template map to undefined.
 */
export function mapTermsByOrdinal(
  sourceTerms: Array<{ id: string; ordinal: number }>,
  targetTerms: Array<{ id: string; ordinal: number }>,
): Map<string, string | undefined> {
  const byOrdinal = new Map(targetTerms.map((t) => [t.ordinal, t.id]));
  return new Map(sourceTerms.map((t) => [t.id, byOrdinal.get(t.ordinal)]));
}

/** Natural key used to avoid copying a structure that already exists in the target. */
export function structureKey(s: {
  fee_category_id: string;
  classroom_definition_id: string | null;
  term_template_item_id: string | null;
  name: string;
}): string {
  return [s.fee_category_id, s.classroom_definition_id ?? '-', s.term_template_item_id ?? '-', s.name.trim().toLowerCase()].join('|');
}
