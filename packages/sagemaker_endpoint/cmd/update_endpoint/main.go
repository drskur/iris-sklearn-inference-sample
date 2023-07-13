package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"log"
	"os"
	"sagemaker_endpoint/sagemaker"
)

type ModelPackageStateChangeEventDetail struct {
	ModelPackageGroupName string `json:"ModelPackageGroupName"`
	ModelPackageArn       string `json:"ModelPackageArn"`
}

func HandleRequest(ctx context.Context, event events.CloudWatchEvent) (string, error) {
	var detail ModelPackageStateChangeEventDetail
	err := json.Unmarshal(event.Detail, &detail)
	if err != nil {
		return "", err
	}

	log.Printf("Detail: %v", detail)

	region := os.Getenv("SAGEMAKER_REGION")
	executionRoleArn := os.Getenv("EXECUTION_ROLE_ARN")

	if region == "" || executionRoleArn == "" {
		return "", errors.New("SAGEMAKER_REGION | EXECUTION_ROLE_ARN must be set")
	}

	manager := sagemaker.NewEndpointManager(region, executionRoleArn)

	modelName, err := manager.CreateModel(detail.ModelPackageGroupName, &detail.ModelPackageArn)
	if err != nil {
		log.Fatal(err)
	}

	endpointCfgName, err := manager.CreateEndpointConfigWithModelName(detail.ModelPackageGroupName, modelName)
	if err != nil {
		log.Fatal(err)
	}
	endpointName := fmt.Sprintf("%s-ep", detail.ModelPackageGroupName)
	_, err = manager.UpdateEndpoint(endpointName, endpointCfgName)
	if err != nil {
		log.Fatal(err)
	}

	return endpointName, nil
}

func main() {
	lambda.Start(HandleRequest)
}
