/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { PDKPipeline } from "@aws-prototyping-sdk/pipeline";
import { Stack, StackProps } from "aws-cdk-lib";
import { LinuxBuildImage } from "aws-cdk-lib/aws-codebuild";
import { Construct } from "constructs";

export class PipelineStack extends Stack {
  readonly pipeline: PDKPipeline;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.pipeline = new PDKPipeline(this, "ApplicationPipeline", {
      primarySynthDirectory: "packages/infra/cdk.out",
      repositoryName:
        this.node.tryGetContext("repositoryName") || "hip-monorepo",
      defaultBranchName:
        this.node.tryGetContext("defaultBranchName") ||
        PDKPipeline.defaultBranchName,
      publishAssetsInParallel: false,
      crossAccountKeys: true,
      synth: {},
      sonarCodeScannerConfig: this.node.tryGetContext("sonarqubeScannerConfig"),
      synthCodeBuildDefaults: {
        buildEnvironment: {
          buildImage: LinuxBuildImage.STANDARD_7_0,
        },
      },
      synthShellStepPartialProps: {
        installCommands: [
          "npm install -g aws-cdk pnpm",
          "pnpm install --frozen-lockfile || npx projen && pnpm install --frozen-lockfile",
        ],
        commands: [
            "npx nx run-many --target=build --all"
        ]
      }
    });
  }
}
