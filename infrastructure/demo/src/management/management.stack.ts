import { Stack, StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';

import { IAMConstruct } from './iam.construct.js';

export type DemoManagementStackProperties = StackProps & {
	IdentityStoreAdminUserId?: string;
};

export class DemoManagementStack extends Stack {
	constructor(scope: Construct, id: string, props: DemoManagementStackProperties) {
		super(scope, id, props);

		new IAMConstruct(this, 'ManagementIamConstruct', {});
	}
}
