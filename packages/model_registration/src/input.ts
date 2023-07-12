/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
export interface ModelRegistrationFunctionInput {
  // S3 path where model artifact are stored (tar.gz)
  modelArtifactS3Key: string;
  // S3 path where code are stored (tar.gz)
  codeStorageS3Key: string;
  // The name of the model. The version of the model is managed based on this name
  modelPackageGroupName: string;
  // Instance Type where the batch transform job will be executed
  transformInstanceType: string;
  // Instance Type where the sagemaker endpoint will be deployed
  inferenceInstanceType: string;
}
