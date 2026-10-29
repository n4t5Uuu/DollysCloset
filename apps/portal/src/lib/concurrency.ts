/**
 * Maps `items` through `fn` with at most `limit` calls in flight.
 * Results keep the order of `items`.
 */
export function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const runNext = (): Promise<void> => {
    if (nextIndex >= items.length) return Promise.resolve();
    const index = nextIndex++;
    return fn(items[index], index).then((result) => {
      results[index] = result;
      return runNext();
    });
  };

  const workerCount = Math.min(limit, items.length);
  return Promise.all(Array.from({ length: workerCount }, runNext)).then(() => results);
}
