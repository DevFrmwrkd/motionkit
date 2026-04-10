import PQueue from "p-queue";
import { config } from "./config.js";
import { renderComposition } from "./renderer.js";

export const queue = new PQueue({ concurrency: config.maxConcurrency });

export type QueueStats = {
  concurrency: number;
  running: number;
  pending: number;
};

export function getQueueStats(): QueueStats {
  return {
    concurrency: config.maxConcurrency,
    running: queue.pending, // p-queue: "pending" is currently running
    pending: queue.size,    // p-queue: "size" is queued waiting
  };
}

/**
 * Enqueue a render job. Resolves when the render finishes, rejects on error.
 * The HTTP request from Convex blocks on this promise — enforcing backpressure
 * naturally (extra requests wait in the HTTP layer + p-queue).
 */
export function enqueueRender(
  input: Parameters<typeof renderComposition>[0]
): Promise<ReturnType<typeof renderComposition> extends Promise<infer T> ? T : never> {
  return queue.add(() => renderComposition(input), {
    throwOnTimeout: true,
  }) as Promise<Awaited<ReturnType<typeof renderComposition>>>;
}
