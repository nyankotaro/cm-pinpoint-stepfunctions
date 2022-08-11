#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { S3Stack } from "../lib/s3-stack";
import { StepfunctionsStack } from "../lib/stepfunctions-stack";

const app = new cdk.App();
const projectName = app.node.tryGetContext("projectName");
const envKey = app.node.tryGetContext("env");
const envValues = app.node.tryGetContext(envKey);
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const s3 = new S3Stack(app, `${projectName}-${envValues.envName}-s3`, {
  projectName: projectName,
  envName: envValues.envName,
  env: env,
});

new StepfunctionsStack(app, `${projectName}-${envValues.envName}-stepfunctions`, {
  projectName: projectName,
  envName: envValues.envName,
  env: env,
  applicationId: "YOUR_APPLICATION_ID",
  pinpointRole: "YOUR_PINPOINT_ROLE",
  bucket: s3.bucket,
});
