## Deploy to a cloud server

Up until now we've been using our local machine to do development and testing.  When we put on the headset we've been using ngrok to create an SSH tunnel from an ngrok https endpoint to the server running on our local machine.

Even though the project is still in the development stage, it would be nice to be able to deploy the code to a platform service that is not on our local machine.  They way we provide a public demo site where we can invite more beta testers to try our game features as we add them, without having folks connect to our local machine.

## Generate Docker Release

```bash
mix phx.gen.release --docker
```

This creates a /rel folder, a release.ex file, a .dockerignore file and a Dockerfile.

The Dockerfile essentially copies our source code into an image in order to run mix release in an operating system and architecture that is the same as our production target.  It does this in stages so that only the release is remaining at the end.

Since we installed node via nvm, we should add that to the Dockerfile.  Here is mine:

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

# moved this below assets, since if lib changes up higher, all subsequent layers
# will be rebuilt, but if only lib changes below assets and assets don't change
# then we don't need to rebuild them
COPY lib lib

# compile assets
# RUN mix assets.deploy

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

We can build a release inside the Docker image during the build process:

```bash
docker build -t app1 --progress plain .
```

Try it locally by connecting it to the DATABASE_URL we already having running from our docker-compose.  We expose it to the same default network created by docker-compose:

```bash
docker run --network=xr_default -e DATABASE_URL=postgres://postgres:postgres@db:5432/xr_dev -e SECRET_KEY_BASE=$(mix phx.gen.secret) -p 4000:4000 app1
```

Goto localhost:4000 in your browser and you should see that everything still works but now the server is running from the docker container.  And the docker container is running in production mode.

### Setup AWS ECR

## Push Image to ECR

### Docker Login to ECR

```bash
aws ecr get-login-password --region your-region | docker login --username AWS --password-stdin your-account-id.dkr.ecr.your-region.amazonaws.com

```

Identify the local image to push. Run the docker images command to list the container images on your system.

```bash
docker images
```

### Tag Image

```bash
docker tag your-image-name:latest your-account-id.dkr.ecr.your-region.amazonaws.com/your-repository-name:latest
```
### Push Image

```bash
docker push your-account-id.dkr.ecr.your-region.amazonaws.com/your-repository-name:latest
```

in your ECR console, you will see your application image with the latest image tag.

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