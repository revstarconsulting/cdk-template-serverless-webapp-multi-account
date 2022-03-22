import { Construct } from 'constructs';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { aws_cognito as cognito } from 'aws-cdk-lib';
import * as apigwv2 from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpUserPoolAuthorizer } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { LambdaFunctions } from './lambda-functions';
import { aws_certificatemanager as acm } from 'aws-cdk-lib';
import * as envutil from './env-util';

export interface LambdaFunctionsProps {
  readonly webAppDomainName: string
  readonly lambdaFunctions: LambdaFunctions
  readonly userPool: cognito.UserPool
  readonly webAppClient: cognito.UserPoolClient;
}

export class HttpApis extends Construct {

  api: apigwv2.HttpApi
  authorizer: HttpUserPoolAuthorizer

  constructor(scope: Construct, id: string, props: LambdaFunctionsProps) {
    super(scope, id);

    // const apiDomainName = envutil.getApiFqdn(this);
    // const certificate = acm.Certificate.fromCertificateArn(this, 'SeedClassroomApiCertificate', envutil.getApiTlsCertArn(this));
    //
    // const customDomain = new apigwv2.DomainName(this, 'SeedClassroomAPICustomDomain', {
    //   domainName: apiDomainName,
    //   certificate: certificate,
    // });

    const allowOrigins = envutil.isDev(this) ? ['https://*', 'http://*'] : [`https://${props.webAppDomainName}`]

    this.api = new apigwv2.HttpApi(this, envutil.api_name, {
      // defaultDomainMapping: {
      //   domainName: customDomain,
      // },
      corsPreflight: {
        allowOrigins: allowOrigins,
        allowCredentials: true,
        allowMethods: [ apigwv2.CorsHttpMethod.ANY ],
        allowHeaders: [
          '*',
        ],
      },
    });


    // Authorizer for the c-watch API that uses the Cognito User pool to Authorize users.
    this.authorizer = new HttpUserPoolAuthorizer('CognitoUserPoolAuthorizer', props.userPool, {
      userPoolClients: [
        props.webAppClient,
      ],
    });

    this.addPublicRoutes('BoatsFunctionIntegration', '/boats', props.lambdaFunctions.boatsFunction)
  }

  private addProtectedRoutes(lambdaIntegrationConstructName: string, path: string, lambdaFunction: lambda.Function): void {
    const lambdaIntegration = new HttpLambdaIntegration(lambdaIntegrationConstructName, lambdaFunction);

    this.api.addRoutes({
      path: `${path}/{proxy+}`,
      methods: [ apigwv2.HttpMethod.OPTIONS ],
      integration: lambdaIntegration,
    });

    this.api.addRoutes({
      path: `${path}/{proxy+}`,
      methods: [ apigwv2.HttpMethod.ANY ],
      integration: lambdaIntegration,
      authorizer: this.authorizer,
    });
  }

  private addPublicRoutes(lambdaIntegrationConstructName: string, path: string, lambdaFunction: lambda.Function): void {
    const lambdaIntegration = new HttpLambdaIntegration(lambdaIntegrationConstructName, lambdaFunction);

    this.api.addRoutes({
      path: `${path}/{proxy+}`,
      methods: [ apigwv2.HttpMethod.OPTIONS ],
      integration: lambdaIntegration,
    });

    this.api.addRoutes({
      path: `${path}/{proxy+}`,
      methods: [ apigwv2.HttpMethod.ANY ],
      integration: lambdaIntegration,
    });
  }

}
