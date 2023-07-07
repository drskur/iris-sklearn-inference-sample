/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { RemovalPolicy } from "aws-cdk-lib";
import {
  FlowLogDestination,
  FlowLogTrafficType,
  GatewayVpcEndpointAwsService,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export class HipVpc extends Construct {
  public readonly vpc: Vpc;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const cloudWatchLogs = new LogGroup(this, "Log", {
      logGroupName: "/aws/vpc/flowlogs",
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.vpc = new Vpc(this, "Vpc", {
      vpcName: "hip",
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "ingress",
          subnetType: SubnetType.PUBLIC,
          mapPublicIpOnLaunch: false,
        },
        {
          cidrMask: 24,
          name: "private",
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
        {
          cidrMask: 24,
          name: "private_egress",
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      flowLogs: {
        cloudwatch: {
          destination: FlowLogDestination.toCloudWatchLogs(cloudWatchLogs),
          trafficType: FlowLogTrafficType.ALL,
        },
      },
    });

    this.vpc.addGatewayEndpoint("S3VpcE", {
      service: GatewayVpcEndpointAwsService.S3,
    });
  }
}
