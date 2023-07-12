import { GoFunction } from "@aws-cdk/aws-lambda-go-alpha";
import { Duration, Stack } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export interface InvokeEndpointFunctionProps {
  readonly vpc: IVpc;
}

export class InvokeEndpointFunction extends Construct {
  public readonly fn: GoFunction;

  constructor(
    scope: Construct,
    id: string,
    props: InvokeEndpointFunctionProps
  ) {
    super(scope, id);

    const { vpc } = props;

    const role = new Role(this, "Role", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
          "ec2:AssignPrivateIpAddresses",
          "ec2:UnassignPrivateIpAddresses",
        ],
        resources: ["*"],
      })
    );

    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["sagemaker:InvokeEndpoint"],
        resources: [
          `arn:aws:sagemaker:${Stack.of(this).region}:${
            Stack.of(this).account
          }:*`,
        ],
      })
    );

    NagSuppressions.addResourceSuppressions(
      role,
      [
        {
          id: "AwsSolutions-IAM5",
          appliesTo: [
            "Resource::*",
            `Resource::arn:aws:sagemaker:${Stack.of(this).region}:${
              Stack.of(this).account
            }:*`,
          ],
          reason: "Wildcards are needed for dynamically created resources.",
        },
      ],
      true
    );

    this.fn = new GoFunction(this, "Function", {
      entry: "../sagemaker_endpoint/cmd/invoke_endpoint",
      runtime: Runtime.PROVIDED,
      timeout: Duration.seconds(10),
      vpc,
      role,
      environment: {
        SAGEMAKER_REGION: "ap-northeast-2",
      },
    });
  }
}
