import {
  CreateModelPackageCommand,
  CreateModelPackageGroupCommand,
  DescribeModelPackageGroupCommand,
  SageMakerClient,
  UpdateModelPackageCommand,
} from "@aws-sdk/client-sagemaker";
import { ModelRegistrationFunctionInput } from "./input";

export interface ModelRegistrationProps {
  readonly modelArtifactBucketName: string;
  readonly codeStorageBucketName: string;
  readonly region: string;
}

export class ModelRegistration {
  public readonly modelArtifactBucketName: string;
  public readonly codeStorageBucketName: string;
  public readonly sagemakerRegion: string;
  private sagemakerClient: SageMakerClient;

  constructor(props: ModelRegistrationProps) {
    const { modelArtifactBucketName, codeStorageBucketName, region } = props;

    this.modelArtifactBucketName = modelArtifactBucketName;
    this.codeStorageBucketName = codeStorageBucketName;
    this.sagemakerRegion = region;

    this.sagemakerClient = new SageMakerClient({ region });
  }

  private async findModelPackageGroupArn(modelPackageGroupName: string) {
    const cmd = new DescribeModelPackageGroupCommand({
      ModelPackageGroupName: modelPackageGroupName,
    });

    try {
      const output = await this.sagemakerClient.send(cmd);
      return output.ModelPackageGroupArn;
    } catch (e) {
      // Not found
      return undefined;
    }
  }

  private async createModelPackageGroup(modelPackageGroupName: string) {
    const cmd = new CreateModelPackageGroupCommand({
      ModelPackageGroupName: modelPackageGroupName,
    });
    const output = await this.sagemakerClient.send(cmd);

    return output.ModelPackageGroupArn || "";
  }

  async findOrCreateModelPackageGroup(modelPackageGroupName: string) {
    const existArn = await this.findModelPackageGroupArn(modelPackageGroupName);
    if (existArn) {
      return existArn;
    }

    return this.createModelPackageGroup(modelPackageGroupName);
  }

  async modelPackageApprove(modelPackageArn: string) {
    const cmd = new UpdateModelPackageCommand({
      ModelPackageArn: modelPackageArn,
      ModelApprovalStatus: "Approved",
    });

    return this.sagemakerClient.send(cmd);
  }

  async createModelPackage(
    modelPackageGroupArn: string,
    input: ModelRegistrationFunctionInput
  ) {
    const cmd = new CreateModelPackageCommand({
      InferenceSpecification: {
        Containers: [
          {
            Image:
              "366743142698.dkr.ecr.ap-northeast-2.amazonaws.com/sagemaker-scikit-learn:1.2-1-cpu-py3",
            ModelDataUrl: `s3://${this.modelArtifactBucketName}/${input.modelArtifactS3Key}`,
            Framework: "SKLEARN",
            Environment: {
              SAGEMAKER_CONTAINER_LOG_LEVEL: "20",
              SAGEMAKER_PROGRAM: "inference.py",
              SAGEMAKER_REGION: this.sagemakerRegion,
              SAGEMAKER_SUBMIT_DIRECTORY: `s3://${this.codeStorageBucketName}/${input.codeStorageS3Key}`,
            },
          },
        ],
        SupportedTransformInstanceTypes: [input.transformInstanceType],
        SupportedRealtimeInferenceInstanceTypes: [input.transformInstanceType],
        SupportedContentTypes: ["text/csv"],
        SupportedResponseMIMETypes: ["text/csv"],
      },
      ModelPackageGroupName: modelPackageGroupArn,
      ModelApprovalStatus: "Approved",
    });

    return this.sagemakerClient.send(cmd);
  }

}
