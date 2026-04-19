import {
  LocalDurableTestRunner,
  OperationStatus,
  OperationType,
  WaitingOperationStatus,
} from "@aws/durable-execution-sdk-js-testing";
import { lambdaHandler } from "./handler";

describe("04 — Waiting Callbacks", () => {
  beforeAll(() =>
    LocalDurableTestRunner.setupTestEnvironment({ skipTime: true }),
  );
  afterAll(() => LocalDurableTestRunner.teardownTestEnvironment());

  const event = { message: "ping" };

  it("receives the callback value and returns it in the result", async () => {
    const runner = new LocalDurableTestRunner({
      handlerFunction: lambdaHandler,
    });

    const runPromise = runner.run({ payload: event });

    const op = runner.getOperation("wait-for-callback");

    await op.waitForData(WaitingOperationStatus.SUBMITTED);

    expect(op.getCallbackDetails()?.error).toBeUndefined();

    await op.sendCallbackSuccess("hello from outside");

    const result = (await runPromise).getResult();

    expect(result?.before).toBe("before: ping");
    expect(result?.received).toBe("hello from outside");
    expect(result?.after).toBe("after: hello from outside");
  });

  it("top-level operations are: STEP → WAIT_FOR_CALLBACK → STEP", async () => {
    const runner = new LocalDurableTestRunner({
      handlerFunction: lambdaHandler,
    });

    const runPromise = runner.run({ payload: event });
    const op = runner.getOperation("wait-for-callback");
    await op.waitForData(WaitingOperationStatus.SUBMITTED);
    await op.sendCallbackSuccess("ok");

    const ops = (await runPromise).getOperations();

    expect(ops).toHaveLength(5);

    expect(ops[0].getType()).toBe(OperationType.STEP);
    expect(ops[2].getType()).toBe(OperationType.CALLBACK);
    expect(ops[4].getType()).toBe(OperationType.STEP);
  });

  it("step-before is already SUCCEEDED when the function is suspended", async () => {
    const runner = new LocalDurableTestRunner({
      handlerFunction: lambdaHandler,
    });

    const runPromise = runner.run({ payload: event });
    const op = runner.getOperation("wait-for-callback");
    await op.waitForData(WaitingOperationStatus.SUBMITTED);

    // The function is suspended — step-before must already be checkpointed
    expect(runner.getOperation("step-before").getStatus()).toBe(
      OperationStatus.SUCCEEDED,
    );

    expect(runner.getOperation("step-after").getStatus()).toBeUndefined();

    await op.sendCallbackSuccess(JSON.stringify("ok"));
    await runPromise;
  });

  it("the callbackId is available once the function is suspended", async () => {
    const runner = new LocalDurableTestRunner({
      handlerFunction: lambdaHandler,
    });

    const runPromise = runner.run({ payload: event });
    const op = runner.getOperation("wait-for-callback");
    await op.waitForData(WaitingOperationStatus.SUBMITTED);

    expect(op.getCallbackDetails()?.callbackId).toBeDefined();

    await op.sendCallbackSuccess(JSON.stringify("ok"));
    await runPromise;
  });

  it("fails the execution when sendCallbackFailure is called", async () => {
    const runner = new LocalDurableTestRunner({
      handlerFunction: lambdaHandler,
    });

    const runPromise = runner.run({ payload: event });
    const op = runner.getOperation("wait-for-callback");
    await op.waitForData(WaitingOperationStatus.SUBMITTED);
    await op.sendCallbackFailure({ ErrorMessage: "something went wrong" });

    const result = await runPromise;

    expect(result.getStatus()).toBe(OperationStatus.FAILED);
    expect(result.getError().errorMessage).toBe("something went wrong");
  });
});
