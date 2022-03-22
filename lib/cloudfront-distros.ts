import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib'
import { CfnOutput } from 'aws-cdk-lib';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { aws_cloudfront as cloudfront } from 'aws-cdk-lib';
import { aws_cloudfront_origins as origins } from 'aws-cdk-lib';
import { aws_certificatemanager as acm } from 'aws-cdk-lib';
import * as envutil from './env-util'

export interface CloudFrontDistrosProps {
  readonly staticWebsiteHostingBucket: s3.Bucket;
}

export class CloudFrontDistros extends Construct {

  readonly webAppDomainName: string

  constructor(scope: Construct, id: string, props: CloudFrontDistrosProps) {
    super(scope, id);

    const env = envutil.getCurrentEnv(this);

    // this.webAppDomainName = envutil.getAdminWebAppFqdn(this)
    // const certificate = acm.Certificate.fromCertificateArn(this, 'StaticWebsiteCloudFrontDistroCertificate', envutil.getWebTlsCertArn(this));

    const distribution = new cloudfront.Distribution(this, 'StaticWebsiteCloudFrontDistro', {
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultRootObject: 'index.html',
      // domainNames: [this.webAppDomainName],
      // certificate: certificate,
      defaultBehavior: {
        origin: new origins.S3Origin(props.staticWebsiteHostingBucket),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      enableLogging: true,  // Optional, this is implied if logBucket is specified
      logBucket: new s3.Bucket(this, `${env}-${envutil.customer_name}-logs`),
      logFilePrefix: 'cloudfront-distribution-access-logs/',
      logIncludesCookies: true,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html'
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html'
        }
      ],
    });

    new CfnOutput(this, `StaticWebsiteCloudFrontDistro-domainName`, { value: distribution.domainName })
  }

}
