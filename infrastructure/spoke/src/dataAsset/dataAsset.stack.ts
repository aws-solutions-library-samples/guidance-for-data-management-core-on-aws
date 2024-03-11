import { Stack, StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { NagSuppressions } from 'cdk-nag';

import { DataAssetSpoke } from "./dataAsset.construct.js";
import { dfSpokeEventBusName, OrganizationUnitPath } from '@df/cdk-common';
import { bucketNameParameter } from '../shared/s3.construct.js';
import { GlueDatabaseNameParameter } from '../shared/sharedSpoke.stack.js';
// import { bucketNameParameter } from '../shared/s3.construct.js';

export type DataAssetSpokeStackProperties = StackProps & {
    moduleName: string;
    orgPath: OrganizationUnitPath;
    hubAccountId: string;
};


export const dataAssetStateMachineArnParameter = `/df/spoke/dataAsset/stateMachineArn`;

export class DataAssetSpokeStack extends Stack {
    constructor(scope: Construct, id: string, props: DataAssetSpokeStackProperties) {
        super(scope, id, props);

        const bucketName = StringParameter.valueForStringParameter(this, bucketNameParameter);
        const glueDatabaseName = StringParameter.valueForStringParameter(this, GlueDatabaseNameParameter);

        const dataAsset = new DataAssetSpoke(this, 'DataAssetSpoke', {
            moduleName: props.moduleName,
            hubAccountId: props.hubAccountId,
            spokeEventBusName: dfSpokeEventBusName,
            bucketName,
            orgPath: props.orgPath,
            glueDatabaseName
        });


        new StringParameter(this, 'dataAssetStateMachineArnParameter', {
            parameterName: dataAssetStateMachineArnParameter,
            stringValue: dataAsset.stateMachineArn
        });

        NagSuppressions.addResourceSuppressionsByPath(this, '/DataAssetStack/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/DefaultPolicy/Resource',
            [
                {
                    id: 'AwsSolutions-IAM4',
                    appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
                    reason: 'This policy is the one generated by CDK.'

                },
                {
                    id: 'AwsSolutions-IAM5',
                    appliesTo: ['Resource::*'
                    ],
                    reason: 'The resource condition in the IAM policy is generated by CDK, this only applies to xray:PutTelemetryRecords and xray:PutTraceSegments actions.'

                }
            ],
            true);

        NagSuppressions.addResourceSuppressionsByPath(this, '/DataAssetStack/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/Resource',
            [
                {
                    id: 'AwsSolutions-IAM4',
                    appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
                    reason: 'This policy is the one generated by CDK.'

                }
            ],
            true);
    }


}
