package main

import (
	"context"
	"errors"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sagemakerruntime"
	"log"
	"os"
)

type InvokeEndpointEvent struct {
	EndpointName string `json:"endpointName"`
	TargetModel  string `json:"targetModel,omitempty"`
	Body         string `json:"body"`
}

func HandleRequest(ctx context.Context, event InvokeEndpointEvent) (string, error) {
	log.Printf("Event: %+v", event)

	region := os.Getenv("SAGEMAKER_REGION")

	if region == "" {
		return "", errors.New("SAGEMAKER_REGION must be set")
	}

	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion(region))
	if err != nil {
		log.Fatal(err)
	}

	runtime := sagemakerruntime.NewFromConfig(cfg)

	input := sagemakerruntime.InvokeEndpointInput{
		EndpointName: &event.EndpointName,
		Body:         []byte(event.Body),
		ContentType:  aws.String("application/json"),
	}

	if event.TargetModel != "" {
		input.TargetModel = &event.TargetModel
	}

	output, err := runtime.InvokeEndpoint(context.TODO(), &input)
	if err != nil {
		log.Fatal(err)
	}

	return string(output.Body), nil

}

func main() {
	lambda.Start(HandleRequest)
}
