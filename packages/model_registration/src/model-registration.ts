import {
  DescribeModelPackageGroupCommand,
  SageMakerClient,
} from "@aws-sdk/client-sagemaker";

export interface ModelRegistrationProps {
  readonly modelArtifactBucketName: string;
  readonly codeStorageBucketName: string;
  readonly region: string;
}

export class ModelRegistration {
  public readonly modelArtifactBucketName: string;
  public readonly codeStorageBucketName: string;
  private sagemakerClient: SageMakerClient;

  constructor(props: ModelRegistrationProps) {
    const { modelArtifactBucketName, codeStorageBucketName, region } = props;

    this.modelArtifactBucketName = modelArtifactBucketName;
    this.codeStorageBucketName = codeStorageBucketName;

    this.sagemakerClient = new SageMakerClient({ region });
  }

  async findModelPackageGroupArn(modelPackageGroupName: string) {
    const input = new DescribeModelPackageGroupCommand({
      ModelPackageGroupName: modelPackageGroupName,
    });

    const output = await this.sagemakerClient.send(input);
    return output.ModelPackageGroupArn;
  }
}
