import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib'
import { RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { aws_cognito as cognito } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import * as envutil from './env-util';

export class Cognito extends Construct {

  readonly userPool: cognito.UserPool;
  readonly userPoolId: string;
  readonly identityPoolId: string;
  readonly webAppClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, `${envutil.customer_name}-user-pool`, {
      userPoolName: `${envutil.customer_name}-user-pool`,
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        // custom_attr_1: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireSymbols: true,
        requireUppercase: true,
        requireLowercase: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // 👇 User Pool Client attributes
    const readWriteAttributes = {
      givenName: true,
      familyName: true,
      email: true,
      address: true,
      phoneNumber: true,
      birthdate: true,
      locale: true,
      middleName: true
    };

    const clientReadAttributes = new cognito.ClientAttributes()
      .withStandardAttributes(readWriteAttributes);

    const clientWriteAttributes = new cognito.ClientAttributes()
      .withStandardAttributes(readWriteAttributes);

    // 👇 Web App Client
    this.webAppClient = this.userPool.addClient('webapp-client', {
      userPoolClientName: `${envutil.customer_name}-webapp-client`,
      preventUserExistenceErrors: false,
      generateSecret: false, // Don't need to generate secret for web app running on browsers
      readAttributes: clientReadAttributes,
      writeAttributes: clientWriteAttributes,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    });

    const identityPool = new cognito.CfnIdentityPool(this, 'identity-pool', {
      allowUnauthenticatedIdentities: false, // Don't allow unathenticated users
      cognitoIdentityProviders: [
        {
          clientId: this.webAppClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    const unauthenticatedRolePolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: ['*'],
          actions: [
            'mobileanalytics:PutEvents',
            'cognito-sync:*'
          ],
          effect: iam.Effect.ALLOW,
        }),
      ],
    });

    const unauthenticatedCognitoUserRole = new iam.Role(this, 'unauthenticated-cognito-user-role', {
      description: 'Default role for anonymous users',
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'unauthenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
      inlinePolicies: {
        UnauthenticatedRolePolicy: unauthenticatedRolePolicy,
      },
    });

    const authenticatedRolePolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: ['*'],
          actions: [
            'mobileanalytics:PutEvents',
            'cognito-sync:*',
            'cognito-identity:*'
          ],
          effect: iam.Effect.ALLOW,
        }),
      ],
    });

    const authenticatedCognitoUserRole = new iam.Role(this, 'authenticated-cognito-user-role', {
      description: 'Default role for authenticated users',
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
      inlinePolicies: {
        AuthenticatedRolePolicy: authenticatedRolePolicy,
      },
    });

    new cognito.CfnIdentityPoolRoleAttachment(this, 'identity-pool-role-attachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedCognitoUserRole.roleArn,
        unauthenticated: unauthenticatedCognitoUserRole.roleArn,
      },
    });

    this.userPoolId = this.userPool.userPoolId;
    this.identityPoolId = identityPool.ref;

    // new CfnOutput(this, 'sunjane-congito-user-pool-id', { exportName: 'sunjane-congito-user-pool-id', value: this.userPool.userPoolId });
    // new CfnOutput(this, 'sunjane-cognito-identity-pool-id', { exportName: 'sunjane-cognito-identity-pool-id', value: identityPool.ref });
    // new CfnOutput(this, 'sunjane-webapp-client-id', { exportName: 'sunjane-webapp-client-id', value: this.webAppClient.userPoolClientId });
  }

}
