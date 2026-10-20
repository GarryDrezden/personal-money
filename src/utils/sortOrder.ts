export function moveItem<T>(items: T[], index: number, dir: -1 | 1): T[] | null {
  const target = index + dir;
  if (index < 0 || target < 0 || target >= items.length) return null;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function reassignSortOrder<T extends { id: string; sortOrder: number }>(
  original: T[],
  ordered: T[],
): Array<{ id: string; sortOrder: number }> {
  const orders = original.map((item) => item.sortOrder).sort((a, b) => a - b);
  return ordered.map((item, i) => ({
    id: item.id,
    sortOrder: orders[i] ?? i + 1,
  }));
}
