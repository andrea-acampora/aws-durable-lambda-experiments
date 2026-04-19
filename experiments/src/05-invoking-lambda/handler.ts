import {
  DurableContext,
  withDurableExecution,
} from "@aws/durable-execution-sdk-js";

export interface HelloEvent {
  name: string;
}

export const helloWorldHandler = withDurableExecution(
  async (event: HelloEvent, context: DurableContext): Promise<string> => {
    const greeting = await context.step("greet", async () => {
      return `Hello, ${event.name}!`;
    });
    return greeting;
  },
);

export interface OrchestratorEvent {
  names: string[];
}

export interface OrchestratorResult {
  greetings: string[];
  summary: string;
}

export const HELLO_WORLD_ARN =
  "arn:aws:lambda:us-east-1:123456789012:function:HelloWorldFunction:Live";

export const lambdaHandler = withDurableExecution(
  async (
    event: OrchestratorEvent,
    context: DurableContext,
  ): Promise<OrchestratorResult> => {
    const greetings: string[] = [];

    for (const name of event.names) {
      const greeting = await context.invoke<HelloEvent, string>(
        `invoke-${name.toLowerCase()}`,
        HELLO_WORLD_ARN,
        { name },
      );

      greetings.push(greeting);
    }

    const summary = await context.step("step-summarise", async () => {
      return `${greetings.length} greeting(s) sent: ${greetings.join(", ")}`;
    });

    return { greetings, summary };
  },
);
