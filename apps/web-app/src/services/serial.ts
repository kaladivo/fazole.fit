/** Runs tasks one after another; a failed task is logged, resolves `undefined` and does not stop the next. */
export const serialQueue = (label: string) => {
  let queue: Promise<void> = Promise.resolve();
  return <A>(task: () => Promise<A>): Promise<A | undefined> => {
    const next = queue.then(task).catch((error: unknown) => {
      console.warn(`${label} failed`, error);
      return undefined;
    });
    queue = next.then(() => undefined);
    return next;
  };
};
