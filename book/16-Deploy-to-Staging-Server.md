## Deploy to a staging server

Up until now we've been using our local machine to do development and testing.  When we put on the headset we've been using ngrok to create an SSH tunnel from an ngrok https endpoint to the server running on our local machine.

Even though the project is still in the development stage, it would be nice to be able to deploy the code to a platform service that is not on our local machine.  This way we provide a public demo/testing site where we can invite more beta testers to try our game features as we add them without having folks connect to our local machine.  We can also start getting used to the deployment process, as well as understanding how to migrate the database remotely and how to use phoenix releases.

## Selecting a cloud provider

Any number of cloud platforms will probably work.  The following guide will use Amazon Web Services (AWS).  We'll be deploying packaging up our application into a Docker image and using AWS Elastic Container Service to host our website.

## Prerequisites

Some prerequisites for following along is that you'll need an AWS Account.  It's free to create an account and there is a free tier for many of the services.  

You'll also need to install the AWS cli on your local machine.  

https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

Once you have aws cli installed you need to configure your local machine to use an account.  There may be more improved ways of doing this, but I go into the AWS Web Console and under IAM, create a new user and then create access keys.  Save those values as you won't be able to get them again.  Then run `aws configure` and paste those values as the utility prompts you for them.

## Basic Outline of Steps

We're going to use phoenix releases to package our application into a fast loading executable that includes Elixir as a dependency.  In development mode, modules are loaded on the fly as they are used, whereas in a release all modules are preloaded.  

The release will be built inside a Dockerfile and as a result we'll be left with a Docker image that contains our executable application that we can ship and deploy to any platform that supports running containerized applications.

Next we'll build our image and push it to a docker repository (we also need to create that repository).

Then we'll create a minimal cluster on AWS Elastic Container Services.  Since this is just for testing our app and we don't intend to push a lot of traffic to it:

- we won't setup a load balancer
- we won't have auto-scaling
- we'll run on one task with two containers, one for the db, one for the app
- we'll use the default vpc

## Generate Docker Release

First we need to create a Dockerfile that will be used to create a "release" for us.  A release is just an optimized bundled up version of our code.  The release must be run on the same kind of architecture and operating system that created it.  Since we're using Docker containers we don't need to worry about that because we're using the same container to build the image and later to run the image. 

```bash
mix phx.gen.release --docker
```

This creates a /rel folder, a release.ex file, a .dockerignore file and a Dockerfile.

The Dockerfile has multiple stages.  The first stage copies our source code into a clean linux environment, installs all the dependencies we need to run mix release.  The second stage installs certs and leaves just the bare minimum to run our container for production.

Since we installed node via nvm for our dev environment, we should add nvm to the Dockerfile during the first stage.  Here is my modified Dockerfile which installs nvm before running npm install and building assets:

