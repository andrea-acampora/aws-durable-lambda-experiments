import {
  DurableContext,
  withDurableExecution,
} from "@aws/durable-execution-sdk-js";

export interface CustomEvent {
  values: number[];
}

export interface ParallelResult {
  inputs: number[];
  doubled: number[];
  total: number;
}

/**
 * Durable Lambda function handler that demonstrates parallel execution of steps.
 * It takes an array of numbers as input, doubles each number in parallel, and then sums the results.
 * The final result includes the original inputs, the doubled values, and the total sum.
 */
export const lambdaHandler = withDurableExecution(
  async (
    event: CustomEvent,
    context: DurableContext,
  ): Promise<ParallelResult> => {
    /**
     * Execute the doubling of each number in parallel branches.
     * Each branch is a separate step that runs concurrently.
     */
    const parallelResult = await context.parallel(
      "double-all",
      event.values.map(
        (value, index) => async (ctx: DurableContext) =>
          ctx.step(`double-${index}`, async () => {
            context.logger.info(`Branch ${index}: doubling ${value}`);
            return value * 2;
          }),
      ),
    );

    /**
     * Collect the results from all parallel branches.
     */
    const doubled = parallelResult.getResults();

    const total = await context.step("sum-results", async () => {
      return doubled.reduce((acc, n) => acc + n, 0);
    });

    return { inputs: event.values, doubled, total };
  },
);
