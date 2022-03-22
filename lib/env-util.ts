import { IConstruct } from 'constructs';
import * as cdk from 'aws-cdk-lib';

export const primary_region = 'us-east-1'

export const main_account_id = ''
export const dev_account_id = ''
export const test_account_id = ''
export const prod_account_id = ''

export const customer_name = ''
const customer_domain_name = `${customer_name}.com`

const dev = 'dev'
const test = 'test'
const prod = 'prod'

export const api_name = `${customer_name} api`

export const core_infra_cdk_pipeline_repo_name = `${customer_name}-core-infra-cdk-pipeline`

export const react_webapp_repo_name = `${customer_name}-react-webapp`
export const react_webapp_bucket_name_suffix = `${customer_name}global-react-webapp`

export const services_repo_name = `${customer_name}-services`
export const deployment_pipeline_role_name = `${customer_name}-deployment-pipeline`

//TODO - update these values once the cloudfront distributions have been created
export const dev_cloudfront_distribution_id = ''
export const test_cloudfront_distribution_id = ''
export const prod_cloudfront_distribution_id = ''

//TODO - update these values once your ACM certificates have been created
const dev_api_tls_cert_arn = ''
const dev_web_tls_cert_arn = ''

const test_api_tls_cert_arn = ''
const test_web_tls_cert_arn = ''

const prod_api_tls_cert_arn = ''
const prod_web_tls_cert_arn = ''

export const getCurrentAccountId = function(construct: IConstruct): string {
  return cdk.Stack.of(construct).account
}

export const isDev = function(construct: IConstruct): boolean {
  return getCurrentAccountId(construct) === dev_account_id
}

export const isTest = function(construct: IConstruct): boolean {
  return getCurrentAccountId(construct) === test_account_id
}

export const isProd = function(construct: IConstruct): boolean {
  return getCurrentAccountId(construct) === prod_account_id
}

export const getCurrentEnv = function(construct: IConstruct): string {
  if(isDev(construct)){
    return dev
  }else if(isTest(construct)){
    return test
  }else if(isProd(construct)){
    return prod
  }

  return 'UNKNOWN-ENVIRONMENT'
}

//TODO - uncomment when ready
// export const getWebTlsCertArn = function(construct: IConstruct): string {
//   if(isDev(construct)){
//     return dev_web_tls_cert_arn
//   }else if(isTest(construct)){
//     return test_web_tls_cert_arn
//   }else if(isProd(construct)){
//     return prod_web_tls_cert_arn
//   }
//
//   return 'UNKNOWN-ENVIRONMENT'
// }
//
// export const getApiTlsCertArn = function(construct: IConstruct): string {
//   if(isDev(construct)){
//     return dev_api_tls_cert_arn
//   }else if(isTest(construct)){
//     return test_api_tls_cert_arn
//   }else if(isProd(construct)){
//     return prod_api_tls_cert_arn
//   }
//
//   return 'UNKNOWN-ENVIRONMENT'
// }
//
// export const getAdminWebAppFqdn = function(construct: IConstruct): string {
//   let fqdn = `app.${customer_domain_name}`
//
//   if(isDev(construct)){
//     fqdn = `dev.${fqdn}`
//   }else if(isTest(construct)){
//     fqdn = `test.${fqdn}`
//   }
//
//   return fqdn
// }
//
// export const getApiFqdn = function(construct: IConstruct): string {
//   let fqdn = `api.${customer_domain_name}`
//
//   if(isDev(construct)){
//     fqdn = `dev.${fqdn}`
//   }else if(isTest(construct)){
//     fqdn = `test.${fqdn}`
//   }
//
//   return fqdn
// }
