/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { NxMonorepoProject } from "@aws-prototyping-sdk/nx-monorepo";
import { PDKPipelineTsProject } from "@aws-prototyping-sdk/pipeline";
import { Project } from "projen";
import { NodePackageManager } from "projen/lib/javascript";
import { TypeScriptProject } from "projen/lib/typescript";

const project = new NxMonorepoProject({
  defaultReleaseBranch: "mainline",
  packageManager: NodePackageManager.PNPM,
  devDeps: [
    "@aws-prototyping-sdk/nx-monorepo",
    "@aws-prototyping-sdk/pipeline",
  ],
  name: "hip",
});
project.addGitIgnore(".idea");

new PDKPipelineTsProject({
  parent: project,
  packageManager: NodePackageManager.PNPM,
  outdir: "packages/infra",
  defaultReleaseBranch: "mainline",
  name: "infra",
  cdkVersion: "2.1.0",
  deps: ["@aws-cdk/aws-lambda-go-alpha"],
  devDeps: ["@types/uuid"],
});

new TypeScriptProject({
  parent: project,
  packageManager: NodePackageManager.PNPM,
  name: "model_registration",
  outdir: "packages/model_registration",
  defaultReleaseBranch: "mainline",
  prettier: true,
  eslint: true,
  devDeps: ["@types/aws-lambda"],
  deps: ["aws-lambda", "@aws-sdk/client-sagemaker"],
});

new Project({
  parent: project,
  name: "sagemaker_endpoint",
  outdir: "packages/sagemaker_endpoint",
});

new Project({
  parent: project,
  name: "sagemaker_batch_inference",
  outdir: "packages/sagemaker_batch_inference",
});

project.synth();
