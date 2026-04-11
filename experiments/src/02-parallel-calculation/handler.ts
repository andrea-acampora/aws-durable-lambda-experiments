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

export const lambdaHandler = withDurableExecution(
  async (
    event: CustomEvent,
    context: DurableContext,
  ): Promise<ParallelResult> => {
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

    const doubled = parallelResult.getResults();

    const total = await context.step("sum-results", async () => {
      return doubled.reduce((acc, n) => acc + n, 0);
    });

    return { inputs: event.values, doubled, total };
  },
);
