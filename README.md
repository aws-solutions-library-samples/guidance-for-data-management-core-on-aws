# Guidance for Data Management Core on AWS

## Table of Contents

1. [Overview](#overview)
2. [Cost](#cost)
3. [Deployment](#deployment)

## Overview

The Guidance for Data Fabric on AWS is an opinionated data fabric implementation on AWS.

### Cost

You are responsible for the cost of the AWS services used while running this Guidance. As of May 2024, the cost for running this Guidance with the default settings in the US West (Oregon) AWS Region is approximately $530 per month, using the following assumptions:

-   Assume 10 DataZone users with metadata storage & requests under amount included in per user cost ([DataZone pricing](https://aws.amazon.com/datazone/pricing/))
-   50 data fabric create asset API requests per month
-   Low (< 1k) lineage API/PUT requests per month
-   Does not include estimates for existing S3, Glue, etc resources in the customer's data fabric spoke account

A detailed cost breakdown estimate can be found at [this shared AWS Pricing Calculator estimate](https://calculator.aws/#/estimate?id=b1560b8587e9048fae318b247799f336d02453bd). This detailed estimate does not yet include DataZone pricing so adding \$9/month/user for our assumed 10 users gives us \$90 additional per month to add on to this estimate. This gives us the \$530/month estimate referenced above.

## Deployment

### [Manual installation](docs/manual_installation.md)

This installation mode allows for the deployment of the Data Fabric into multiple accounts.

### [CLI installation](typescript/packages/apps/cli/README.md)

Allows the installation of the Data Fabric through a series of questions and answers in the Command Line. This deployment method is suited for quick deployment of a demonstration Data Fabric.
**Note:** This deployment method currently supports the deployment of the entire Data Fabric into a single AWS Account

## Notices

_Customers are responsible for making their own independent assessment of the information in this Guidance. This Guidance: (a) is for informational purposes only, (b) represents AWS current product offerings and practices, which are subject to change without notice, and (c) does not create any commitments or assurances from AWS and its affiliates, suppliers or licensors. AWS products or services are provided “as is” without warranties, representations, or conditions of any kind, whether express or implied. AWS responsibilities and liabilities to its customers are controlled by AWS agreements, and this Guidance is not part of, nor does it modify, any agreement between AWS and its customers._
