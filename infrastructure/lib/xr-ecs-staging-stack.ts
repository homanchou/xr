// cdk stack that creates an ECS cluster

import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as efs from 'aws-cdk-lib/aws-efs';

/*
Creates infrastructure for staging instance
*/
export class XrEcsStagingStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // for staging can re-use default vpc for now
    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {
      isDefault: true
    });

    // create a staging security group that allows all inbound traffic
    const stagingSecurityGroup = new ec2.SecurityGroup(this, 'xr-staging-sg', {
      vpc,
      securityGroupName: 'xr-staging-sg',
      allowAllOutbound: true
    });
    stagingSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic());




    // existing ECR repository, created in other stack
    const repository = ecr.Repository.fromRepositoryName(this, 'xr-repository', 'xr-repository');
    const image = ecs.ContainerImage.fromEcrRepository(repository, 'latest');

    // Retrieve existing creds we previously pushed to secrets manager
    const dbsecret = secretsmanager.Secret.fromSecretNameV2(this, 'xr-staging-secret', 'xr-staging-db-creds');

    // Construct the DATABASE_URL using the retrieved secret
    const DATABASE_URL = cdk.Fn.sub('postgresql://${username}:${password}@${host}:${port}/${dbname}', {
      username: dbsecret.secretValueFromJson('username').unsafeUnwrap().toString(),
      password: dbsecret.secretValueFromJson('password').unsafeUnwrap().toString(),
      host: dbsecret.secretValueFromJson('host').unsafeUnwrap().toString(),
      port: dbsecret.secretValueFromJson('port').unsafeUnwrap().toString(),
      dbname: dbsecret.secretValueFromJson('dbname').unsafeUnwrap().toString()
    });

    // Retrieve the SECRET_KEY_BASE from secrets manager
    const secretKeyBaseSecret = secretsmanager.Secret.fromSecretNameV2(this, 'xr-staging-secret-key-base', 'xr-staging-secret-key-base');
    const SECRET_KEY_BASE = secretKeyBaseSecret.secretValue.unsafeUnwrap().toString();

    // create a new role that includes permissions that
    // will allow us to ssh into the fargate container
    const taskRole = new iam.Role(this, 'xr-staging-task-role', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      roleName: 'xr-task-role'
    });

    taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'));

    taskRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "ssmmessages:CreateControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:OpenDataChannel"
      ],
      resources: ['*'] // Allow actions on all resources
    }));



    // create task definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'xr-staging-task', {
      family: 'xr-staging-task',
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX
      },
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole,
      executionRole: taskRole //if you don't provide one i think it creates one for you, just use taskRole since I added it's required perms
    });

    // the first container is our phoenix app
    taskDefinition.addContainer('xr-app', {
      image,
      containerName: 'xr-staging-app',
      essential: true,
      environment: {
        DATABASE_URL,  // anticipated db url, yes this exposes the secrets in the task definition, but this is staging
        SECRET_KEY_BASE
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'staging-xr-app' }), // Optional: Enable AWS CloudWatch logging
      portMappings: [
        {
          containerPort: 3000,
          hostPort: 3000, // can be left blank
          protocol: ecs.Protocol.TCP,
          appProtocol: ecs.AppProtocol.http,
          name: 'xr-staging-app-port'
        }
      ],

    });

    // the database container will need a volume, which we will mount to AWS EFS

    // Create an EFS file system
    // could be more secure in the future to create a new security group to only allow traffic from the stagingSecurityGroup
    // const fileSystem = new efs.FileSystem(this, 'xr-staging-efs', {
    //   vpc,
    //   securityGroup: stagingSecurityGroup,
    //   removalPolicy: cdk.RemovalPolicy.DESTROY, // Optional: Determines what happens to the file system when the stack is deleted
    // });

    // taskDefinition.addVolume({
    //   name: 'xr-staging-db-volume',
    //   efsVolumeConfiguration: {
    //     fileSystemId: fileSystem.fileSystemId
    //   }
    // });

    // add the second image, which is the postgres db
    const postgresContainer = taskDefinition.addContainer('xr-db', {
      containerName: 'xr-staging-db',
      image: ecs.ContainerImage.fromRegistry('postgres:14.1-alpine'),
      environment: {
        POSTGRES_USER: dbsecret.secretValueFromJson('username').unsafeUnwrap().toString(),
        POSTGRES_PASSWORD: dbsecret.secretValueFromJson('password').unsafeUnwrap().toString(),
        POSTGRES_DB: dbsecret.secretValueFromJson('dbname').unsafeUnwrap().toString() // name of initial db to be created
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'staging-db' }), // Optional: Enable AWS CloudWatch logging
      portMappings: [{
        containerPort: 5432,
        hostPort: 5432,
        protocol: ecs.Protocol.TCP
      }]
    });

    // postgresContainer.addMountPoints({
    //   sourceVolume: 'xr-staging-db-volume',
    //   containerPath: '/var/lib/postgresql/data',
    //   readOnly: false
    // });




    // create the cluster for our staging server
    const cluster = new ecs.Cluster(this, 'xr-staging-cluster', {
      clusterName: 'xr-staging-cluster',
      vpc,
    });



    // enables selection of spot instances
    cluster.enableFargateCapacityProviders();

    // create the service using spot instances of fargate
    // with only 1 running task of the above definition

    const service = new ecs.FargateService(this, 'xr-staging-service', {
      cluster,
      taskDefinition,
      serviceName: 'xr-staging-service',
      desiredCount: 1,
      assignPublicIp: true,
      enableExecuteCommand: true,
      securityGroups: [stagingSecurityGroup],
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE_SPOT',
          base: 0,
          weight: 1
        }
      ]
    });

  }
}