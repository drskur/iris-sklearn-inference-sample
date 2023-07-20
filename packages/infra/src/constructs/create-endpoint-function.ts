/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
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
import { IBucket } from "aws-cdk-lib/aws-s3";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export interface CreateEndpointFunctionProps {
  readonly vpc: IVpc;
  readonly modelArtifactBucket: IBucket;
  readonly codeStorageBucket: IBucket;
}

export class CreateEndpointFunction extends Construct {
  public readonly fn: GoFunction;

  constructor(
    scope: Construct,
    id: string,
    props: CreateEndpointFunctionProps
  ) {
    super(scope, id);

    const { vpc, modelArtifactBucket, codeStorageBucket } = props;

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
        actions: [
          "sagemaker:ListModelPackages",
          "sagemaker:CreateModel",
          "sagemaker:CreateEndpointConfig",
          "sagemaker:CreateEndpoint",
        ],
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
            "Resource::arn:aws:sagemaker:ap-northeast-2:<AWS::AccountId>:*",
          ],
          reason: "Wildcards are needed for dynamically created resources.",
        },
      ],
      true
    );

    const executionRole = this.createExecutionRoleArn([
      modelArtifactBucket,
      codeStorageBucket,
    ]);

    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [executionRole.roleArn],
      })
    );

    this.fn = new GoFunction(this, "Function", {
      entry: "../sagemaker_endpoint/cmd/create_endpoint",
      runtime: Runtime.PROVIDED_AL2,
      timeout: Duration.seconds(10),
      vpc,
      role,
      environment: {
        SAGEMAKER_REGION: "ap-northeast-2",
        EXECUTION_ROLE_ARN: executionRole.roleArn,
      },
    });
  }

  // Create execution role for Model creation
  // refer this link - https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-roles.html#sagemaker-roles-createmodel-perms
  private createExecutionRoleArn(readBuckets: IBucket[]) {
    const role = new Role(this, "ModelExecutionRole", {
      assumedBy: new ServicePrincipal("sagemaker.amazonaws.com"),
    });
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "ec2:CreateNetworkInterface",
          "ec2:CreateNetworkInterfacePermission",
          "ec2:DeleteNetworkInterface",
          "ec2:DeleteNetworkInterfacePermission",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DescribeVpcs",
          "ec2:DescribeDhcpOptions",
          "ec2:DescribeSubnets",
          "ec2:DescribeSecurityGroups",
          "cloudwatch:PutMetricData",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:CreateLogGroup",
          "logs:DescribeLogStreams",
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ],
        resources: ["*"],
      })
    );

    for (const bucket of readBuckets) {
      bucket.grantRead(role);
    }

    NagSuppressions.addResourceSuppressions(
      role,
      [
        {
          id: "AwsSolutions-IAM5",
          appliesTo: [
            "Action::s3:GetObject*",
            "Action::s3:GetBucket*",
            "Action::s3:List*",
            "Resource::*",
            "Resource::<ExternalStoragesModelArtifact7A135898.Arn>/*",
            "Resource::<ExternalStoragesCodeStorage4FE4DB54.Arn>/*",
          ],
          reason: "Wildcards are needed for dynamically created resources.",
        },
      ],
      true
    );

    return role;
  }
}
