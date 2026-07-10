#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
AWS_REGION=${AWS_REGION:-$(aws configure get region 2>/dev/null || true)}
APPLICATION_STACK_NAME=${APPLICATION_STACK_NAME:-zara-notifier}
CI_STACK_NAME=${CI_STACK_NAME:-zara-notifier-github-actions}
GITHUB_ORGANIZATION=${GITHUB_ORGANIZATION:-diwakarbhatt123}
GITHUB_REPOSITORY=${GITHUB_REPOSITORY:-ZaraPriceNotifier}
GITHUB_BRANCH=${GITHUB_BRANCH:-V1}

if [[ -z "$AWS_REGION" ]]; then
  echo "Set AWS_REGION or configure a default AWS CLI region." >&2
  exit 1
fi

PROVIDER_ARN=$(aws iam list-open-id-connect-providers \
  --query 'OpenIDConnectProviderList[].Arn' --output text \
  | tr '\t' '\n' \
  | grep 'token.actions.githubusercontent.com$' \
  | head -n 1 || true)

if [[ -z "$PROVIDER_ARN" ]]; then
  echo "Creating the GitHub Actions OIDC provider in this AWS account..."
  PROVIDER_ARN=$(aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --query OpenIDConnectProviderArn \
    --output text)
fi

aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$CI_STACK_NAME" \
  --template-file "$SCRIPT_DIR/github-actions-stack.yaml" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    GitHubOidcProviderArn="$PROVIDER_ARN" \
    GitHubOrganization="$GITHUB_ORGANIZATION" \
    GitHubRepository="$GITHUB_REPOSITORY" \
    GitHubBranch="$GITHUB_BRANCH" \
    ApplicationStackName="$APPLICATION_STACK_NAME"

ROLE_ARN=$(aws cloudformation describe-stacks \
  --region "$AWS_REGION" \
  --stack-name "$CI_STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='RoleArn'].OutputValue | [0]" \
  --output text)

echo
echo "AWS_DEPLOY_ROLE_ARN=$ROLE_ARN"
echo "AWS_REGION=$AWS_REGION"
echo "AWS_STACK_NAME=$APPLICATION_STACK_NAME"

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh variable set AWS_DEPLOY_ROLE_ARN --repo "$GITHUB_ORGANIZATION/$GITHUB_REPOSITORY" --body "$ROLE_ARN"
  gh variable set AWS_REGION --repo "$GITHUB_ORGANIZATION/$GITHUB_REPOSITORY" --body "$AWS_REGION"
  gh variable set AWS_STACK_NAME --repo "$GITHUB_ORGANIZATION/$GITHUB_REPOSITORY" --body "$APPLICATION_STACK_NAME"
  echo "GitHub repository variables configured."
else
  echo "Set the three values above under GitHub Settings > Secrets and variables > Actions > Variables."
fi
