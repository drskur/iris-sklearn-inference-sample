package sagemaker

import (
	"context"
	"fmt"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sagemaker"
	"github.com/aws/aws-sdk-go-v2/service/sagemaker/types"
	"log"
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

func (m *EndpointManager) CreateModel(modelPackageGroupName string, modelPackageArn *string) (*sagemaker.CreateModelOutput, error) {
	now := time.Now()
	modelName := fmt.Sprintf("%s-%s", modelPackageGroupName, now.Format("2006-01-02-15-04-05"))
	container := types.ContainerDefinition{
		ModelPackageName: modelPackageArn,
	}
	input := sagemaker.CreateModelInput{
		ModelName:        &modelName,
		ExecutionRoleArn: m.executionRoleArn,
		Containers:       []types.ContainerDefinition{container},
	}

	return m.sagemakerSvc.CreateModel(context.TODO(), &input)
}
