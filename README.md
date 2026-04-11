# Experiments with AWS Durable Functions

This project contains some experiments with [AWS Durable Functions](https://docs.aws.amazon.com/lambda/latest/dg/durable-functions.html) using **TypeScript** and [SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) CLI. You can invoke the lambda locally or deploy it to your AWS account.

The application uses several AWS resources, which are defined in the `template.yaml` file in this project.

## Prerequisites

In order to build the project you need to install _SAM CLI_: the Serverless Application Model Command Line Interface (SAM CLI) is an extension of the _AWS CLI_ that adds functionality for building and testing Lambda applications. It uses Docker to run your functions in an Amazon Linux environment that matches Lambda. It can also emulate your application's build environment and API.

To use the SAM CLI, you need the following tools:

- SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- Node.js - [Install Node.js 24](https://nodejs.org/en/), including the NPM package management tool.
- Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community)

## Run locally

Build your application with the `sam build` command.

```bash
$ sam build
```

The SAM CLI installs dependencies, creates a deployment package, and saves it in the `.aws-sam/build` folder.

Test a single function by invoking it directly with a test event. An event is a JSON document that represents the input that the function receives from the event source. Test events are included in the `events` folder in this project.

Run functions locally and invoke them with the `sam local invoke` command.

```bash
$ sam local invoke HelloWorldFunction --event 00-hello-world/events/event.json
```

For durable functions, you can view the execution and execution history:

```bash
$ sam local execution get $EXECUTION_ARN
$ sam local execution history $EXECUTION_ARN
```

## Testing

Unit tests are written using the [`@aws/durable-execution-sdk-js-testing`](https://github.com/aws/aws-durable-execution-sdk-js) library. The testing library allows you to simulate running your execution locally while mocking any dependencies.

Tests are located in every experiment folder under `tests/handler.test.ts` and demonstrate:

- Testing durable function execution with the `LocalDurableTestRunner`
- Verifying function results and response structure
- Asserting on durable execution operations using `OperationType` and `OperationStatus`

```bash
$ cd hello-world
hello-world$ npm install
hello-world$ npm run test
```

## Deploy

To deploy your application for the first time, run the following in your shell:

```bash
sam build
sam deploy --guided
```

## Cleanup

To delete the sample application that you created, use the AWS CLI. Assuming you used your project name for the stack name, you can run the following:

```bash
aws cloudformation delete-stack --stack-name aws-durable-functions-experiments
```
