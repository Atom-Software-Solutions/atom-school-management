import { Prisma } from '@prisma/client';
import { lockedFieldChanges, mapTermsByOrdinal, structureKey } from './fee-structure.rules';

describe('fee-structure rules', () => {
  const current = {
    academic_year_id: 'y1',
    term_template_item_id: 't1',
    classroom_definition_id: null,
    fee_category_id: 'c1',
    amount: new Prisma.Decimal('450000.00'),
    frequency: 'PER_TERM',
    name: 'Tuition',
  };

  it('allows unlocked fields to change', () => {
    expect(lockedFieldChanges(current, { name: 'New name', due_date: '2026-02-01' })).toEqual([]);
  });

  it('treats equal amounts in different formats as unchanged', () => {
    expect(lockedFieldChanges(current, { amount: '450000' })).toEqual([]);
    expect(lockedFieldChanges(current, { amount: 450000 })).toEqual([]);
  });

  it('detects locked field changes', () => {
    expect(lockedFieldChanges(current, { amount: '450000.01', fee_category_id: 'c2' })).toEqual([
      'fee_category_id',
      'amount',
    ]);
  });

  it('treats empty string and null as the same', () => {
    expect(lockedFieldChanges(current, { classroom_definition_id: '' })).toEqual([]);
    expect(lockedFieldChanges(current, { classroom_definition_id: 'k1' })).toEqual(['classroom_definition_id']);
  });

  it('maps terms by ordinal', () => {
    const map = mapTermsByOrdinal(
      [{ id: 'a1', ordinal: 1 }, { id: 'a2', ordinal: 2 }, { id: 'a3', ordinal: 3 }],
      [{ id: 'b1', ordinal: 1 }, { id: 'b2', ordinal: 2 }],
    );
    expect(map.get('a1')).toBe('b1');
    expect(map.get('a2')).toBe('b2');
    expect(map.get('a3')).toBeUndefined();
  });

  it('builds case-insensitive natural keys', () => {
    const base = { fee_category_id: 'c', classroom_definition_id: null, term_template_item_id: 't' };
    expect(structureKey({ ...base, name: 'Tuition ' })).toBe(structureKey({ ...base, name: 'tuition' }));
  });
});
