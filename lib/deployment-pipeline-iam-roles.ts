import { Construct } from 'constructs';
import { aws_iam as iam } from 'aws-cdk-lib';
import * as envutil from './env-util'

export class DeploymentPipelineIAMRoles extends Construct {

  constructor(scope: Construct, id: string) {
    super(scope, id);

    //these only need to be created in the Stage and Prod environments so the pipeline can assume these roles in those environments
    if(!envutil.isDev(this)){
      const currentAccountId = envutil.getCurrentAccountId(this)

      const deploymentPipelineRole = new iam.Role(this, `${envutil.customer_name}-deployment-pipeline-role`, {
        roleName: envutil.deployment_pipeline_role_name,
        assumedBy: new iam.AccountPrincipal(envutil.dev_account_id),
      });

      deploymentPipelineRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['lambda:UpdateFunctionCode'],
        resources: [`arn:aws:lambda:${envutil.primary_region}:${currentAccountId}:function:*`],
      }));

      deploymentPipelineRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudfront:CreateInvalidation'],
        resources: [`arn:aws:cloudfront::${currentAccountId}:distribution/*`],
      }));
    }

  }

}
