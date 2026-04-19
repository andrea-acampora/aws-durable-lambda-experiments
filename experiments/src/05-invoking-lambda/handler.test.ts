import {
  LocalDurableTestRunner,
  OperationStatus,
  OperationType,
} from "@aws/durable-execution-sdk-js-testing";
import { HELLO_WORLD_ARN, helloWorldHandler, lambdaHandler } from "./handler";

describe("05 — Invoking Lambda", () => {
  beforeAll(() =>
    LocalDurableTestRunner.setupTestEnvironment({ skipTime: true }),
  );
  afterAll(() => LocalDurableTestRunner.teardownTestEnvironment());

  function buildRunner() {
    const runner = new LocalDurableTestRunner({
      handlerFunction: lambdaHandler,
    });
    runner.registerDurableFunction(HELLO_WORLD_ARN, helloWorldHandler);
    return runner;
  }

  it("returns a greeting for each name", async () => {
    const runner = buildRunner();

    const execution = await runner.run({
      payload: { names: ["Alice", "Bob"] },
    });
    const result = execution.getResult();

    expect(result?.greetings).toEqual(["Hello, Alice!", "Hello, Bob!"]);
  });

  it("summary lists all greetings", async () => {
    const runner = buildRunner();

    const execution = await runner.run({
      payload: { names: ["Alice", "Bob"] },
    });

    expect(execution.getResult()?.summary).toBe(
      "2 greeting(s) sent: Hello, Alice!, Hello, Bob!",
    );
  });

  it("each invoke produces a CHAINED_INVOKE operation, not a STEP", async () => {
    const runner = buildRunner();

    const execution = await runner.run({
      payload: { names: ["Alice", "Bob", "Carol"] },
    });
    const ops = execution.getOperations();

    const invokes = ops.filter(
      (o) => o.getType() === OperationType.CHAINED_INVOKE,
    );
    const steps = ops.filter((o) => o.getType() === OperationType.STEP);

    expect(invokes).toHaveLength(3);
    expect(steps).toHaveLength(1);
  });

  it("invocations appear in input order before the summarise step", async () => {
    const runner = buildRunner();

    await runner.run({ payload: { names: ["Alice", "Bob", "Carol"] } });

    expect(runner.getOperationByIndex(0).getName()).toBe("invoke-alice");
    expect(runner.getOperationByIndex(0).getType()).toBe(
      OperationType.CHAINED_INVOKE,
    );

    expect(runner.getOperationByIndex(1).getName()).toBe("invoke-bob");
    expect(runner.getOperationByIndex(2).getName()).toBe("invoke-carol");

    expect(runner.getOperationByIndex(3).getName()).toBe("step-summarise");
    expect(runner.getOperationByIndex(3).getType()).toBe(OperationType.STEP);
  });

  it("every operation is SUCCEEDED", async () => {
    const runner = buildRunner();

    const execution = await runner.run({
      payload: { names: ["Alice", "Bob"] },
    });

    execution.getOperations().forEach((op) => {
      expect(op.getStatus()).toBe(OperationStatus.SUCCEEDED);
    });
  });

  it("each invocation result is independently checkpointed", async () => {
    const runner = buildRunner();

    await runner.run({ payload: { names: ["Alice", "Bob"] } });

    const aliceOp = runner.getOperationByIndex(0);
    const bobOp = runner.getOperationByIndex(1);

    expect(aliceOp.getChainedInvokeDetails()?.result).toBe("Hello, Alice!");
    expect(bobOp.getChainedInvokeDetails()?.result).toBe("Hello, Bob!");
  });

  it("works with a single name", async () => {
    const runner = buildRunner();

    const execution = await runner.run({ payload: { names: ["World"] } });

    expect(execution.getResult()?.greetings).toEqual(["Hello, World!"]);
    expect(execution.getOperations()).toHaveLength(2);
  });
});
