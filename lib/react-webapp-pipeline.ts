import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { aws_codebuild as codebuild } from 'aws-cdk-lib';
import { aws_codecommit as codecommit } from 'aws-cdk-lib';
import { aws_codepipeline as codepipeline } from 'aws-cdk-lib';
import { aws_codepipeline_actions as codepipeline_actions } from 'aws-cdk-lib';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { CloudFrontInvalidationAction } from './react-webapp-pipeline-cloudfront-invalidation-action';
import * as envutil from './env-util';

export class ReactWebappPipeline extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const devBucket = s3.Bucket.fromBucketName(this, 'devBucket', `dev-${envutil.react_webapp_bucket_name_suffix}`);
    const testBucket = s3.Bucket.fromBucketAttributes(this, 'testBucket', { account: envutil.test_account_id, bucketName: `test-${envutil.react_webapp_bucket_name_suffix}` });
    const prodBucket = s3.Bucket.fromBucketAttributes(this, 'prodBucket', { account: envutil.prod_account_id, bucketName: `prod-${envutil.react_webapp_bucket_name_suffix}` });

    const sourceArtifact = new codepipeline.Artifact();
    const devBuildArtifact = new codepipeline.Artifact();
    const testBuildArtifact = new codepipeline.Artifact();
    const prodBuildArtifact = new codepipeline.Artifact();

    const pipeline = new codepipeline.Pipeline(this, 'ReactWebappPipeline', {
      pipelineName: 'react-webapp-pipeline',
      crossAccountKeys: true,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.CodeCommitSourceAction({
              actionName: 'main-branch-commit-trigger',
              repository: codecommit.Repository.fromRepositoryName(this, 'ReactWebappRepo', envutil.react_webapp_repo_name),
              branch: 'main',
              output: sourceArtifact
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName:'dev-build-react-webapp',
              input: sourceArtifact,
              outputs: [
                devBuildArtifact
              ],
              project: new codebuild.PipelineProject(this, 'ReactWebappDevBuildPipelineProject', {
                environment: {
                  buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
                  computeType: codebuild.ComputeType.SMALL,
                  privileged: false
                },
                environmentVariables: {
                  CI: { value: 'true' },
                  REACT_APP_STAGE: { value: 'dev' }
                },
                buildSpec: codebuild.BuildSpec.fromObject({
                  version: '0.2',
                  phases: {
                    install: {
                      commands: [
                        'npm install'
                      ],
                    },
                    build: {
                      commands: [
                        'npm test',
                        'npm run build',
                      ],
                    },
                  },
                  artifacts: {
                    'base-directory': 'build/',
                    files: [
                      '**/*',
                    ],
                  },
                }),
              })
            }),
            new codepipeline_actions.CodeBuildAction({
              actionName:'test-build-react-webapp',
              input: sourceArtifact,
              outputs: [
                testBuildArtifact
              ],
              project: new codebuild.PipelineProject(this, 'ReactWebappTestBuildPipelineProject', {
                environment: {
                  buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
                  computeType: codebuild.ComputeType.SMALL,
                  privileged: false
                },
                environmentVariables: {
                  CI: { value: 'true' },
                  REACT_APP_STAGE: { value: 'test' }
                },
                buildSpec: codebuild.BuildSpec.fromObject({
                  version: '0.2',
                  phases: {
                    install: {
                      commands: [
                        'npm install'
                      ],
                    },
                    build: {
                      commands: [
                        'npm test',
                        'npm run build',
                      ],
                    },
                  },
                  artifacts: {
                    'base-directory': 'build/',
                    files: [
                      '**/*',
                    ],
                  },
                }),
              })
            }),
            new codepipeline_actions.CodeBuildAction({
              actionName:'prod-build-react-webapp',
              input: sourceArtifact,
              outputs: [
                prodBuildArtifact
              ],
              project: new codebuild.PipelineProject(this, 'ReactWebappProdBuildPipelineProject', {
                environment: {
                  buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
                  computeType: codebuild.ComputeType.SMALL,
                  privileged: false
                },
                environmentVariables: {
                  CI: { value: 'true' },
                  REACT_APP_STAGE: { value: 'prod' }
                },
                buildSpec: codebuild.BuildSpec.fromObject({
                  version: '0.2',
                  phases: {
                    install: {
                      commands: [
                        'npm install'
                      ],
                    },
                    build: {
                      commands: [
                        'npm test',
                        'npm run build',
                      ],
                    },
                  },
                  artifacts: {
                    'base-directory': 'build/',
                    files: [
                      '**/*',
                    ],
                  },
                }),
              })
            }),
          ],
        },
        {
          stageName: 'Dev_Deployment',
          actions: [
            new codepipeline_actions.S3DeployAction({
              actionName: 'dev-deploy-react-webapp',
              bucket: devBucket,
              input: devBuildArtifact,
            }),
            //TODO - uncomment these after the initial deployment, after your CloudFront distributions have been created
            // new CloudFrontInvalidationAction(this, 'DevCloudFrontInvalidationAction', {
            //   environmentName: 'dev',
            //   awsRegion: envutil.primary_region,
            //   awsAccountID: envutil.dev_account_id,
            //   distributionId: envutil.dev_cloudfront_distribution_id,
            //   buildArtifact: sourceArtifact
            // }).get(),
          ],
        },
        {
          stageName: 'Test_Deployment',
          actions: [
            new codepipeline_actions.S3DeployAction({
              actionName: 'test-deploy-react-webapp',
              bucket: testBucket,
              input: testBuildArtifact,
            }),
            //TODO - uncomment these after the initial deployment, after your CloudFront distributions have been created
            // new CloudFrontInvalidationAction(this, 'TestCloudFrontInvalidationAction', {
            //   environmentName: 'test',
            //   awsRegion: envutil.primary_region,
            //   awsAccountID: envutil.test_account_id,
            //   distributionId: envutil.test_cloudfront_distribution_id,
            //   buildArtifact: sourceArtifact
            // }).get(),
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
            new codepipeline_actions.S3DeployAction({
              actionName: 'prod-deploy-react-webapp',
              bucket: prodBucket,
              input: prodBuildArtifact,
            }),
            //TODO - uncomment these after the initial deployment, after your CloudFront distributions have been created
            // new CloudFrontInvalidationAction(this, 'ProdCloudFrontInvalidationAction', {
            //   environmentName: 'prod',
            //   awsRegion: envutil.primary_region,
            //   awsAccountID: envutil.prod_account_id,
            //   distributionId: envutil.prod_cloudfront_distribution_id,
            //   buildArtifact: sourceArtifact
            // }).get(),
          ],
        },
      ],
    });
  }
}
