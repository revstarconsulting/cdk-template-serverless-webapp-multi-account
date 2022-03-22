import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { aws_codecommit as codecommit } from 'aws-cdk-lib';
import { CoreInfraPipelineStage } from './core-infra-pipeline-stage'
import * as envutil from './env-util'

export class CoreInfraPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repository = codecommit.Repository.fromRepositoryName(this, 'core-infra-pipeline-repo', envutil.core_infra_cdk_pipeline_repo_name);

    const pipeline = new CodePipeline(this, 'core-infra-pipeline', {
      pipelineName: 'core-infra-pipeline',
      crossAccountKeys: true,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.codeCommit(repository, 'main'),
        commands: [
          'npm ci',
          'npm run build',
          'npx cdk synth'
        ]
      })
    });

    pipeline.addStage(new CoreInfraPipelineStage(this, 'dev', {
      env: { account: envutil.dev_account_id, region: envutil.primary_region}
    }));

    pipeline.addStage(new CoreInfraPipelineStage(this, 'test', {
      env: { account: envutil.test_account_id, region: envutil.primary_region}
    }));

    pipeline.addStage(new CoreInfraPipelineStage(this, 'prod', {
      env: { account: envutil.prod_account_id, region: envutil.primary_region}
    }));
  }
}