```Dockerfile
# Find eligible builder and runner images on Docker Hub. We use Ubuntu/Debian
# instead of Alpine to avoid DNS resolution issues in production.
#
# https://hub.docker.com/r/hexpm/elixir/tags?page=1&name=ubuntu
# https://hub.docker.com/_/ubuntu?tab=tags
#
# This file is based on these images:
#
#   - https://hub.docker.com/r/hexpm/elixir/tags - for the build image
#   - https://hub.docker.com/_/debian?tab=tags&page=1&name=bullseye-20230612-slim - for the release image
#   - https://pkgs.org/ - resource for finding needed packages
#   - Ex: hexpm/elixir:1.15.5-erlang-26.0.2-debian-bullseye-20230612-slim
#

# switch to
# elixir_version=1.15.7
# erlang_version=26.2

ARG ELIXIR_VERSION=1.15.5
ARG OTP_VERSION=26.0.2
ARG DEBIAN_VERSION=bullseye-20230612-slim

ARG BUILDER_IMAGE="hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-debian-${DEBIAN_VERSION}"
ARG RUNNER_IMAGE="debian:${DEBIAN_VERSION}"

FROM ${BUILDER_IMAGE} as builder

# install build dependencies
RUN apt-get update -y && apt-get install -y build-essential git curl \
  && apt-get clean && rm -f /var/lib/apt/lists/*_*

# prepare build dir
WORKDIR /app

# install hex + rebar
RUN mix local.hex --force && \
  mix local.rebar --force

# set build ENV
ENV MIX_ENV="prod"

# install mix dependencies
COPY mix.exs mix.lock ./
RUN mix deps.get --only $MIX_ENV
RUN mkdir config

# copy compile-time config files before we compile dependencies
# to ensure any relevant config change will trigger the dependencies
# to be re-compiled.
COPY config/config.exs config/${MIX_ENV}.exs config/
RUN mix deps.compile

# note: lib contains heex templates which can also impact the tailwind compilation
COPY lib lib

COPY priv priv

COPY assets assets

# Set nvm environment variables
ENV NVM_DIR=/root/.nvm
# ENV SH_ENV=/root/.bashrc
ENV NODE_VERSION=v21.5.0

# require node to compile assets
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash \
  && . $NVM_DIR/nvm.sh \
  && nvm install $NODE_VERSION \
  && nvm alias default $NODE_VERSION \
  && nvm use default \
  && npm install --prefix assets

# this command fixes node not found, by sourcing nvm.sh
RUN . $NVM_DIR/nvm.sh && mix assets.deploy

# Compile the release
RUN mix compile

# Changes to config/runtime.exs don't require recompiling the code
COPY config/runtime.exs config/

COPY rel rel
RUN mix release

# start a new build stage so that the final image will only contain
# the compiled release and other runtime necessities
FROM ${RUNNER_IMAGE}

RUN apt-get update -y && \
  apt-get install -y libstdc++6 openssl libncurses5 locales ca-certificates \
  && apt-get clean && rm -f /var/lib/apt/lists/*_*

# Set the locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

WORKDIR "/app"
RUN chown nobody /app

# set runner ENV
ENV MIX_ENV="prod"

# Only copy the final release from the build stage
COPY --from=builder --chown=nobody:root /app/_build/${MIX_ENV}/rel/xr ./

USER nobody

# If using an environment that doesn't automatically reap zombie processes, it is
# advised to add an init process such as tini via `apt-get install`
# above and adding an entrypoint. See https://github.com/krallin/tini for details
# ENTRYPOINT ["/tini", "--"]

CMD ["/app/bin/server"]
```

### Build Image

We can try out building a release like so:

```bash
docker build -t app1 --progress plain .
```

If you want to poke around and look at the files left behind by the release process you can run an interactive shell like this:

```bash
docker run -it app1 /bin/bash
```
As a sanity check to see if it works, we can try it locally by connecting it to the dev DATABASE_URL we already having running via docker.  We expose it to the same default network created by docker-compose:

```bash
docker run --network=xr_default -e DATABASE_URL=postgres://postgres:postgres@db:5432/xr_dev -e SECRET_KEY_BASE=$(mix phx.gen.secret) -p 4000:4000 app1
```

Goto localhost:4000 in your browser and you should see that everything still works but now the server is running from the docker container.  

### Push Image to ECR

With the image created we need to first push it to a container registry AWS ECR so that AWS ECS has a place to fetch our images and run them on EC2 instances.

We need to create a new repository in our AWS account.  This something we only need to do once for this project but I like having all my AWS infrastructure described in code so that it's repeatable and destroyable all through scripts.

For managing AWS infrastructure I like to use CDK.  If you're not familiar with that checkout [cdk].  When you run commands with the cdk command line utility it will use the same aws credentials that your aws cli is using.

Install cdk globally:
```bash
npm install -g aws-cdk
```

Create a folder for infrastructure and initialize cdk there:

```bash
mkdir infrastructure
cd infrastructure
cdk init --language typescript
```

