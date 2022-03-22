import { Construct } from 'constructs';
import { Aspects, Tag, CfnOutput } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import * as envutil from './env-util';

export class VpcConstruct extends Construct {

  readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, `${envutil.customer_name}-vpc`, {
      cidr: '10.0.0.0/16',
      maxAzs: 3,
      natGateways: 1,
    });

    Aspects.of(this.vpc).add(new Tag('Name', `${envutil.customer_name}-vpc`));
    new CfnOutput(this, `${envutil.customer_name}-vpc-id`, { exportName: `${envutil.customer_name}-vpc-id`, value: this.vpc.vpcId });
  }

}
