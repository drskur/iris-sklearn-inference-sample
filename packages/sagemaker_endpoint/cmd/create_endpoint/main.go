package main

import (
	"context"
	"errors"
	"github.com/aws/aws-lambda-go/lambda"
	"log"
	"os"
	"sagemaker_endpoint/sagemaker"
)

type CreateEdnpointEvent struct {
	ModelPackageGroupName string `json:"modelPackageGroupName"`
	InstanceType          string `json:"instanceType"`
}

func HandleRequest(ctx context.Context, event CreateEdnpointEvent) (string, error) {
	log.Printf("Event: %+v", event)

	region := os.Getenv("SAGEMAKER_REGION")
	executionRoleArn := os.Getenv("EXECUTION_ROLE_ARN")

	if region == "" || executionRoleArn == "" {
		return "", errors.New("SAGEMAKER_REGION | EXECUTION_ROLE_ARN must be set")
	}

	manager := sagemaker.NewEndpointManager(region, executionRoleArn)
	log.Printf("%v", manager)
	latest, err := manager.FindLatestModelPackage(event.ModelPackageGroupName)
	if err != nil {
		log.Fatal(err)
	}

	modelName, err := manager.CreateModel(event.ModelPackageGroupName, latest.ModelPackageArn)
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
