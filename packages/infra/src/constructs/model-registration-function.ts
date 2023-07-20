/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Duration, Stack } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export interface ModelRegistrationFunctionProps {
  readonly vpc: IVpc;
  readonly modelArtifactBucket: IBucket;
  readonly codeStorageBucket: IBucket;
}

export class ModelRegistrationFunction extends Construct {
  public fn: NodejsFunction;

  constructor(
    scope: Construct,
    id: string,
    props: ModelRegistrationFunctionProps
  ) {
    super(scope, id);

    const { vpc, modelArtifactBucket, codeStorageBucket } = props;

    // Using AWS Managed policies can be a security threat.
    // Therefore, we create a role for the Lambda function and grant permissions.
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
          "sagemaker:DescribeModelPackageGroup",
          "sagemaker:CreateModelPackageGroup",
          "sagemaker:CreateModelPackage",
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
            `Resource::arn:aws:sagemaker:${Stack.of(this).region}:${
              Stack.of(this).account
            }:*`,
          ],
          reason: "Wildcards are needed for dynamically created resources.",
        },
      ],
      true
    );
    modelArtifactBucket.grantRead(role);
    codeStorageBucket.grantRead(role);
    NagSuppressions.addResourceSuppressions(
      role,
      [
        {
          id: "AwsSolutions-IAM5",
          appliesTo: [
            "Action::s3:GetObject*",
            `Action::s3:GetBucket*`,
            "Action::s3:List*",
            "Resource::<ExternalStoragesModelArtifact7A135898.Arn>/*",
            "Resource::<ExternalStoragesCodeStorage4FE4DB54.Arn>/*",
          ],
          reason: "Wildcards are needed for dynamically created resources.",
        },
      ],
      true
    );

    this.fn = new NodejsFunction(this, "Function", {
      entry: "../model_registration/src/index.ts",
      timeout: Duration.seconds(10),
      runtime: Runtime.NODEJS_18_X,
      role,
      vpc,
      environment: {
        MODEL_ARTIFACT_BUCKET: modelArtifactBucket.bucketName,
        CODE_STORAGE_BUCKET: codeStorageBucket.bucketName,
        SAGEMAKER_REGION: "ap-northeast-2",
      },
    });
  }
}
