import {
  LocalDurableTestRunner,
  OperationStatus,
} from "@aws/durable-execution-sdk-js-testing";
import { lambdaHandler } from "./handler";

describe("02 — Parallel Steps", () => {
  beforeAll(() =>
    LocalDurableTestRunner.setupTestEnvironment({ skipTime: true }),
  );
  afterAll(() => LocalDurableTestRunner.teardownTestEnvironment());

  it("doubles each value and sums them", async () => {
    const runner = new LocalDurableTestRunner({
      handlerFunction: lambdaHandler,
    });

    const execution = await runner.run({
      payload: {
        values: [1, 2, 3],
      },
    });

    const result = execution.getResult();

    expect(result.doubled).toEqual([2, 4, 6]);
    expect(result.total).toBe(12);
  });

  it("the parallel block is named 'double-all' and succeeds", async () => {
    const runner = new LocalDurableTestRunner({
      handlerFunction: lambdaHandler,
    });

    await runner.run({
      payload: {
        values: [1, 2, 3],
      },
    });

    const parallelOp = runner.getOperationByIndex(0);
    expect(parallelOp.getName()).toBe("double-all");
    expect(parallelOp.getStatus()).toBe(OperationStatus.SUCCEEDED);
  });

  it("'sum-results' step only appears after the parallel block", async () => {
    const runner = new LocalDurableTestRunner({
      handlerFunction: lambdaHandler,
    });

    await runner.run({
      payload: {
        values: [1, 2, 3],
      },
    });

    const sumOp = runner.getOperationByIndex(7);
    expect(sumOp.getName()).toBe("sum-results");
    expect(sumOp.getStatus()).toBe(OperationStatus.SUCCEEDED);
  });

  it("getResults() preserves input order, not completion order", async () => {
    const runner = new LocalDurableTestRunner({
      handlerFunction: lambdaHandler,
    });

    const execution = await runner.run({
      payload: {
        values: [10, 20, 30],
      },
    });

    expect(execution.getResult().doubled).toEqual([20, 40, 60]);
  });

  it("works with a single value (one branch)", async () => {
    const runner = new LocalDurableTestRunner({
      handlerFunction: lambdaHandler,
    });

    const execution = await runner.run({
      payload: {
        values: [7],
      },
    });
    expect(execution.getResult().doubled).toEqual([14]);
    expect(execution.getResult().total).toBe(14);
  });
});
