import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';

import { Construct } from 'constructs';

export class XrEcrStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an Amazon ECR repository
    const repository = new ecr.Repository(this, 'xr-repository', {
      repositoryName: 'xr-repository',
    });
  }
}
