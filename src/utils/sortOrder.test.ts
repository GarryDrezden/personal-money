import { describe, expect, it } from 'vitest';
import { moveItem, reassignSortOrder } from './sortOrder';

describe('moveItem', () => {
  it('moves an item up and down', () => {
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });

  it('returns null at the edges', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toBeNull();
    expect(moveItem(['a', 'b'], 1, 1)).toBeNull();
  });
});

describe('reassignSortOrder', () => {
  it('keeps the original sort numbers on the new sequence', () => {
    const original = [
      { id: 'food', sortOrder: 2 },
      { id: 'dining', sortOrder: 3 },
      { id: 'home', sortOrder: 4 },
    ];
    const ordered = [original[1], original[0], original[2]];
    expect(reassignSortOrder(original, ordered)).toEqual([
      { id: 'dining', sortOrder: 2 },
      { id: 'food', sortOrder: 3 },
      { id: 'home', sortOrder: 4 },
    ]);
  });
});
