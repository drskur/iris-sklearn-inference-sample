import {NxMonorepoProject} from "@aws-prototyping-sdk/nx-monorepo";
import {NodePackageManager} from "projen/lib/javascript";

const project = new NxMonorepoProject({
    defaultReleaseBranch: "main",
    packageManager: NodePackageManager.PNPM,
    devDeps: ["@aws-prototyping-sdk/nx-monorepo"],
    name: "hip",
});
project.addGitIgnore(".idea");



project.synth();