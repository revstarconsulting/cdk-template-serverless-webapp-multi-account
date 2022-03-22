import { Construct } from 'constructs';
import { Duration, CfnOutput } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import { aws_rds as rds } from 'aws-cdk-lib';
import { aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
import * as envutil from './env-util'

export class RdsDatabasesConstruct extends Construct {

  readonly dbSecret: secretsmanager.ISecret
  readonly connections: ec2.Connections
  readonly endpoint: string

  constructor(scope: Construct, id: string, vpc: ec2.Vpc) {
    super(scope, id);

    const dbName = envutil.customer_name;
    const dbUsername = `${envutil.customer_name}admin`;

    let rdsConnections = null;
    let proxyTarget = null;

    if(envutil.isDev(this)){
      // console.log('using dev database configuration')
      const instance = new rds.DatabaseInstance(this, 'dev-rds-instance', {
        instanceIdentifier: `${envutil.customer_name}-dev`,
        engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0_26 }),
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.SMALL),
        vpc,
        maxAllocatedStorage: 200,
        credentials: rds.Credentials.fromGeneratedSecret(dbUsername),
        databaseName: dbName,
        publiclyAccessible: true,
        backupRetention: Duration.seconds(0),
        vpcSubnets: {
          subnetType: ec2.SubnetType.PUBLIC
        }
      });

      instance.connections.allowDefaultPortFromAnyIpv4()
      rdsConnections = instance.connections
      this.dbSecret = instance.secret!
      proxyTarget = rds.ProxyTarget.fromInstance(instance)
    } else if(envutil.isTest(this)){
      // console.log('using test database configuration')

      const cluster = new rds.DatabaseCluster(this, 'test-aurora-cluster', {
        clusterIdentifier: `${envutil.customer_name}-test`,
        engine: rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_5_7_12 }),
        defaultDatabaseName: dbName,
        credentials: rds.Credentials.fromGeneratedSecret(dbUsername),
        instances: 1,
        deletionProtection: false,
        instanceProps: {
          vpc: vpc,
          publiclyAccessible: false,
          instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MEDIUM),
        },
      });

      rdsConnections = cluster.connections
      this.dbSecret = cluster.secret!
      proxyTarget = rds.ProxyTarget.fromCluster(cluster)
    } else if(envutil.isProd(this)) {
      // console.log('using prod database configuration')

      const cluster = new rds.DatabaseCluster(this, 'prod-aurora-cluster', {
        clusterIdentifier: `${envutil.customer_name}-prod`,
        engine: rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_5_7_12 }),
        defaultDatabaseName: dbName,
        credentials: rds.Credentials.fromGeneratedSecret(dbUsername),
        instances: 1,
        deletionProtection: true,
        instanceProps: {
          vpc: vpc,
          publiclyAccessible: false
        },
      });

      rdsConnections = cluster.connections
      this.dbSecret = cluster.secret!
      proxyTarget = rds.ProxyTarget.fromCluster(cluster)
    }

    const proxy = new rds.DatabaseProxy(this, 'Proxy', {
      proxyTarget: proxyTarget!,
      secrets: [this.dbSecret],
      dbProxyName: `${envutil.customer_name}-db-proxy`,
      vpc: vpc,
      requireTLS: false,
    });
    rdsConnections!.allowDefaultPortFrom(proxy);
    this.connections = proxy.connections;
    this.endpoint = proxy.endpoint;

    const role = new iam.Role(this, 'DBProxyRole', { assumedBy: new iam.AccountPrincipal(envutil.getCurrentAccountId(this)) });
    proxy.grantConnect(role, dbUsername);

    new CfnOutput(this, `${envutil.customer_name}-rds-secret-name`, { exportName: `${envutil.customer_name}-rds-secret-name`, value: this.dbSecret?.secretName || '' });
  }

}
