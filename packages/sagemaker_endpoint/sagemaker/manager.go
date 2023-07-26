package sagemaker

import (
	"context"
	"fmt"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sagemaker"
	"github.com/aws/aws-sdk-go-v2/service/sagemaker/types"
	"log"
	"os"
	"time"
)

type EndpointManager struct {
	sagemakerSvc     *sagemaker.Client
	executionRoleArn *string
}

func NewEndpointManager(region string, executionRoleArn string) *EndpointManager {
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	if err != nil {
		log.Fatal(err)
	}

	svc := sagemaker.NewFromConfig(cfg)

	return &EndpointManager{
		sagemakerSvc:     svc,
		executionRoleArn: &executionRoleArn,
	}
}

func (m *EndpointManager) FindLatestModelPackage(modelPackageGroupName string) (*types.ModelPackageSummary, error) {
	input := sagemaker.ListModelPackagesInput{
		ModelPackageGroupName: &modelPackageGroupName,
		ModelApprovalStatus:   types.ModelApprovalStatusApproved,
		SortOrder:             types.SortOrderDescending,
	}

	output, err := m.sagemakerSvc.ListModelPackages(context.TODO(), &input)
	if err != nil {
		return nil, err
	}

	return &output.ModelPackageSummaryList[0], nil
}

func (m *EndpointManager) CreateModel(modelPackageGroupName string, modelPackageArn *string) (string, error) {
	now := time.Now()
	modelName := fmt.Sprintf("%s-%s", modelPackageGroupName, now.Format("2006-01-02-15-04-05"))
	input := sagemaker.CreateModelInput{
		ModelName:        &modelName,
		ExecutionRoleArn: m.executionRoleArn,
		Containers: []types.ContainerDefinition{
			{
				ModelPackageName: modelPackageArn,
			},
		},
	}

	_, err := m.sagemakerSvc.CreateModel(context.TODO(), &input)

	return modelName, err
}

func (m *EndpointManager) CreateMultiModel(modelPackageGroupName string, modelArtifactsS3Prefix string, codeStorageS3Key string) (string, error) {
	now := time.Now()
	modelName := fmt.Sprintf("%s-%s", modelPackageGroupName, now.Format("2006-01-02-15-04-05"))
	region := os.Getenv("SAGEMAKER_REGION")
	modelBucket := os.Getenv("MODEL_ARTIFACT_BUCKET")
	codeBucket := os.Getenv("CODE_STORAGE_BUCKET")
	input := sagemaker.CreateModelInput{
		ModelName:        &modelName,
		ExecutionRoleArn: m.executionRoleArn,
		Containers: []types.ContainerDefinition{
			{
				Image:        aws.String("366743142698.dkr.ecr.ap-northeast-2.amazonaws.com/sagemaker-scikit-learn:1.2-1-cpu-py3"),
				ModelDataUrl: aws.String(fmt.Sprintf("s3://%s/%s", modelBucket, modelArtifactsS3Prefix)),
				Mode:         types.ContainerModeMultiModel,
				Environment: map[string]string{
					"SAGEMAKER_CONTAINER_LOG_LEVEL": "20",
					"SAGEMAKER_PROGRAM":             "inference.py",
					"SAGEMAKER_REGION":              region,
					"SAGEMAKER_SUBMIT_DIRECTORY":    fmt.Sprintf("s3://%s/%s", codeBucket, codeStorageS3Key),
				},
			},
		},
	}

	_, err := m.sagemakerSvc.CreateModel(context.TODO(), &input)

	return modelName, err
}

func (m *EndpointManager) CreateEndpointConfig(modelPackageGroupName string, instanceType string, modelName string) (string, error) {
	now := time.Now()
	endpointConfigName := fmt.Sprintf("%s-epc-%s", modelPackageGroupName, now.Format("2006-01-02-15-04-05"))
	input := sagemaker.CreateEndpointConfigInput{
		EndpointConfigName: &endpointConfigName,
		ProductionVariants: []types.ProductionVariant{
			{
				InstanceType:         types.ProductionVariantInstanceType(instanceType),
				InitialInstanceCount: aws.Int32(1),
				InitialVariantWeight: aws.Float32(1),
				ModelName:            &modelName,
				VariantName:          aws.String("AllTraffic"),
			},
		},
	}

	_, err := m.sagemakerSvc.CreateEndpointConfig(context.TODO(), &input)
	return endpointConfigName, err
}

func (m *EndpointManager) CreateEndpoint(modelPackageGroupName string, endpointConfigName string) (string, error) {
	endpointName := fmt.Sprintf("%s-ep", modelPackageGroupName)
	input := sagemaker.CreateEndpointInput{
		EndpointName:       &endpointName,
		EndpointConfigName: &endpointConfigName,
	}
	_, err := m.sagemakerSvc.CreateEndpoint(context.TODO(), &input)

	return endpointName, err
}

func (m *EndpointManager) CreateEndpointConfigWithModelName(modelPackageGroupName string, modelName string) (string, error) {
	now := time.Now()
	endpointConfigName := fmt.Sprintf("%s-epc-%s", modelPackageGroupName, now.Format("2006-01-02-15-04-05"))

	listEndpointConfigsOutput, err := m.sagemakerSvc.ListEndpointConfigs(context.TODO(), &sagemaker.ListEndpointConfigsInput{
		NameContains: aws.String(fmt.Sprintf("%s-", modelPackageGroupName)),
	})
	if err != nil {
		return "", err
	}
	latestConfig := listEndpointConfigsOutput.EndpointConfigs[0]

	describeEndpointConfigOutput, err := m.sagemakerSvc.DescribeEndpointConfig(context.TODO(), &sagemaker.DescribeEndpointConfigInput{
		EndpointConfigName: latestConfig.EndpointConfigName,
	})
	if err != nil {
		return "", err
	}

	variants := describeEndpointConfigOutput.ProductionVariants
	for _, v := range variants {
		v.ModelName = &modelName
	}

	_, err = m.sagemakerSvc.CreateEndpointConfig(context.TODO(), &sagemaker.CreateEndpointConfigInput{
		EndpointConfigName: &endpointConfigName,
		ProductionVariants: variants,
	})
	for _, v := range variants {
		v.ModelName = &modelName
	}

	return endpointConfigName, err
}

func (m *EndpointManager) UpdateEndpoint(endpointName string, endpointConfigName string) (string, error) {
	input := sagemaker.UpdateEndpointInput{
		EndpointName:       &endpointName,
		EndpointConfigName: &endpointConfigName,
	}
	_, err := m.sagemakerSvc.UpdateEndpoint(context.TODO(), &input)
	if err != nil {
		return "", err
	}

	return endpointName, nil
}
