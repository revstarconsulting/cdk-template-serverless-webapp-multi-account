import { Construct } from 'constructs';
import { aws_codepipeline as codepipeline } from 'aws-cdk-lib';
import { aws_codepipeline_actions as codepipeline_actions } from 'aws-cdk-lib';
import { aws_codebuild as codebuild } from 'aws-cdk-lib';
import { aws_cloudfront as cloudfront } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import * as envutil from './env-util';

export interface CloudFrontInvalidationActionProps {
  readonly environmentName: string
  readonly awsRegion: string
  readonly awsAccountID: string
  readonly distributionId: string
  readonly buildArtifact: codepipeline.Artifact
}


export class CloudFrontInvalidationAction extends Construct {

  readonly action: codepipeline.IAction

  constructor(scope: Construct, id: string, props: CloudFrontInvalidationActionProps) {
    super(scope, id);

    const crossAccountPipelineRoleArn = `arn:aws:iam::${props.awsAccountID}:role/${envutil.deployment_pipeline_role_name}`

    const buildCommands: string[] = []

    buildCommands.push('ls -la');

    if(props.environmentName !== 'dev'){
      buildCommands.push(`echo "Assuming role in ${props.environmentName} account"`)
      buildCommands.push(`sts=$(aws sts assume-role \
        --role-arn "${crossAccountPipelineRoleArn}" \
        --role-session-name "codebuild-devaccount-${props.environmentName}Access" \
        --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]')`)

      buildCommands.push('AWS_ACCESS_KEY_ID=$(echo $sts | jq -r \'.[0]\')')
      buildCommands.push('AWS_SECRET_ACCESS_KEY=$(echo $sts | jq -r \'.[1]\')')
      buildCommands.push('AWS_SESSION_TOKEN=$(echo $sts | jq -r \'.[2]\')')
    }

    buildCommands.push(`aws cloudfront create-invalidation --distribution-id ${props.distributionId} --paths "/index.html" "/asset-manifest.json"`);

    const codeBuildProject = new codebuild.PipelineProject(this, `react-${props.environmentName}-cloudfront-invalidation`, {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
        computeType: codebuild.ComputeType.SMALL,
        privileged: false
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: buildCommands,
          },
        },
      }),
    });

    if(props.environmentName !== 'dev'){
      codeBuildProject.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [crossAccountPipelineRoleArn]
      }));
    }else{
      codeBuildProject.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:cloudfront::${props.awsAccountID}:distribution/${props.distributionId}`],
        actions: ['cloudfront:CreateInvalidation']
      }));
    }

    this.action = new codepipeline_actions.CodeBuildAction({
      actionName: `${props.environmentName}-cloudfront-invalidation`,
      project: codeBuildProject,
      input: props.buildArtifact,
    });
  }

  public get(): codepipeline.IAction {
    return this.action;
  }
}
