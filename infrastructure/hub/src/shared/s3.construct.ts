import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { RemovalPolicy, Duration, Stack } from 'aws-cdk-lib';

export interface S3ConstructProperties {
	deleteBucket: boolean;
	accessLogBucketName: string;
}

export const bucketNameParameter = `/dm/shared/bucketName`;
export const bucketArnParameter = `/dm/shared/bucketArn`;

export class S3 extends Construct {
	public readonly bucketName: string;
	public readonly bucketArn: string;

	constructor(scope: Construct, id: string, props: S3ConstructProperties) {
		super(scope, id);

		const accountId = Stack.of(this).account;
		const region = Stack.of(this).region;
		const bucketName = `dm-${accountId}-${region}-hub`;
		const accessLogBucket = s3.Bucket.fromBucketName(this, 'accessLogBucket', props.accessLogBucketName);

		const bucket = new s3.Bucket(this, 'dmBucket', {
			bucketName: bucketName,
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
			serverAccessLogsBucket: accessLogBucket,
			serverAccessLogsPrefix: `${bucketName}/access-logs/`,
			removalPolicy: props.deleteBucket ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
		});

		bucket.node.addDependency(accessLogBucket);

		this.bucketArn = bucket.bucketArn;
		this.bucketName = bucket.bucketName;
	}
}
