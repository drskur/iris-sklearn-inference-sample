import { Duration, Stack } from "aws-cdk-lib";
import { InstanceType } from "aws-cdk-lib/aws-ec2";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { IBucket } from "aws-cdk-lib/aws-s3";
import {
  DefinitionBody,
  IntegrationPattern,
  JsonPath,
  LogLevel,
  StateMachine,
  TaskInput,
} from "aws-cdk-lib/aws-stepfunctions";
import {
  LambdaInvoke,
  S3DataType,
  SageMakerCreateTransformJob,
} from "aws-cdk-lib/aws-stepfunctions-tasks";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export interface GeneralInferenceWorkflowProps {
  readonly inferenceBucket: IBucket;
  readonly postInferenceFunction: IFunction;
}

export class GeneralInferenceWorkflow extends Construct {
  private readonly inferenceBucket: IBucket;
  public readonly stateMachine: StateMachine;

  constructor(
    scope: Construct,
    id: string,
    props: GeneralInferenceWorkflowProps
  ) {
    super(scope, id);

    const { inferenceBucket, postInferenceFunction } = props;

    this.inferenceBucket = inferenceBucket;

    const logGroup = new LogGroup(this, "GeneralSfnLogGroup", {
      logGroupName: "sfn/general-inference",
    });

    const transformJobTask = this.createTransformJobTask();
    const postInferenceTask = new LambdaInvoke(this, "PostInferenceTask", {
      lambdaFunction: postInferenceFunction,
      payload: TaskInput.fromJsonPathAt("$"),
    });

    const definition = transformJobTask.next(postInferenceTask);

    const role = new Role(this, "StateMachineRole", {
      assumedBy: new ServicePrincipal("states.amazonaws.com"),
    });
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
          "events:PutTargets",
          "events:DescribeRule",
          "events:PutRule",
          "sagemaker:CreateTransformJob",
          "sagemaker:ListTags",
          "sagemaker:AddTags",
        ],
        resources: ["*"],
      })
    );
    NagSuppressions.addResourceSuppressions(
      role,
      [
        {
          id: "AwsSolutions-IAM5",
          appliesTo: [
            "Resource::*",
            `Resource::arn:<AWS::Partition>:sagemaker:${
              Stack.of(this).region
            }:${Stack.of(this).account}:transform-job/*`,
            "Resource::<PostInferenceFunction5913BC79.Arn>:*",
          ],
          reason: "Wildcards are needed for dynamically created resources.",
        },
      ],
      true
    );

    this.stateMachine = new StateMachine(this, "GeneralInferenceWorkflow", {
      definitionBody: DefinitionBody.fromChainable(definition),
      role,
      tracingEnabled: true,
      timeout: Duration.minutes(30),
      logs: {
        destination: logGroup,
        level: LogLevel.ALL,
      },
    });
  }

  private createTransformJobTask() {
    const role = new Role(this, "TransformJobRole", {
      assumedBy: new ServicePrincipal("sagemaker.amazonaws.com"),
    });
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["sagemaker:CreateTransformJob"],
        resources: [
          `arn:aws:sagemaker:${Stack.of(this).region}:${
            Stack.of(this).account
          }:transform-job/*`,
        ],
      })
    );
    NagSuppressions.addResourceSuppressions(
      role,
      [
        {
          id: "AwsSolutions-IAM5",
          appliesTo: [
            `Resource::arn:aws:sagemaker:${Stack.of(this).region}:${
              Stack.of(this).account
            }:transform-job/*`,
          ],
          reason: "Wildcards are needed for dynamically created resources.",
        },
      ],
      true
    );

    return new SageMakerCreateTransformJob(this, "TransformJobTask", {
      transformJobName: JsonPath.stringAt("$$.Execution.Name"),
      role,
      modelName: JsonPath.stringAt("$.modelName"),
      integrationPattern: IntegrationPattern.RUN_JOB,
      transformInput: {
        transformDataSource: {
          s3DataSource: {
            s3DataType: S3DataType.S3_PREFIX,
            s3Uri: JsonPath.format(
              `s3://${this.inferenceBucket.bucketName}/{}`,
              JsonPath.stringAt("$.inputS3Path")
            ),
          },
        },
        contentType: JsonPath.stringAt("$.inputContentType"),
      },
      transformOutput: {
        s3OutputPath: JsonPath.format(
          `s3://${this.inferenceBucket.bucketName}/output/{}`,
          JsonPath.stringAt("$$.Execution.Name")
        ),
      },
      transformResources: {
        instanceType: new InstanceType(JsonPath.stringAt("$.instanceType")),
        instanceCount: 1,
      },
    });
  }
}
