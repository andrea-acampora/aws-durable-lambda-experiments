import { EventType } from "@aws-sdk/client-lambda";
import {
  LocalDurableTestRunner,
  OperationStatus,
} from "@aws/durable-execution-sdk-js-testing";
import { lambdaHandler, resetCallCount } from "./handler";

describe("03 — Failing Steps", () => {
  beforeAll(() =>
    LocalDurableTestRunner.setupTestEnvironment({ skipTime: true }),
  );
  afterAll(() => LocalDurableTestRunner.teardownTestEnvironment());
  beforeEach(() => resetCallCount());

  describe("step-no-retry", () => {
    it("succeeds on the first and only attempt", async () => {
      const runner = new LocalDurableTestRunner({
        handlerFunction: lambdaHandler,
      });

      await runner.run({ payload: { failTimes: 0 } });

      const op = runner.getOperation("step-no-retry");
      expect(op.getStatus()).toBe(OperationStatus.SUCCEEDED);
    });

    it("records attempt number 1 in step details", async () => {
      const runner = new LocalDurableTestRunner({
        handlerFunction: lambdaHandler,
      });

      await runner.run({ payload: { failTimes: 0 } });

      const details = runner.getOperation("step-no-retry").getStepDetails();
      expect(details?.attempt).toBe(1);
      expect(details?.error).toBeUndefined();
    });

    it("has no failed events", async () => {
      const runner = new LocalDurableTestRunner({
        handlerFunction: lambdaHandler,
      });

      await runner.run({ payload: { failTimes: 0 } });

      const failedEvents = runner
        .getOperation("step-no-retry")
        .getEvents()
        ?.filter((e) => e.EventType === EventType.StepFailed);
      expect(failedEvents).toHaveLength(0);
    });
  });

  describe("step-custom-retry", () => {
    it("succeeds immediately when failTimes is 0 (no failures)", async () => {
      const runner = new LocalDurableTestRunner({
        handlerFunction: lambdaHandler,
      });

      await runner.run({ payload: { failTimes: 0 } });

      const op = runner.getOperation("step-custom-retry");
      expect(op.getStatus()).toBe(OperationStatus.SUCCEEDED);
      expect(op.getStepDetails()?.attempt).toBe(1);
    });

    it("succeeds after 1 failure (attempt 2)", async () => {
      const runner = new LocalDurableTestRunner({
        handlerFunction: lambdaHandler,
      });

      await runner.run({ payload: { failTimes: 1 } });

      const op = runner.getOperation("step-custom-retry");
      expect(op.getStatus()).toBe(OperationStatus.SUCCEEDED);
      expect(op.getStepDetails()?.attempt).toBe(2);
    });

    it("succeeds after 3 failures (attempt 4 = last allowed)", async () => {
      const runner = new LocalDurableTestRunner({
        handlerFunction: lambdaHandler,
      });

      await runner.run({ payload: { failTimes: 3 } });

      const op = runner.getOperation("step-custom-retry");
      expect(op.getStatus()).toBe(OperationStatus.SUCCEEDED);
      expect(op.getStepDetails()?.attempt).toBe(4);
    });

    it("each failed attempt produces a FAILED event ", async () => {
      const runner = new LocalDurableTestRunner({
        handlerFunction: lambdaHandler,
      });

      await runner.run({ payload: { failTimes: 2 } });
      const failedEvents =
        runner
          .getOperationByIndex(1)
          .getEvents()
          ?.filter((e) => e.EventType === EventType.StepFailed) ?? [];

      expect(failedEvents).toHaveLength(2);
    });

    it("the failed child carries the error message from the thrown error", async () => {
      const runner = new LocalDurableTestRunner({
        handlerFunction: lambdaHandler,
      });

      await runner.run({ payload: { failTimes: 1 } });

      const failedEvent = runner
        .getOperationByIndex(1)
        .getEvents()
        ?.find((e) => e.EventType === EventType.StepFailed);

      expect(failedEvent).toBeDefined();
      expect(failedEvent?.EventType).toBe(EventType.StepFailed);
      expect(failedEvent?.StepFailedDetails?.Error?.Payload?.ErrorMessage).toBe(
        "Transient failure on attempt 1",
      );
    });

    it("fails the entire execution when failures exceed maxAttempts (4)", async () => {
      const runner = new LocalDurableTestRunner({
        handlerFunction: lambdaHandler,
      });

      const result = await runner.run({ payload: { failTimes: 5 } });

      expect(result.getStatus()).toBe(OperationStatus.FAILED);
      expect(result.getError().errorMessage).toBe(
        "Transient failure on attempt 4",
      );
    });
  });

  describe("step-default-retry (retryPresets.default)", () => {
    it("succeeds with no failures and records attempt 1", async () => {
      const runner = new LocalDurableTestRunner({
        handlerFunction: lambdaHandler,
      });

      await runner.run({ payload: { failTimes: 0 } });

      const op = runner.getOperation("step-default-retry");
      expect(op.getStatus()).toBe(OperationStatus.SUCCEEDED);
      expect(op.getStepDetails()?.attempt).toBe(1);
    });
  });
});
