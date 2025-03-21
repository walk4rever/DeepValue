import os
import boto3
from dotenv import load_dotenv

# Load environment variables from .env.aws file
load_dotenv(dotenv_path='../.env.aws')

# Get AWS credentials from environment variables
region = os.getenv('AWS_REGION', 'us-west-2')

# Create DynamoDB resource
dynamodb = boto3.resource(
    'dynamodb',
    region_name=region,
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
)
