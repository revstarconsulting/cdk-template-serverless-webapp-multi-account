import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib'
import { aws_iam as iam } from 'aws-cdk-lib';
import * as envutil from './env-util'

export class DevEnvironmentIAM extends Construct {

  constructor(scope: Construct, id: string) {
    super(scope, id);

    if(envutil.isDev(this)){
      //There is a hard limit in AWS that only allows 10 total Managed policies to be added per group
      const developerGroup = new iam.Group(this, 'DeveloperGroup', { groupName: 'Developer' });
      const developerGroup2 = new iam.Group(this, 'DeveloperGroup_2', { groupName: 'Developer_2' });
      const devLeadGroup = new iam.Group(this, 'DevLeadGroup', { groupName: 'Dev_Lead' });

      developerGroup.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonCognitoPowerUser'))
      developerGroup.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs'))
      developerGroup.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambda_ReadOnlyAccess'))
      developerGroup.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchReadOnlyAccess'))
      developerGroup.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsReadOnlyAccess'))
      developerGroup.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'))
      developerGroup.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSESFullAccess'))
      developerGroup.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSNSFullAccess'))
      developerGroup.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMReadOnlyAccess'))
      developerGroup.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodeCommitPowerUser'))

      developerGroup2.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodePipeline_ReadOnlyAccess'))
      developerGroup2.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonAPIGatewayInvokeFullAccess'))
      developerGroup2.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodeBuildDeveloperAccess'))
      developerGroup2.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudFrontReadOnlyAccess'))
      developerGroup2.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRDSDataFullAccess'))
      developerGroup2.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRDSReadOnlyAccess'))

      developerGroup2.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCloud9EnvironmentMember'))

      developerGroup2.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'lambda:InvokeFunction'
        ],
        resources: [`arn:aws:lambda:${envutil.primary_region}:${envutil.dev_account_id}:function:*`],
      }));
    }

  }

}
