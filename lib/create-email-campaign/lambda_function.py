import datetime
import logging
import os

import boto3
from botocore.exceptions import ClientError

# Lambda environment variable
application_id = os.environ["APPLICATION_ID"]
template = os.environ["TEMPLATE"]
# Data setting
t_delta = datetime.timedelta(hours=9)
JST = datetime.timezone(t_delta, "JST")
now = datetime.datetime.now(JST)
date = now.strftime("%m%d")
# Log setting
logger = logging.getLogger(__name__)

client = boto3.client("pinpoint")


def lambda_handler(event, context):

    # Extracted Segment Id
    segmetn_id = event["ImportJobResponse"]["Definition"]["SegmentId"]

    try:
        response = client.create_campaign(
            ApplicationId=application_id,
            WriteCampaignRequest={
                "Name": "{}_email_campaign".format(date),
                "Schedule": {
                    "StartTime": "IMMEDIATE",
                },
                "SegmentId": segmetn_id,
                "SegmentVersion": 1,
                "TemplateConfiguration": {
                    "EmailTemplate": {
                        "Name": template,
                    },
                },
            },
        )
    except ClientError:
        logger.exception("Could not create campaign")
        raise
    else:
        return response
