import { Construct } from 'constructs';
import { aws_codepipeline as codepipeline } from 'aws-cdk-lib';
import { aws_codepipeline_actions as codepipeline_actions } from 'aws-cdk-lib';
import { aws_codebuild as codebuild } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import * as envutil from './env-util'

export interface LambdaDeployActionProps {
  readonly environmentName: string
  readonly awsRegion: string
  readonly awsAccountID: string
  readonly buildArtifact: codepipeline.Artifact
}

export class LambdaDeployAction extends Construct {

  readonly action: codepipeline.IAction

  constructor(scope: Construct, id: string, props: LambdaDeployActionProps) {
    super(scope, id);

    const lambdaFunctionNames: string[] = ['boats']
    const crossAccountPipelineRoleArn = `arn:aws:iam::${props.awsAccountID}:role/${envutil.deployment_pipeline_role_name}`

    const buildCommands: string[] = []

    if(props.environmentName !== 'dev'){
      buildCommands.push('echo "Installing jq"')
      buildCommands.push('apt-get install jq -y')
      buildCommands.push(`echo "Assuming role in ${props.environmentName} account"`)
      buildCommands.push(`sts=$(aws sts assume-role \
        --role-arn "${crossAccountPipelineRoleArn}" \
        --role-session-name "codebuild-devaccount-${props.environmentName}Access" \
        --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]')`)

      buildCommands.push('AWS_ACCESS_KEY_ID=$(echo $sts | jq -r \'.[0]\')')
      buildCommands.push('AWS_SECRET_ACCESS_KEY=$(echo $sts | jq -r \'.[1]\')')
      buildCommands.push('AWS_SESSION_TOKEN=$(echo $sts | jq -r \'.[2]\')')
    }

    for(let lambdaFunctionName of lambdaFunctionNames){
      buildCommands.push(`aws lambda update-function-code \
        --function-name ${lambdaFunctionName}-service \
        --zip-file fileb://${lambdaFunctionName}.zip`)
    }


    const codeBuildProject = new codebuild.PipelineProject(this, `services-${props.environmentName}-deploy-functions`, {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
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
        resources: [`arn:aws:lambda:${props.awsRegion}:${props.awsAccountID}:function:*`],
        actions: ['lambda:UpdateFunctionCode']
      }));
    }


    this.action = new codepipeline_actions.CodeBuildAction({
      actionName: `${props.environmentName}-deploy-functions`,
      input: props.buildArtifact,
      project: codeBuildProject,
    });
  }

  public get(): codepipeline.IAction {
    return this.action;
  }
}
