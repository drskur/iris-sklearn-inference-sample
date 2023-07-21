/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CreateEndpointFunction } from "./constructs/create-endpoint-function";
import { ExternalStorages } from "./constructs/external-storages";
import { GeneralInferenceWorkflow } from "./constructs/general-inference-workflow";
import { HipVpc } from "./constructs/hip-vpc";
import { InferenceStorage } from "./constructs/inference-storage";
import { InvokeEndpointFunction } from "./constructs/invoke-endpoint-function";
import { ModelRegistrationFunction } from "./constructs/model-registration-function";
import { PostInferenceFunction } from "./constructs/post-inference-function";
import { UpdateEndpointFunction } from "./constructs/update-endpoint-function";

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

    const { inferenceBucket } = new InferenceStorage(this, "InferenceStorage");

    new CreateEndpointFunction(this, "CreateEndpointFunction", {
      vpc,
      modelArtifactBucket,
      codeStorageBucket,
      inferenceBucket,
    });

    new InvokeEndpointFunction(this, "InvokeEndpointFunction", {
      vpc,
    });

    new UpdateEndpointFunction(this, "UpdateEndpointFunction", {
      vpc,
      modelArtifactBucket,
      codeStorageBucket,
      inferenceBucket,
    });

    const postInferenceFunction = new PostInferenceFunction(
      this,
      "PostInferenceFunction",
      {
        vpc,
        inferenceBucket,
      }
    );

    new GeneralInferenceWorkflow(this, "GeneralInferenceWorkflow", {
      inferenceBucket,
      postInferenceFunction: postInferenceFunction.fn,
    });
  }
}
