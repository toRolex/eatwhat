export async function runParallel<A, B>(
  taskA: Promise<A>,
  taskB: Promise<B>
): Promise<[A, B]> {
  return Promise.all([taskA, taskB]);
}
