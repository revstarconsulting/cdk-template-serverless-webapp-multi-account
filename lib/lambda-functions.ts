import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_cognito as cognito } from 'aws-cdk-lib';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';

export interface LambdaFunctionsProps {
  readonly vpc: ec2.Vpc
  readonly rdsConnections: ec2.Connections
  readonly rdsEndpoint: string
  readonly dbSecret: secretsmanager.ISecret
  readonly userPool: cognito.UserPool
  readonly webAppClientId: string
}

export class LambdaFunctions extends Construct {

  readonly boatsFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaFunctionsProps) {
    super(scope, id);

    const dbHost = props.rdsEndpoint
    const dbPort = props.dbSecret.secretValueFromJson('port').toString()
    const dbUsername = props.dbSecret.secretValueFromJson('username').toString()
    const dbPassword = props.dbSecret.secretValueFromJson('password').toString()
    const dbName = props.dbSecret.secretValueFromJson('dbname').toString()

    const dummyLambdaCode = `
      exports.handler = async (event) => {
        console.log('event: ', event);
        const response = {
            statusCode: 200,
            body: JSON.stringify('Hello from Lambda!'),
        };
        return response;
      };
    `

    const lambdaEnvironmentVars = {
      'DB_NAME': dbName,
      'DB_HOST': dbHost,
      'DB_PORT': dbPort,
      'DB_USERNAME': dbUsername,
      'DB_PASSWORD': dbPassword
    }

    this.boatsFunction = new lambda.Function(this, 'BoatsFunction', {
      functionName: 'boats-service',
      code: lambda.Code.fromInline(dummyLambdaCode),
      handler: 'dist/apps/boats/main.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      memorySize: 128,
      timeout: Duration.seconds(30),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE,
      },
      environment: lambdaEnvironmentVars
    });


    const lambdaVpcAccessExecutionRole = iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole")

    // only required if your function lives in a VPC
    this.boatsFunction.role!.addManagedPolicy(lambdaVpcAccessExecutionRole);

    //Generate the Security Group rule that allows this Lambda to access the DB on the default port
    props.rdsConnections.allowFrom(this.boatsFunction, ec2.Port.tcp(3306));

  }
}
