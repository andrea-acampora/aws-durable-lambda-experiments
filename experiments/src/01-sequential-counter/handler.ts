import {
  DurableContext,
  withDurableExecution,
} from "@aws/durable-execution-sdk-js";

export const lambdaHandler = withDurableExecution(
  async (_event: Event, context: DurableContext): Promise<number> => {
    const counter = 0;

    context.logger.info(`Initial value: ${counter}`);

    const step1 = await context.step("step-1", async () => {
      context.logger.info(`Step 1 - ${counter} + 10`);
      return counter + 10;
    });

    const step2 = await context.step("step-2", async () => {
      context.logger.info(`Step 2 - ${step1} + 20`);
      return step1 + 20;
    });

    const step3 = await context.step("step-3", async () => {
      context.logger.info(`Step 3 - ${step2} + 30`);
      return step2 + 30;
    });

    context.logger.info(`Final value: ${step3}`);

    return step3;
  },
);
