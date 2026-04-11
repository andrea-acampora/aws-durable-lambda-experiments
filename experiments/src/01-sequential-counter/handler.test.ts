import {
  LocalDurableTestRunner,
  OperationStatus,
  OperationType,
} from "@aws/durable-execution-sdk-js-testing";
import { lambdaHandler } from "./handler";

describe("01 — Sequential Counter", () => {
  beforeAll(() =>
    LocalDurableTestRunner.setupTestEnvironment({ skipTime: false }),
  );
  afterAll(() => LocalDurableTestRunner.teardownTestEnvironment());

  it("produces the correct final value", async () => {
    const runner = new LocalDurableTestRunner({
      handlerFunction: lambdaHandler,
    });

    const execution = await runner.run();

    expect(execution.getResult()).toBe(60);
  });

  it("records exactly 3 step operations", async () => {
    const runner = new LocalDurableTestRunner({
      handlerFunction: lambdaHandler,
    });

    const execution = await runner.run();

    const operations = execution.getOperations();

    expect(operations).toHaveLength(4);

    operations.forEach((op, index) => {
      index !== 1
        ? expect(op.getType()).toBe(OperationType.STEP)
        : expect(op.getType()).toBe(OperationType.WAIT);
      expect(op.getStatus()).toBe(OperationStatus.SUCCEEDED);
    });
  });

  it("step names are registered in order", async () => {
    const runner = new LocalDurableTestRunner({
      handlerFunction: lambdaHandler,
    });

    await runner.run();

    expect(runner.getOperationByIndex(0).getName()).toBe("step-1");
    expect(runner.getOperationByIndex(1).getName()).toBe("wait-for-2-seconds");
    expect(runner.getOperationByIndex(2).getName()).toBe("step-2");
    expect(runner.getOperationByIndex(3).getName()).toBe("step-3");
  });
});
