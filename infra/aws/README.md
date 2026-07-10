# AWS repeatable deployment

`ec2-stack.yaml` creates a complete single-instance deployment:

- Ubuntu 24.04 EC2 instance using a versioned Launch Template
- 20 GB encrypted gp3 root volume and 2 GB swap
- static Elastic IP
- security group exposing only HTTP 80 and optional SSH 22
- IAM role for Session Manager and SSM Parameter Store
- Node.js 22, Puppeteer Chrome, Nginx, backend, and Next.js frontend
- separate systemd services for the backend and frontend
- SQLite data under `/var/lib/zara-notifier`

The template is preferable to baking the live server into an AMI because a live AMI would also capture the SQLite database and decrypted environment files.

## Prerequisites

1. Install and authenticate the AWS CLI locally.
2. Push the application to a public HTTPS Git repository.
3. Create the required secrets in SSM Parameter Store in the deployment region.

```bash
aws ssm put-parameter \
  --region eu-west-2 \
  --name /zara-notifier/telegram-bot-token \
  --type SecureString \
  --value 'YOUR_BOT_TOKEN' \
  --overwrite

aws ssm put-parameter \
  --region eu-west-2 \
  --name /zara-notifier/telegram-chat-id \
  --type SecureString \
  --value 'YOUR_CHAT_ID' \
  --overwrite
```

The Zara cookie is optional:

```bash
aws ssm put-parameter \
  --region eu-west-2 \
  --name /zara-notifier/zara-request-cookie \
  --type SecureString \
  --value 'YOUR_COOKIE_HEADER' \
  --overwrite
```

## Deploy

Configure a default region once, then deploy from the repository root:

```bash
aws configure set region eu-west-2
./infra/aws/deploy.sh
```

The script automatically discovers:

- the configured AWS region
- the default VPC
- the first public subnet, ordered by availability zone
- the repository's `origin` URL
- the current Git branch

It uses AWS Systems Manager Session Manager by default, so an SSH key and inbound port 22 are not required.

To enable SSH, provide a key-pair name. Your current public IP is detected automatically and restricted to `/32`:

```bash
KEY_NAME=my-ec2-key ./infra/aws/deploy.sh
```

Every discovered value can still be overridden explicitly:

```bash
VPC_ID=vpc-xxxxxxxx \
SUBNET_ID=subnet-xxxxxxxx \
REPOSITORY_URL=https://github.com/your-user/ZaraPriceNotifier.git \
./infra/aws/deploy.sh
```

For a t2.micro instead of the default t3.micro:

```bash
export INSTANCE_TYPE=t2.micro
./infra/aws/deploy.sh
```

CloudFormation outputs the static public IP and application URL. Initial provisioning can take several minutes because Chrome and both Node applications are installed and the Next.js UI is built.

## Verify provisioning

Connect through SSH or AWS Systems Manager Session Manager, then run:

```bash
sudo tail -f /var/log/zara-notifier-bootstrap.log
sudo systemctl status zara-notifier
sudo systemctl status zara-notifier-web
sudo systemctl status nginx
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:3000
```

## Update the application

For ordinary application changes, update the instance in place:

```bash
sudo systemctl stop zara-notifier zara-notifier-web
cd /opt/zara-notifier
sudo -u ubuntu git pull --ff-only
sudo -u ubuntu env HOME=/home/ubuntu PUPPETEER_CACHE_DIR=/home/ubuntu/.cache/puppeteer npm ci
cd web
sudo -u ubuntu env HOME=/home/ubuntu npm ci
sudo -u ubuntu env HOME=/home/ubuntu NODE_OPTIONS=--max-old-space-size=768 npm run build
sudo systemctl start zara-notifier zara-notifier-web
```

Re-running `deploy.sh` updates the CloudFormation stack, but changing Launch Template boot parameters does not replace an existing EC2 instance automatically. To rebuild from scratch, deploy a new stack name or replace the instance through CloudFormation.

## About AMIs

You can create an AMI from the EC2 console after deployment, but that image will contain:

- the current SQLite database
- cached browser state
- decrypted `/etc/zara-notifier/*.env` files

For that reason, use the CloudFormation template as the normal recovery/deployment mechanism. If you create an AMI, treat it as sensitive and encrypt/restrict access to it.
