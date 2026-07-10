#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/../.." && pwd)

AWS_REGION=${AWS_REGION:-$(aws configure get region 2>/dev/null || true)}
if [[ -z "$AWS_REGION" ]]; then
  echo "AWS region is not configured. Run 'aws configure set region eu-west-2' or set AWS_REGION." >&2
  exit 1
fi

VPC_ID=${VPC_ID:-$(aws ec2 describe-vpcs \
  --region "$AWS_REGION" \
  --filters Name=is-default,Values=true \
  --query 'Vpcs[0].VpcId' \
  --output text)}

if [[ -z "$VPC_ID" || "$VPC_ID" == "None" ]]; then
  echo "No default VPC found. Set VPC_ID explicitly." >&2
  exit 1
fi

SUBNET_ID=${SUBNET_ID:-$(aws ec2 describe-subnets \
  --region "$AWS_REGION" \
  --filters Name=vpc-id,Values="$VPC_ID" Name=map-public-ip-on-launch,Values=true \
  --query 'sort_by(Subnets,&AvailabilityZone)[0].SubnetId' \
  --output text)}

if [[ -z "$SUBNET_ID" || "$SUBNET_ID" == "None" ]]; then
  echo "No public subnet found in $VPC_ID. Set SUBNET_ID explicitly." >&2
  exit 1
fi

REPOSITORY_URL=${REPOSITORY_URL:-$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || true)}
REPOSITORY_BRANCH=${REPOSITORY_BRANCH:-$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null || true)}

if [[ "$REPOSITORY_URL" =~ ^git@github.com:(.+)$ ]]; then
  REPOSITORY_URL="https://github.com/${BASH_REMATCH[1]}"
fi

if [[ -z "$REPOSITORY_URL" ]]; then
  echo "No Git origin found. Set REPOSITORY_URL explicitly." >&2
  exit 1
fi

STACK_NAME=${STACK_NAME:-zara-notifier}
REPOSITORY_BRANCH=${REPOSITORY_BRANCH:-main}
INSTANCE_TYPE=${INSTANCE_TYPE:-t3.micro}
ROOT_VOLUME_SIZE=${ROOT_VOLUME_SIZE:-20}
SSM_PARAMETER_PREFIX=${SSM_PARAMETER_PREFIX:-/zara-notifier}
KEY_NAME=${KEY_NAME:-}
ALLOWED_SSH_CIDR=${ALLOWED_SSH_CIDR:-}

if [[ -n "$KEY_NAME" && -z "$ALLOWED_SSH_CIDR" ]]; then
  ALLOWED_SSH_CIDR="$(curl -fsS https://checkip.amazonaws.com)/32"
fi

echo "Deployment configuration:"
printf '  %-22s %s\n' \
  AWS_REGION "$AWS_REGION" \
  VPC_ID "$VPC_ID" \
  SUBNET_ID "$SUBNET_ID" \
  REPOSITORY_URL "$REPOSITORY_URL" \
  REPOSITORY_BRANCH "$REPOSITORY_BRANCH" \
  INSTANCE_TYPE "$INSTANCE_TYPE" \
  ROOT_VOLUME_SIZE "$ROOT_VOLUME_SIZE" \
  KEY_NAME "${KEY_NAME:-Session Manager only}"

PARAMETERS=(
  VpcId="$VPC_ID"
  SubnetId="$SUBNET_ID"
  RepositoryUrl="$REPOSITORY_URL"
  RepositoryBranch="$REPOSITORY_BRANCH"
  InstanceType="$INSTANCE_TYPE"
  RootVolumeSize="$ROOT_VOLUME_SIZE"
  SsmParameterPrefix="$SSM_PARAMETER_PREFIX"
)

if [[ -n "$KEY_NAME" ]]; then
  PARAMETERS+=(KeyName="$KEY_NAME" AllowedSshCidr="$ALLOWED_SSH_CIDR")
fi

aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --template-file "$SCRIPT_DIR/ec2-stack.yaml" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides "${PARAMETERS[@]}"

aws cloudformation describe-stacks \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs' \
  --output table
