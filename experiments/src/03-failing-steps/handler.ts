import {
  createRetryStrategy,
  DurableContext,
  JitterStrategy,
  retryPresets,
  StepSemantics,
  withDurableExecution,
} from "@aws/durable-execution-sdk-js";

export interface RetryEvent {
  failTimes: number;
}

export interface RetryResult {
  attempts: number;
  value: string;
}

export let callCount = 0;

export const resetCallCount = () => {
  callCount = 0;
};

/**
 * A step is retried when it throws an error. A clean return = checkpoint saved.
 */
export const lambdaHandler = withDurableExecution(
  async (event: RetryEvent, context: DurableContext): Promise<RetryResult> => {
    /**
     *  AtMostOncePerRetry checkpoints before executing, the step is skipped on replay
     *  if a crash happened after the checkpoint but before the step returned.
     *  Safer for side-effectful ops like payments.
     */
    await context.step(
      "step-no-retry",
      async () => {
        context.logger.info("step-no-retry: running once, will not retry");
        return "done";
      },
      {
        semantics: StepSemantics.AtMostOncePerRetry,
        retryStrategy: retryPresets.noRetry,
      },
    );

    /**
     *  AtLeastOncePerRetry (default) checkpoints AFTER
     *  the step may re-run on replay. Fine for idempotent ops.
     *  Custom retry strategy: max 4 attempts, 1s initial delay, 2x backoff, max 10s, no jitter.
     * */
    const result = await context.step(
      "step-custom-retry",
      async () => {
        callCount++;
        context.logger.info(`step-custom-retry: attempt #${callCount}`);

        if (callCount <= event.failTimes) {
          throw new Error(`Transient failure on attempt ${callCount}`);
        }

        return `succeeded after ${callCount} attempt(s)`;
      },
      {
        retryStrategy: createRetryStrategy({
          maxAttempts: 4, // 1 initial + 3 retries
          initialDelay: { seconds: 1 },
          backoffRate: 2, // delays: 1s → 2s → 4s
          maxDelay: { seconds: 10 },
          jitter: JitterStrategy.NONE,
        }),
      },
    );

    // Default preset:
    // 6 attempts, 5s initial delay, 2x backoff, max 60s, full jitter.
    // Good default for any external API call.
    await context.step(
      "step-default-retry",
      async () => {
        context.logger.info("step-default-retry: always succeeds");
        return "ok";
      },
      {
        retryStrategy: retryPresets.default,
      },
    );

    return {
      attempts: callCount,
      value: result,
    };
  },
);
