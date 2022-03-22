import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { CoreInfraStack } from './core-infra-stack';

export class CoreInfraPipelineStage extends cdk.Stage {

    constructor(scope: Construct, id: string, props?: cdk.StageProps) {
      super(scope, id, props);

      const coreInfraStack = new CoreInfraStack(this, 'CoreInfraStack', {
        terminationProtection: true
      });
    }
}
