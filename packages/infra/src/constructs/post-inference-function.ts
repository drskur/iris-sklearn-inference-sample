import { GoFunction } from "@aws-cdk/aws-lambda-go-alpha";
import { Duration } from "aws-cdk-lib";
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

export interface PostInferenceFunctionProps {
  readonly vpc: IVpc;
  readonly inferenceBucket: IBucket;
}

export class PostInferenceFunction extends Construct {
  public readonly fn: GoFunction;

  constructor(scope: Construct, id: string, props: PostInferenceFunctionProps) {
    super(scope, id);

    const { vpc, inferenceBucket } = props;

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
    inferenceBucket.grantRead(role);

    NagSuppressions.addResourceSuppressions(
      role,
      [
        {
          id: "AwsSolutions-IAM5",
          appliesTo: [
            "Resource::*",
            "Action::s3:GetObject*",
            "Action::s3:GetBucket*",
            "Action::s3:List*",
            "Resource::<InferenceStorageInferenceA1483016.Arn>/*",
          ],
          reason: "Wildcards are needed for dynamically created resources.",
        },
      ],
      true
    );

    this.fn = new GoFunction(this, "Function", {
      entry: "../sagemaker_batch_inference/cmd/post_inference",
      runtime: Runtime.PROVIDED_AL2,
      timeout: Duration.seconds(10),
      vpc,
      role,
      environment: {
        BUCKET: inferenceBucket.bucketName,
      },
    });
  }
}
