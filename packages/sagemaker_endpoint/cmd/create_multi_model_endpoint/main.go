package main

import (
	"context"
	"errors"
	"github.com/aws/aws-lambda-go/lambda"
	"log"
	"os"
	"sagemaker_endpoint/sagemaker"
)

type CreateEndpointEvent struct {
	ModelPackageGroupName  string `json:"modelPackageGroupName"`
	CodeS3Key              string `json:"codeS3Key"`
	ModelArtifactsS3Prefix string `json:"modelArtifactsS3Prefix"`
	InstanceType           string `json:"instanceType"`
}

func HandleRequest(ctx context.Context, event CreateEndpointEvent) (string, error) {
	log.Printf("Event: %+v", event)

	region := os.Getenv("SAGEMAKER_REGION")
	executionRoleArn := os.Getenv("EXECUTION_ROLE_ARN")
	modelBucket := os.Getenv("MODEL_ARTIFACT_BUCKET")
	codeBucket := os.Getenv("CODE_STORAGE_BUCKET")

	if region == "" || executionRoleArn == "" || modelBucket == "" || codeBucket == "" {
		return "", errors.New("SAGEMAKER_REGION | EXECUTION_ROLE_ARN | MODEL_ARTIFACT_BUCKET | CODE_STORAGE_BUCKET must be set")
	}

	manager := sagemaker.NewEndpointManager(region, executionRoleArn)

	modelName, err := manager.CreateMultiModel(event.ModelPackageGroupName, event.ModelArtifactsS3Prefix, event.CodeS3Key)
	if err != nil {
		log.Fatal(err)
	}

	endpointCfgName, err := manager.CreateEndpointConfig(event.ModelPackageGroupName, event.InstanceType, modelName)
	if err != nil {
		log.Fatal(err)
	}
	endpointName, err := manager.CreateEndpoint(event.ModelPackageGroupName, endpointCfgName)
	if err != nil {
		log.Fatal(err)
	}

	return endpointName, nil
}

func main() {
	lambda.Start(HandleRequest)
}
