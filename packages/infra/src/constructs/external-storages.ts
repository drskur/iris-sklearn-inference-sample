/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Bucket, IBucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface ExternalStoragesProps {
  readonly modelArtifactBucketName?: string;
  readonly codeStorageBucketName?: string;
}

export class ExternalStorages extends Construct {
  public readonly modelArtifactBucket: IBucket;
  public readonly codeStorageBucket: IBucket;

  constructor(scope: Construct, id: string, props: ExternalStoragesProps) {
    super(scope, id);

    const { modelArtifactBucketName, codeStorageBucketName } = props;

    if (modelArtifactBucketName) {
      this.modelArtifactBucket = Bucket.fromBucketName(
        this,
        "ModelArtifact",
        modelArtifactBucketName
      );
    } else {
      this.modelArtifactBucket = new Bucket(this, "ModelArtifact", {
        enforceSSL: true,
        serverAccessLogsPrefix: "logs/",
      });
    }

    if (codeStorageBucketName) {
      this.codeStorageBucket = Bucket.fromBucketName(
        this,
        "CodeStorage",
        codeStorageBucketName
      );
    } else {
      this.codeStorageBucket = new Bucket(this, "CodeStorage", {
        enforceSSL: true,
        serverAccessLogsPrefix: "logs/",
      });
    }
  }
}
