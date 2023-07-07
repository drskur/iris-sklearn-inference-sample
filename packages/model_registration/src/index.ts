/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Handler } from "aws-lambda";
import { ModelRegistrationFunctionInput } from "./input";
import { ModelRegistration } from "./model-registration";

export const handler: Handler = async (
  event: ModelRegistrationFunctionInput,
  context,
  callback
) => {
  console.log("EVENT: \n" + JSON.stringify(event, null, 2));

  const { MODEL_ARTIFACT_BUCKET, CODE_STORAGE_BUCKET, SAGEMAKER_REGION } =
    process.env;
  if (
    MODEL_ARTIFACT_BUCKET === undefined ||
    CODE_STORAGE_BUCKET === undefined ||
    SAGEMAKER_REGION === undefined
  ) {
    callback(
      "MODEL_ARTIFACT_BUCKET, CODE_STORAGE_BUCKET, SAGEMAKER_REGION must be set"
    );
    process.exit(1);
  }

  const modelRegistration = new ModelRegistration({
    modelArtifactBucketName: MODEL_ARTIFACT_BUCKET,
    codeStorageBucketName: CODE_STORAGE_BUCKET,
    region: SAGEMAKER_REGION,
  });

  const arn = await modelRegistration.findModelPackageGroupArn("iris");
  console.log("arn", arn);

  return context.logStreamName;
};
