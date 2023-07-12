/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CreateEndpointFunction } from "./constructs/create-endpoint-function";
import { ExternalStorages } from "./constructs/external-storages";
import { HipVpc } from "./constructs/hip-vpc";
import { InvokeEndpointFunction } from "./constructs/invoke-endpoint-function";
import { ModelRegistrationFunction } from "./constructs/model-registration-function";

export class ApplicationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const { modelArtifactBucket, codeStorageBucket } = new ExternalStorages(
      this,
      "ExternalStorages",
      {
        // If set to undefined, a new bucket will be created.
        // If the bucket already exists, enter a name.
        modelArtifactBucketName: undefined,
        codeStorageBucketName: undefined,
      }
    );

    const { vpc } = new HipVpc(this, "Vpc");

    new ModelRegistrationFunction(this, "ModelRegistrationFunction", {
      vpc,
      modelArtifactBucket,
      codeStorageBucket,
    });

    new CreateEndpointFunction(this, "CreateEndpointFunction", {
      vpc,
      modelArtifactBucket,
      codeStorageBucket,
    });

    new InvokeEndpointFunction(this, "InvokeEndpointFunction", {
      vpc,
    });
  }
}
