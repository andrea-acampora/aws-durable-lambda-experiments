import {
  DurableContext,
  withDurableExecution,
} from "@aws/durable-execution-sdk-js";

/**
 * Durable Lambda function handler.
 */
export const lambdaHandler = withDurableExecution(
  async (_event: Event, context: DurableContext): Promise<string> => {
    context.logger.info("Starting durable hello world execution");

    // Execute durable step
    const message = await context.step(async () => {
      context.logger.info("Generating greeting for: World");
      return "Hello World !";
    });

    context.logger.info("Execution completed successfully");

    return message;
  },
);
