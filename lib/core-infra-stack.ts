import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib'
import { aws_codecommit as codecommit } from 'aws-cdk-lib';
import { CloudFrontDistros } from './cloudfront-distros'
import { Cognito } from './cognito'
import { DeploymentPipelineIAMRoles } from './deployment-pipeline-iam-roles'
import { DevEnvironmentIAM } from './dev-environment-iam'
import { LambdaFunctions } from './lambda-functions'
import { HttpApis } from './http-apis'
import { ReactWebappPipeline } from './react-webapp-pipeline'
import { RdsDatabasesConstruct } from './rds-databases'
import { S3Buckets } from './s3-buckets'
import { ServicesPipeline } from './services-pipeline'
import { VpcConstruct } from './vpc-construct'
import * as envutil from './env-util'

export class CoreInfraStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);

      console.log(`Creating CoreInfraStack.:: ${envutil.getCurrentEnv(this)} // ${envutil.getCurrentAccountId(this)}`);

      const s3Buckets = new S3Buckets(this, 'S3Buckets');

      const cloudfrontDistros = new CloudFrontDistros(this, 'CloudFrontDistros', {
        staticWebsiteHostingBucket: s3Buckets.staticWebsiteHostingBucket
      });

      const cognito = new Cognito(this, 'Cognito');
      const vpcConstruct = new VpcConstruct(this, 'VpcConstruct');
      const rdsDatabases = new RdsDatabasesConstruct(this, 'RdsDatabasesConstruct', vpcConstruct.vpc);

      const lambdaFunctions = new LambdaFunctions(this, 'LambdaFunctions', {
        vpc: vpcConstruct.vpc,
        dbSecret: rdsDatabases.dbSecret,
        rdsConnections: rdsDatabases.connections,
        rdsEndpoint: rdsDatabases.endpoint,
        userPool: cognito.userPool,
        webAppClientId: cognito.webAppClient.userPoolClientId,
      });

      const httpApis = new HttpApis(this, 'HttpApis', {
        webAppDomainName: cloudfrontDistros.webAppDomainName,
        lambdaFunctions: lambdaFunctions,
        userPool: cognito.userPool,
        webAppClient: cognito.webAppClient,
      });

      //DEV environment ONLY resources
      if(envutil.isDev(this)){
        const devEnvironmentIAM = new DevEnvironmentIAM(this, 'DevEnvironmentIAM');
        const reactRepo = new codecommit.Repository(this, 'ReactWebappRepo', { repositoryName: envutil.react_webapp_repo_name });
        const servicesRepo = new codecommit.Repository(this, 'ServicesRepo', { repositoryName: envutil.services_repo_name });
        //cross-account application delivery pipelines will be deployed to the dev environment
        const reactWebappPipeline = new ReactWebappPipeline(this, 'ReactWebappPipeline');
        const servicesPipeline = new ServicesPipeline(this, 'ServicesPipeline');
      }else{
        const deploymentPipelineIAMRoles = new DeploymentPipelineIAMRoles(this, 'DeploymentPipelineIAMRoles');
      }
  }
}
