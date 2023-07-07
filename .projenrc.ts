/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { NxMonorepoProject } from "@aws-prototyping-sdk/nx-monorepo";
import { NodePackageManager } from "projen/lib/javascript";
import { PDKPipelineTsProject } from "@aws-prototyping-sdk/pipeline";
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
  deps: ["aws-lambda"],
});

project.synth();
