import { Stack, StackProps } from 'aws-cdk-lib';
import { Network, DfVpcConfig } from './network.construct.js';
import { Cognito } from './cognito.construct.js';
import { Bus, userPoolIdParameter } from '@dm/cdk-common';
import { SSM } from './ssm.construct.js';
import type { Construct } from 'constructs';
import { Compute } from './compute.construct.js';
import { S3, bucketArnParameter, bucketNameParameter } from './s3.construct.js';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { NagSuppressions } from 'cdk-nag';

export type SharedHubStackProperties = StackProps & {
	deleteBucket?: boolean;
	userVpcConfig?: DfVpcConfig;
};

export class SharedHubInfrastructureStack extends Stack {
	vpcId: string;
	constructor(scope: Construct, id: string, props: SharedHubStackProperties) {
		super(scope, id, props);

		const network = new Network(this, 'Network', {
			deleteBucket: props.deleteBucket,
			userVpcConfig: props.userVpcConfig ? props.userVpcConfig : undefined,
		});

		new Compute(this, 'Compute', {
			vpc: network.vpc,
		});

		const s3 = new S3(this, 'S3', {
			deleteBucket: props.deleteBucket,
			accessLogBucketName: network.accessLogBucketName,
		});

		s3.node.addDependency(network);

		new ssm.StringParameter(this, 'bucketNameParameter', {
			parameterName: bucketNameParameter,
			description: 'shared Bucket Name for DM',
			stringValue: s3.bucketName,
		});

		new ssm.StringParameter(this, 'bucketArnParameter', {
			parameterName: bucketArnParameter,
			description: 'shared Bucket Arn for DM',
			stringValue: s3.bucketArn,
		});

		new Cognito(this, 'Cognito', {
			userPoolIdParameter,
		});

		new Bus(this, 'EventBus', false);

		new SSM(this, 'ApiFunctionNameParameters');

		NagSuppressions.addResourceSuppressionsByPath(
			this,
			'/SharedHubStack/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/Resource',
			[
				{
					id: 'AwsSolutions-IAM4',
					appliesTo: [`Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`],
					reason: 'Lambda execution permissions.',
				},
				{
					id: 'AwsSolutions-IAM5',
					appliesTo: [`Resource::*`],
					reason: 'Lambda execution permissions.',
				},
			],
			true
		);
	}
}