This will create a new cdk app project directories in your infrastructure folder.  Including a skeleton infrastructure-stack.ts file.  We're going to create a couple of stacks, let's modify it to create a new docker image repository.

Rename infrastructure-stack.ts to repository-stack.ts.

```typescript
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

```
Since we changed the file name and class name we need to update how that class is called from `infrastructure/bin/infrastructure.ts`

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { XrEcrStack } from '../lib/xr-ecr-stack';

const app = new cdk.App();
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
const env = { account, region };
new XrEcrStack(app, 'XrEcrStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env,

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
```
If you run `cdk list`, you should see a single stack:

```bash
XrEcrStack
```

If you run `cdk deploy XrEcrStack` cdk will create a new repository.  For me it took about 15 seconds.  You can log into the aws web console to verify that it has created it or use the aws cli.

```bash
aws ecr describe-repositories
```

## Push Docker Image to ECR

Now we need to use the docker cli to push the image we created to the new ECR we made with CDK.  To do that docker needs to be able to access the private ECR.

### Log Docker CLI into ECR

We can use a command like this, you'll need to substitute your-account-id into the URL and your-region for your aws region (e.g. us-west-2).  Grab the domain name from either your AWS console or the aws cli from the previous command.  

The first part of the command fetches a token and pipes into the next command which logs docker into the AWS ECR.

```bash
aws ecr get-login-password --region your-region | docker login --username AWS --password-stdin your-account-id.dkr.ecr.your-region.amazonaws.com
```
If you see
```bash
Login Succeeded
```
Docker now has the ability to push images to ECR.  This authorization expires from time to time so if you get an authorization error that your token has expired you need to do this command again.

### Tag Image

Identify the local image to push. Run the docker images command to list the container images on your system.

```bash
docker images
```
When we built the image we named it app1 so you should see that image among the results.  The `docker push` command needs to know what repository to push to, so we'll provide that information via a tag.  Use the following command to tag the `app1` image with the name of the ECR repository.

```bash
docker tag app1:latest your-account-id.dkr.ecr.your-region.amazonaws.com/your-repository-name:latest
```

If you run `docker images` again you'll see that there is a new entry after `app1` with the name of the ECR pointing at the same image id as `app1`.


### Push Image

Now we can push the image and `docker` will figure out which repository it goes to.  

```bash
docker push your-account-id.dkr.ecr.your-region.amazonaws.com/your-repository-name:latest
```
This will render a digest in your terminal.  If you view the ECR in the AWS console you will see the same image tag and digest.

## Create Container Service

In AWS ECS there are three basic parts to defining the machinery that will run our code. 

- The cluster: which describes the type of orchestration you will use such as whether to use fargate or EC2 instances.  
- The task definition: This is a blueprint for the container whose configuration depends on whether it is intended to launch onto fargate or EC2, e.g. what kind of OS, memory and cpu limits, execution roles used to eg. memory limits.  The container configuration, similar to docker-compose, what's the name of the image to grab, what port to expose.
- The service: Within the cluster, you define or one more services which specifices how many copies of a task definition to run in the cluster.  It can use a capacity provider which specifices pools of compute such as Fargate or Fargate Spot

## Create Task Definition for Staging Containers

The task definition is similar to our docker-compose file configuration.  It defines many of the same things.  We'll create new cdk stack for the task definition.  Our task definition will contain two containers, one for our phoenix app and one for our database, just like our docker-compose.yml file does for development.  

## Add Secrets required for task definition

Our phoneix application container requires the environment variables for DATABASE_URL and SECRET_KEY_BASE.  We don't want to hardcode these in the cdk file so we'll first manually push them up into AWS Secrets Manager.  

Push DB username and password (put your own values for username and password):

```bash
aws secretsmanager create-secret \
  --name "xr-staging-db-creds" \
  --description "XR Staging DB Secrets for Postgres Docker Image" \
  --secret-string '{
    "username": "postgres-staging",
    "password": "myPostgresStagingPassword",
    "engine": "postgres",
    "host": "localhost",
    "port": "5432",
    "dbname": "xr"
  }'
