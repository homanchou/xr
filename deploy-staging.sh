REGION=us-west-2
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE_URL=${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com
REPOSITORY_NAME=xr-repository
APP_NAME=app1
CLUSTER_NAME=xr-staging-cluster
SERVICE_NAME=xr-staging-service

# docker login to aws
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin $ECR_BASE_URL

# build image from current workspace
docker build -t $APP_NAME --progress plain .

# tag image
docker tag $APP_NAME:latest $ECR_BASE_URL/$REPOSITORY_NAME:latest

# push image to ECR
docker push $ECR_BASE_URL/$REPOSITORY_NAME:latest

# update the service
aws ecs update-service --cluster $CLUSTER_NAME --service $SERVICE_NAME --force-new-deployment --region $REGION