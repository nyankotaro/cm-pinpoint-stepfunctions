import * as path from "path";

import { Construct } from "constructs";
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";

export interface props extends StackProps {
  projectName: String;
  envName: String;
  applicationId: string;
  pinpointRole: string;
  bucket: s3.IBucket;
}

export class StepfunctionsStack extends Stack {
  constructor(scope: Construct, id: string, props: props) {
    super(scope, id, props);

    /**
     * Create Roles
     */
    const roleForSegmentImport = new iam.Role(this, `${props.projectName}-${props.envName}-role-for-segment-import`, {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      roleName: `${props.projectName}-${props.envName}-role-for-segment-import`,
    });
    roleForSegmentImport.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"));

    const roleForEmailCampagin = new iam.Role(this, `${props.projectName}-${props.envName}-role-for-email-campagin`, {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      roleName: `${props.projectName}-${props.envName}-role-for-email-campagin`,
    });
    roleForEmailCampagin.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"));

    const roleForSmsCampagin = new iam.Role(this, `${props.projectName}-${props.envName}-role-for-sms-campagin`, {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      roleName: `${props.projectName}-${props.envName}-role-for-sms-campagin`,
    });

    /**
     * Create Step fucntions using lambda
     */
    // Create lambdas
    const importSegmentFunction = new lambda.Function(this, `${props.projectName}-${props.envName}-import-segment-function`, {
      code: lambda.Code.fromAsset(path.join(__dirname, "./import-segment")),
      environment: {
        APPLICATION_ID: props.applicationId,
        PINPOINT_ROLE: props.pinpointRole,
      },
      functionName: `${props.projectName}-${props.envName}-import-segment-function`,
      handler: "lambda_function.lambda_handler",
      role: roleForSegmentImport,
      runtime: lambda.Runtime.PYTHON_3_9,
      timeout: Duration.seconds(3),
    });

    const createEmailCampaginFunction = new lambda.Function(this, `${props.projectName}-${props.envName}-create-email-campagin-fucntion`, {
      code: lambda.Code.fromAsset(path.join(__dirname, "./create-email-campaign")),
      environment: {
        APPLICATION_ID: props.applicationId,
        TEMPLATE: "test-template",
      },
      functionName: `${props.projectName}-${props.envName}-create-email-campagin-fucntion`,
      handler: "lambda_function.lambda_handler",
      role: roleForEmailCampagin,
      runtime: lambda.Runtime.PYTHON_3_9,
      timeout: Duration.seconds(3),
    });

    const createSmsCampaginFunction = new lambda.Function(this, `${props.projectName}-${props.envName}-create-sms-campagin-fucntion`, {
      code: lambda.Code.fromAsset(path.join(__dirname, "./create-sms-campaign")),
      environment: {
        APPLICATION_ID: props.applicationId,
        TEMPLATE: "test-template",
      },
      functionName: `${props.projectName}-${props.envName}-create-sms-campagin-fucntion`,
      handler: "lambda_function.lambda_handler",
      role: roleForSmsCampagin,
      runtime: lambda.Runtime.PYTHON_3_9,
      timeout: Duration.seconds(3),
    });

    // Create Step Fucntions for lambda
    const invokeCreateEmailCampaginFucntion = new tasks.LambdaInvoke(this, "create-email-campagin", {
      lambdaFunction: createEmailCampaginFunction,
      outputPath: "$.Payload",
      retryOnServiceExceptions: false,
    });
    invokeCreateEmailCampaginFucntion.addRetry({
      backoffRate: 2,
      interval: Duration.seconds(2),
      maxAttempts: 5,
    });

    const invokeCreateSmsCampaginFucntion = new tasks.LambdaInvoke(this, "create-sms-campagin", {
      lambdaFunction: createSmsCampaginFunction,
      outputPath: "$.Payload",
      retryOnServiceExceptions: false,
    });
    invokeCreateSmsCampaginFucntion.addRetry({
      backoffRate: 2,
      interval: Duration.seconds(2),
      maxAttempts: 5,
    });

    const parallelUsingLambda = new sfn.Parallel(this, "parallel");
    parallelUsingLambda.branch(invokeCreateEmailCampaginFucntion);
    parallelUsingLambda.branch(invokeCreateSmsCampaginFucntion);

    const stateMachineForLambda = new sfn.StateMachine(this, `${props.projectName}-${props.envName}-statemachine-forlambda`, {
      definition: new tasks.LambdaInvoke(this, "import-segment", {
        lambdaFunction: importSegmentFunction,
        outputPath: "$.Payload",
      }).next(parallelUsingLambda),
      stateMachineName: `${props.projectName}-${props.envName}-statemachine-for-lambda`,
    });

    /**
     * Create Campaigns using Pinpoint API
     */
    const emailCampaign = new tasks.CallAwsService(this, "create-campaign-for-email-pinpointapi", {
      service: "pinpoint",
      action: "createCampaign",
      iamResources: ["*"],
      parameters: {
        ApplicationId: props.applicationId,
        WriteCampaignRequest: {
          Name: "campaign",
          Schedule: {
            StartTime: "IMMEDIATE",
          },
          "SegmentId.$": "$.ImportJobResponse.Definition.SegmentId",
          SegmentVersion: 1,
          TemplateConfiguration: {
            EmailTemplate: {
              Name: "test-template",
            },
          },
        },
      },
    });
    emailCampaign.addRetry({
      backoffRate: 2,
      interval: Duration.seconds(2),
      maxAttempts: 5,
    });

    const smsCampaign = new tasks.CallAwsService(this, "create-campaign-for-sms-pinpointapi", {
      service: "pinpoint",
      action: "createCampaign",
      iamResources: ["*"],
      parameters: {
        ApplicationId: props.applicationId,
        WriteCampaignRequest: {
          Name: "campaign",
          Schedule: {
            StartTime: "IMMEDIATE",
          },
          "SegmentId.$": "$.ImportJobResponse.Definition.SegmentId",
          SegmentVersion: 1,
          TemplateConfiguration: {
            SmsTemplate: {
              Name: "test-template",
            },
          },
        },
      },
    });
    smsCampaign.addRetry({
      backoffRate: 2,
      interval: Duration.seconds(2),
      maxAttempts: 5,
    });

    const parallelUsingPinpointApi = new sfn.Parallel(this, `${props.projectName}-${props.envName}-parallel-using-pinpointapi`);
    parallelUsingPinpointApi.branch(emailCampaign);
    parallelUsingPinpointApi.branch(smsCampaign);

    const stateMachineForPinpointApi = new sfn.StateMachine(this, `${props.projectName}-${props.envName}-statemachine-for-pinpointapi`, {
      definition: new tasks.CallAwsService(this, "import-segment-pinpointapi", {
        service: "pinpoint",
        action: "createImportJob",
        iamResources: ["*"],
        parameters: {
          ApplicationId: props.applicationId,
          ImportJobRequest: {
            DefineSegment: true,
            Format: "CSV",
            RegisterEndpoints: true,
            RoleArn: "arn:aws:iam::266232831585:role/service-role/pinpoint-events",
            "S3Url.$": "States.Format('s3://{}/{}', $.detail.bucket.name,$.detail.object.key)",
            "SegmentName.$": "States.Format('segment-{}', $.detail.object.key)",
          },
        },
      }).next(parallelUsingPinpointApi),
      stateMachineName: `${props.projectName}-${props.envName}-statemachine-for-pinpointapi`,
    });

    /**
     * Create EventBridge
     */
    new events.Rule(this, `${props.projectName}-${props.envName}-rule`, {
      eventPattern: {
        source: ["aws.s3"],
        detailType: ["Object Created"],
        detail: {
          bucket: {
            name: [props.bucket.bucketName],
          },
        },
      },
      ruleName: `${props.projectName}-${props.envName}-rule`,
      targets: [new targets.SfnStateMachine(stateMachineForLambda)],
    });
  }
}
