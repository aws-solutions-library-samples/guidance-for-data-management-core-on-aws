import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { RemovalPolicy, Duration, Stack } from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';

export interface S3ConstructProperties {
	deleteBucket: boolean;
	bucketName: string;
}

export const bucketNameParameter = `/dm-demo/hub/shared/bucketName`;
export const bucketArnParameter = `/dm-demo/hub/shared/bucketArn`;

export class S3Construct extends Construct {
	bucketArn: string;

	constructor(scope: Construct, id: string, props: S3ConstructProperties) {
		super(scope, id);

		const bucket = new s3.Bucket(this, 'dmBucket', {
			bucketName: props.bucketName,
			encryption: s3.BucketEncryption.S3_MANAGED,
			intelligentTieringConfigurations: [
				{
					name: 'archive',
					archiveAccessTierTime: Duration.days(90),
					deepArchiveAccessTierTime: Duration.days(180),
				},
			],
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			enforceSSL: true,
			autoDeleteObjects: props.deleteBucket,
			versioned: !props.deleteBucket,
			removalPolicy: props.deleteBucket ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
		});

		this.bucketArn = bucket.bucketArn;

		NagSuppressions.addResourceSuppressions(
			[bucket],
			[
				{
					id: 'AwsSolutions-S1',
					reason: 'This is the Access Logs bucket and it should have access logging disabled',
				},
			],
			true
		);
	}
}
