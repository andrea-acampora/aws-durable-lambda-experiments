import {
  LocalDurableTestRunner,
  OperationStatus,
  OperationType,
} from "@aws/durable-execution-sdk-js-testing";
import { lambdaHandler } from "./handler";

describe("00 - Durable Hello World", () => {
  beforeAll(() =>
    LocalDurableTestRunner.setupTestEnvironment({ skipTime: true }),
  );
  afterAll(() => LocalDurableTestRunner.teardownTestEnvironment());

  it("verifies successful response", async () => {
    const runner = new LocalDurableTestRunner({
      handlerFunction: lambdaHandler,
    });

    const execution = await runner.run();
    const result = execution.getResult();

    expect(result).toEqual("Hello World !");

    // Verify durable execution recorded one step operation
    const operations = execution.getOperations();
    expect(operations).toHaveLength(1);

    const stepOperation = runner.getOperationByIndex(0);
    expect(stepOperation.getType()).toBe(OperationType.STEP);
    expect(stepOperation.getStatus()).toBe(OperationStatus.SUCCEEDED);
  });
});
