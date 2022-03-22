import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib'
import { aws_s3 as s3 } from 'aws-cdk-lib';
import * as envutil from './env-util'

export class S3Buckets extends Construct {

  readonly staticWebsiteHostingBucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const env = envutil.getCurrentEnv(this);

    //bucket name needs to be given an environment specific prefix because bucket names must be globally unique within AWS
    this.staticWebsiteHostingBucket = new s3.Bucket(this, 'static-website-bucket', {
      bucketName: `${env}-${envutil.react_webapp_bucket_name_suffix}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });
  }

}
