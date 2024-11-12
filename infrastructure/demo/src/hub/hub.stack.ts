import { Stack, StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { DatazoneConstruct } from './datazone.construct.js';
import { S3Construct } from './s3.construct.js';

export type DemoHubStackProperties = StackProps & {
	IdentityStoreAdminUserId?: string;
};

export class DemoHubStack extends Stack {
	constructor(scope: Construct, id: string, props: DemoHubStackProperties) {
		super(scope, id, props);

		const accountId = Stack.of(this).account;
		const region = Stack.of(this).region;
		const bucketName = `df-demo-${accountId}-${region}`;

		const s3 = new S3Construct(this, 's3', {
			deleteBucket: true,
			bucketName,
		});

		const dataZone = new DatazoneConstruct(this, 'Datazone', {
			userIdentifier: props.IdentityStoreAdminUserId,
			bucketName,
		});
		dataZone.node.addDependency(s3);
	}
}
