/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class InferenceStorage extends Construct {
  public readonly inferenceBucket: Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.inferenceBucket = new Bucket(this, "Inference", {
      enforceSSL: true,
      serverAccessLogsPrefix: "logs/",
    });
  }
}
