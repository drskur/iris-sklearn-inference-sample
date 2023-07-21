package main

import (
	"bytes"
	"context"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"log"
	"net/url"
)

// PostInferenceEvent only use TransformOutput field.
// {
// ...
//
//	"TransformOutput": {
//	"S3OutputPath": "s3://dev-hipapplication-inferencestorageinferencea1483-1lml0zf3buhsc/output/e52f72d5-8b69-4fcd-bdff-6b623336473b",
//	"Accept": null,
//	"AssembleWith": "NONE",
//	"KmsKeyId": null,
//	"OutputPrefix": null,
//	"OutputSuffix": null
//
// ...
// }
type PostInferenceEvent struct {
	TransformOutput struct {
		S3OutputPath string `json:"S3OutputPath"`
	} `json:"TransformOutput"`
}

func HandleRequest(ctx context.Context, event PostInferenceEvent) error {
	log.Printf("Event: %+v", event)

	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatal(err)
	}

	svc := s3.NewFromConfig(cfg)

	s3Uri, err := url.Parse(event.TransformOutput.S3OutputPath)
	if err != nil {
		return err
	}
	log.Printf("s3Uri: %v", *s3Uri)

	listObjectOutput, err := svc.ListObjectsV2(context.TODO(), &s3.ListObjectsV2Input{
		Bucket: aws.String(s3Uri.Host),
		Prefix: aws.String(s3Uri.Path[1:]), // s3Uri.Path starts from "/". so remove "/"
	})

	if err != nil {
		return err
	}

	log.Printf("This is file list at %v", s3Uri.Path)
	for _, v := range listObjectOutput.Contents {
		output, err := svc.GetObject(context.TODO(), &s3.GetObjectInput{
			Bucket: aws.String(s3Uri.Host),
			Key:    v.Key,
		})
		if err != nil {
			log.Printf("%v", err)
		}

		buf := new(bytes.Buffer)
		_, err = buf.ReadFrom(output.Body)
		if err != nil {
			log.Printf("%v", err)
		}

		log.Printf("%s\n %s", *v.Key, buf.String())
	}

	return nil
}

func main() {
	lambda.Start(HandleRequest)
}
