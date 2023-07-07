/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Duration } from "aws-cdk-lib";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export interface ModelRegistrationFunctionProps {
  readonly vpc: IVpc;
}

export class ModelRegistrationFunction extends Construct {
  public fn: NodejsFunction;

  constructor(
    scope: Construct,
    id: string,
    props: ModelRegistrationFunctionProps
  ) {
    super(scope, id);

    const { vpc } = props;

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

    NagSuppressions.addResourceSuppressions(
      role,
      [
        {
          id: "AwsSolutions-IAM5",
          appliesTo: ["Resource::*"],
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
    });
  }
}
