/** Runs tasks one after another; a failed task is logged and does not stop the next. */
export const serialQueue = (label: string) => {
  let queue: Promise<void> = Promise.resolve();
  return (task: () => Promise<void>): Promise<void> => {
    const next = queue.then(task).catch((error: unknown) => {
      console.warn(`${label} failed`, error);
    });
    queue = next;
    return next;
  };
};
