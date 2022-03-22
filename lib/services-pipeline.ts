import { Construct } from 'constructs';
import { aws_codebuild as codebuild } from 'aws-cdk-lib';
import { aws_codecommit as codecommit } from 'aws-cdk-lib';
import { aws_codepipeline as codepipeline } from 'aws-cdk-lib';
import { aws_codepipeline_actions as codepipeline_actions } from 'aws-cdk-lib';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { LambdaDeployAction } from './lambda-deploy-action';
import * as envutil from './env-util';

export class ServicesPipeline extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const sourceArtifact = new codepipeline.Artifact();
    const buildArtifact = new codepipeline.Artifact();

    const pipeline = new codepipeline.Pipeline(this, 'ServicesPipeline', {
      pipelineName: `${envutil.customer_name}-services-pipeline`,
      crossAccountKeys: true,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.CodeCommitSourceAction({
              actionName: 'main-commit-trigger',
              repository: codecommit.Repository.fromRepositoryName(this, 'ServicesRepo', envutil.services_repo_name),
              branch: 'main',
              output: sourceArtifact
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName:`${envutil.customer_name}-services-build`,
              input: sourceArtifact,
              outputs: [buildArtifact],
              project: new codebuild.PipelineProject(this, 'ServicesBuildProject', {
                environment: {
                  buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
                  computeType: codebuild.ComputeType.SMALL,
                  privileged: false
                },
                environmentVariables: {
                  CI: { value: 'true' },
                },
                buildSpec: codebuild.BuildSpec.fromObject({
                  version: '0.2',
                  phases: {
                    install: {
                      commands: [
                        'npm install',
                        'npm install --silent --no-progress @nestjs/cli@8.2.4 -g',
                        'npm install -g serverless',
                        'npm link webpack',
                        'cp .env.example .env',
                        'ls -la'
                      ],
                    },
                    build: {
                      commands: [
                        'npm test',
                        'npm run build',
                        'serverless package'
                      ],
                    },
                  },
                  artifacts: {
                    'base-directory': '.serverless/',
                    files: [
                      '**/*',
                    ],
                  },
                }),
              })
            })
          ],
        },
        {
          stageName: 'Dev_Deployment',
          actions: [
            new LambdaDeployAction(this, 'DevLambdaDeployAction', {
              environmentName: 'dev',
              awsRegion: envutil.primary_region,
              awsAccountID: envutil.dev_account_id,
              buildArtifact: buildArtifact
            }).get(),
          ],
        },
        {
          stageName: 'Test_Deployment',
          actions: [
            new LambdaDeployAction(this, 'TestLambdaDeployAction', {
              environmentName: 'test',
              awsRegion: envutil.primary_region,
              awsAccountID: envutil.test_account_id,
              buildArtifact: buildArtifact
            }).get(),
          ],
        },
        {
          stageName: 'Prod_Deployment_Approval',
          actions: [
            new codepipeline_actions.ManualApprovalAction({
              actionName: 'Approve',
            })
          ]
        },
        {
          stageName: 'Prod_Deployment',
          actions: [
            new LambdaDeployAction(this, 'ProdLambdaDeployAction', {
              environmentName: 'prod',
              awsRegion: envutil.primary_region,
              awsAccountID: envutil.prod_account_id,
              buildArtifact: buildArtifact
            }).get(),
          ],
        }
      ],
    });
  }
}
