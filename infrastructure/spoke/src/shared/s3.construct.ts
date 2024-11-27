import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { RemovalPolicy, Duration, Stack } from 'aws-cdk-lib';

export interface S3SpokeConstructProperties {
	deleteBucket: boolean;
}

export const bucketNameParameter = `/dm/spoke/shared/bucketName`;
export const bucketArnParameter = `/dm/spoke/shared/bucketArn`;

export class S3Spoke extends Construct {
	public readonly bucketName: string;
	public readonly bucketArn: string;

	constructor(scope: Construct, id: string, props: S3SpokeConstructProperties) {
		super(scope, id);

		const accountId = Stack.of(this).account;
		const region = Stack.of(this).region;
		const bucketName = `dm-spoke-${accountId}-${region}`;


		const bucket = new s3.Bucket(this, 'dmBucket', {
			bucketName: bucketName,
			encryption: s3.BucketEncryption.S3_MANAGED,
			intelligentTieringConfigurations: [
				{
					name: 'archive',
					archiveAccessTierTime: Duration.days(90),
					deepArchiveAccessTierTime: Duration.days(180)
				}
			],
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			enforceSSL: true,
			autoDeleteObjects: props.deleteBucket,
			versioned: !props.deleteBucket,
			serverAccessLogsPrefix: 'access-logs/',
			removalPolicy: props.deleteBucket ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
		});

		this.bucketArn = bucket.bucketArn;
		this.bucketName = bucket.bucketName;
	}
}
