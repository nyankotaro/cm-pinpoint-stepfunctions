import datetime
import logging
import os

import boto3
from botocore.exceptions import ClientError

# Lambda environment variable
application_id = os.environ["APPLICATION_ID"]
pinpoinr_role = os.environ["PINPOINT_ROLE"]
# Data setting
t_delta = datetime.timedelta(hours=9)
JST = datetime.timezone(t_delta, "JST")
now = datetime.datetime.now(JST)
date = now.strftime("%m%d")
# Log setting
logger = logging.getLogger(__name__)

client = boto3.client("pinpoint")


def lambda_handler(event, context):

    # Extracted S3 file path
    bucket_name = event["detail"]["bucket"]["name"]
    object_key = event["detail"]["object"]["key"]

    try:
        response = client.create_import_job(
            ApplicationId=application_id,
            ImportJobRequest={
                "DefineSegment": True,
                "Format": "CSV",
                "RegisterEndpoints": True,
                "RoleArn": pinpoinr_role,
                "S3Url": "s3://{}/{}".format(bucket_name, object_key),
                "SegmentName": "{}_segment".format(date),
            },
        )
    except ClientError:
        logger.exception("Could not import segment")
        raise
    else:
        return response
