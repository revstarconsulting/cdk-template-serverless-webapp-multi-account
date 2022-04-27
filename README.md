![RevStar Consulting](img/revstar-cdk.png?raw=true 'RevStar Consulting Logo')

# RevStar CDK Pipeline for Serverless Web Applications that need to be deployed across multiple AWS accounts

This is a CDK Typescript project that bootstraps and maintains a multi-account architecture for the core infrastructure components (S3 buckets, databases, Kubernetes VPC constructs, ALB definitions, etc) that are then used by downstream application components. This repo also defines pipelines that will deploy those applications across the multiple AWS accounts, and on top of the core infrastructure components defined in this project.

Whenever any changes need to be made to the core infrastructure definitions across all AWS accounts, the process to update those resources is to simply to make changes in this project, and then push those changes to the repo. This project uses CDK Pipelines, so it is subscribing to its own repo to then run the necessary changes across the pipeline and to promote those changes through all of the environments.

# Quickstart

To get started, clone this project, and then begin setting the appropriate values in `lib/env-util.ts`, which contains the constants that drive the configuration of the CDK constructs used in this application. Before you begin, you will need to configure the application. This includes setting the `customer_name` value as well as each of the AWS account ID values (`dev_account_id`, `test_account_id`, and `prod_account_id`). You may also want to override some of the other names used throughout this application.

This project is designed to work with the RevStar React webapp template project (TODO - create template project and reference here) as well as the [RevStar serverless template project for NodeJS](https://github.com/revstarconsulting/aws-node-restapis-and-rds).


## AWS CLI configuration

Since this project is designed to be executed across multiple AWS environments, the following setup is recommended to allow you to easily assume role in each of the necessary AWS accounts. Note that in this example, the AWS accounts have been created from AWS Organizations in the `main-account`, and the cross-account role available to you to assume between each account is named `OrganizationAccountAccessRole`. Another thing you will need to obtain in order to properly setup your environment for use with the `aws` and `cdk` CLIs are each of your account IDs. There are placeholders in each of the examples below that you will need to replace with the appropriate account ID values.

~/.aws/credentials

```
[main-account]
aws_access_key_id =
aws_secret_access_key =
```

~/.aws/config

```
[profile main-account]
region = us-east-1

[profile dev-account]
region = us-east-1
role_arn = arn:aws:iam::<dev-account-id>:role/OrganizationAccountAccessRole
source_profile = main-account

[profile test-account]
region = us-east-1
role_arn = arn:aws:iam::<test-account-id>:role/OrganizationAccountAccessRole
source_profile = main-account

[profile prod-account]
region = us-east-1
role_arn = arn:aws:iam::<prod-account-id>:role/OrganizationAccountAccessRole
source_profile = main-account
```

## Your copy of this repo

This project is meant to be copied as a quickstart template, and is configured to trigger on changes from a CodeCommit repo in your `main-account`. That repo will need to be created first. The following is a command that can be followed to create the necessary repoository. Please note that this repo name is referenced in `lib/env-util.ts` as `core_infra_cdk_pipeline_repo_name` and the name must be the same, otherwise the CDK Pipeline used in this project will not work.

```
aws codecommit create-repository --repository-name <customer-name>-core-infra-cdk-pipeline
```

After you have created the repo, you will need to read the following instructions to connect to it, after which you will be able to use the git cli to push, pull, etc, just like any other git repo: https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-connect.html

## Bootstrapping

After you have configured your application and your local AWS CLI is setup correctly, you are ready to bootstrap each of your environments with CDK. The following commands must be run to bootstrap each of the AWS environments for use with the CDK toolkit. See https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html for more information.

Please note that the following steps make use of locally configured profiles setup via `$HOME/.aws/credentials` and `$HOME/.aws/config`.

Bootstrap the main account:
```
  CDK_NEW_BOOTSTRAP=1 \
  cdk bootstrap \
    --profile main-account \
    --cloudformation-execution-policies 'arn:aws:iam::aws:policy/AdministratorAccess' \
    aws://<main-account-id>/us-east-1
```


Bootstrap the Dev account:
```
  CDK_NEW_BOOTSTRAP=1 \
  cdk bootstrap \
    --profile dev-account \
    --cloudformation-execution-policies 'arn:aws:iam::aws:policy/AdministratorAccess' \
    --trust <main-account-id> \
    aws://<dev-account-id>/us-east-1
```

Bootstrap the Test account:
```
  CDK_NEW_BOOTSTRAP=1 \
  cdk bootstrap \
    --profile test-account \
    --cloudformation-execution-policies 'arn:aws:iam::aws:policy/AdministratorAccess' \
    --trust <main-account-id> \
    aws://<test-account-id>/us-east-1
```

Bootstrap the Prod account:

```
  CDK_NEW_BOOTSTRAP=1 \
  cdk bootstrap \
    --profile prod-account \
    --cloudformation-execution-policies 'arn:aws:iam::aws:policy/AdministratorAccess' \
    --trust <main-account-id> \
    aws://<prod-account-id>/us-east-1
```

### Initial Deployment

Once the environments have been bootstrapped, the project is ready for initial deployment.

`cdk deploy --profile main-account`

After the project has been deployed once, all you need to do is continue to push changes to your copy of this repository and the pipeline will update itself and deploy changes as they come.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template


### Build and Test CDK scripts locally

```
  cdk ls
  npm run test
  npm run build
  rm lib/*.js lib/*.d.ts bin/*.js bin/*.d.ts test/*.js test/*.d.ts
```
