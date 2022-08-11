import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { S3Stack } from "../lib/s3-stack";
import { StepfunctionsStack } from "../lib/stepfunctions-stack";

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

test("Snapshot tests", () => {
  const stack = new cdk.Stack();
  const s3 = new S3Stack(stack, "SnapshotTest1", {
    projectName: "test",
    envName: "test",
    env: env,
  });
  new StepfunctionsStack(stack, "SnapshotTest2", {
    projectName: "test",
    envName: "test",
    env: env,
    bucket: s3.bucket,
  });

  const template1 = Template.fromStack(s3);
  expect(template1.toJSON()).toMatchSnapshot();
});