```
Push secret key base.  Run this one from the phoenix root path.

```bash
aws secretsmanager create-secret \
  --name "xr-staging-secret-key-base" \
  --description "SECRET_KEY_BASE for xr staging app" \
  --secret-string $(mix phx.gen.secret)
```

Now that we've pushed the secrets to secrets manager we can fetch them using CDK and add them as ENV variables to the task definitions so that they are available for our containers.  This still exposes the secret on the task definitions themselves, but this is required for the postgres docker to work, and this is still staging so I'll accept the risk by adding unsafeUnwrap to the secrets values.

### Create Task Definition

Now we'll create a task definition that uses the image we pushed to ECR, the public postgres docker image, and we'll setup the containers with the environment variables we just pushed to AWS secrets manager.

Add a new file to `infrastructure/lib/xr-ecs-stack.ts`:

```typescript
// cdk stack that creates an ECS cluster

import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
export class XrEcsStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
      taskRole,
      executionRole: taskRole //if you don't provide one i think it creates one for you, just use taskRole since I added it's required perms
    });

    // the first container is our phoenix app
    taskDefinition.addContainer('xr-app', {
      image,
      containerName: 'xr-staging-app',
      essential: true,
      environment: {
        DATABASE_URL,  // anticipated db url
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
      ]
    });
    // the second image is the postgres db
    taskDefinition.addContainer('xr-db', {
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
      }],
    });
  }
}
```

Be sure to add the stack to the `bin/infrastructure.ts`:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { XrEcrStack } from '../lib/xr-ecr-stack';
import { XrEcsStack } from '../lib/xr-ecs-stack';

const app = new cdk.App();
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
const env = { account, region };
new XrEcrStack(app, 'XrEcrStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env,

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
new XrEcsStack(app, 'XrEcsStack', { env });
```




### For Running Migrations on Containers Running in Fargate

Ensure that your AWS Cli has at least these permissions to allow your local machine to have permissions to make changes to the cluster and to call the execute command to give us shell access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:ExecuteCommand",
        "ecs:DescribeTasks",
        "ecs:UpdateService",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

While the task definition must have a task role that has at least these permissions in order to setup a communications channel for our local machine to be able to "ssh" into the running container.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssmmessages:CreateControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:OpenDataChannel",
      ],
      "Resource": "*"
    }
  ]
}
```


### Install Session Manager for AWS CLI

https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html

Verify it is installed

https://docs.aws.amazon.com/systems-manager/latest/userguide/install-plugin-verify.html

aws ecs execute-command --cluster xr-staging-cluster --task 03924bd4d86b44f7b36c36fcee8624a5 --container xr-staging-app --interactive --command "/bin/bash"

### Create Task Definition

Let's start with a task definition because the task definition can point to the image in ECR and then the task definition can be instantiated into a running task (a container).






### Create/Update Task Definition

Update ECS Task Definition: You would update the ECS task definition to use the new version of the Docker image. The task definition defines how your containers should be run on ECS, including the Docker image to use, CPU/memory requirements, networking configuration, etc.

### Deploy Task Definition

Deploy New Task Definition: Finally, you would deploy the updated task definition to ECS. ECS will automatically start new tasks using the new version of the Docker image, and gradually stop the old tasks running the previous version of the image.

### Create AWS Cluster

ECS will set up an EC2 instance, and a network for your application. Click on Amazon ECS and select Create Cluster.

nd choose the EC2 Linux + Networking Server

Auto-assign public IP should also be enabled

Visit your EC2 console, you will see your EC2 instance running

### Create Task Definition

Enter the configuration for your Task and also make sure the Task Memory is 100 and Task CPU is 1 vCPU.

### Run Task

Back in your Express App Cluster, select Tasks and Click on Run new Task