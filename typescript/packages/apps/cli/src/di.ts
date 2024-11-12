/*
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import { AccountClient } from '@aws-sdk/client-account';
import { EC2Client } from '@aws-sdk/client-ec2';
import { DataZoneClient } from '@aws-sdk/client-datazone';
import { IAMClient } from '@aws-sdk/client-iam';
import { OrganizationsClient } from '@aws-sdk/client-organizations';
import { STSClient } from '@aws-sdk/client-sts';
import { SSMClient } from '@aws-sdk/client-ssm';
import { LakeFormationClient } from '@aws-sdk/client-lakeformation';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { SSOAdminClient } from '@aws-sdk/client-sso-admin';
import { IdentitystoreClient } from '@aws-sdk/client-identitystore';
import { RDSClient } from '@aws-sdk/client-rds';

import { InjectionMode, asClass, asFunction, asValue, createContainer } from 'awilix';

import pino, { type BaseLogger, type LoggerOptions } from 'pino';
import { DataZonePromptHandler } from './commands/install/prompt-chain/dataZone.handler.ts';
import { DataZoneProjectPromptHandler } from './commands/install/prompt-chain/dataZoneProject.handler.ts';
import { DataZoneEnvironmentPromptHandler } from './commands/install/prompt-chain/dataZoneEnvironment.handler.ts';
import { IdentityCenterPromptHandler } from './commands/install/prompt-chain/identityCenter.handler.ts';
import { IdentityStorePromptHandler } from './commands/install/prompt-chain/identityStore.handler.ts';
import { OrganizationPromptHandler } from './commands/install/prompt-chain/organization.handler.ts';
import { StartPromptHandler } from './commands/install/prompt-chain/start.handler.ts';
import { VPCPromptHandler } from './commands/install/prompt-chain/vpc.handler.ts';
import { ConfigureHubPromptHandler } from './commands/install/prompt-chain/configureHub.handler.ts';
import { PostDeploymentPromptHandler } from './commands/install/prompt-chain/postDeployment.handler.ts';
import { PortalLoginPromptHandler } from './commands/install/prompt-chain/portalLogin.handler.ts';

import { AwsCliTasksHandler } from './commands/install/tasks-chain/awscli.handler.ts';
import { CdkBootstrapTasksHandler } from './commands/install/tasks-chain/cdkBootstrap.handler.ts';
import { BuildTasksHandler } from './commands/install/tasks-chain/build.handler.ts';
import { CdkHubTasksHandler } from './commands/install/tasks-chain/cdkHub.handler.ts';
import { CdkSpokeTasksHandler } from './commands/install/tasks-chain/cdkSpoke.handler.ts';
import { CdkDemoTasksHandler } from './commands/install/tasks-chain/cdkDemo.handler.ts';
import { CertTasksHandler } from './commands/install/tasks-chain/cert.handler.ts';
import { NodeTasksHandler } from './commands/install/tasks-chain/node.handler.ts';
import { NpmTasksHandler } from './commands/install/tasks-chain/npm.handler.ts';
import { DockerTasksHandler } from './commands/install/tasks-chain/docker.handler.ts';
import { IdentityStoreTasksHandler } from './commands/install/tasks-chain/identityStore.handler.ts';
import { PostDeploymentTasksHandler } from './commands/install/tasks-chain/postDeployment.handler.ts';
import { LoginTasksHandler } from './commands/install/tasks-chain/login.handler.ts';

import { StartPromptHandler as StartDeletePromptHandler } from './commands/delete/prompt-chain/start.handler.ts';
import { RDSPromptHandler } from './commands/delete/prompt-chain/rds.handler.ts';
import { PostDeletePromptHandler } from './commands/delete/prompt-chain/postDelete.handler.ts';
import { DeleteDemoTasksHandler } from './commands/delete/tasks-chain/deleteDemo.handler.ts';
import { DeleteSpokeTasksHandler } from './commands/delete/tasks-chain/deleteSpoke.handler.ts';
import { DeleteHubTasksHandler } from './commands/delete/tasks-chain/deleteHub.handler.ts';

interface Cradle {
	logger: BaseLogger;
	region: string;
	stsClient: STSClient;
	accountClient: AccountClient;
	dataZoneClient: DataZoneClient;
	iamClient: IAMClient;
	organizationsClient: OrganizationsClient;
	ec2Client: EC2Client;
	ssoAdminClient: SSOAdminClient;
	identitystoreClient: IdentitystoreClient;
	ssmClient: SSMClient;
	lakeFormationClient: LakeFormationClient;
	cloudFormationClient: CloudFormationClient;
	rdsClient: RDSClient;

	startPromptHandler: StartPromptHandler;
	organizationPromptHandler: OrganizationPromptHandler;
	vpcPromptHandler: VPCPromptHandler;
	identityCenterPromptHandler: IdentityCenterPromptHandler;
	identityStorePromptHandler: IdentityStorePromptHandler;
	dataZonePromptHandler: DataZonePromptHandler;
	dataZoneProjectPromptHandler: DataZoneProjectPromptHandler;
	dataZoneEnvironmentPromptHandler: DataZoneEnvironmentPromptHandler;
	configureHubPromptHandler: ConfigureHubPromptHandler;
	identityStoreTasksHandler: IdentityStoreTasksHandler;
	postDeploymentPromptHandler: PostDeploymentPromptHandler;
	portalLoginPromptHandler: PortalLoginPromptHandler;

	awsCliTasksHandler: AwsCliTasksHandler;
	nodeTasksHandler: NodeTasksHandler;
	npmTasksHandler: NpmTasksHandler;
	cdkBootstrapTasksHandler: CdkBootstrapTasksHandler;
	buildTasksHandler: BuildTasksHandler;
	cdkHubTasksHandler: CdkHubTasksHandler;
	cdkSpokeTasksHandler: CdkSpokeTasksHandler;
	cdkDemoTasksHandler: CdkDemoTasksHandler;
	certTasksHandler: CertTasksHandler;
	dockerTasksHandler: DockerTasksHandler;
	postDeploymentTasksHandler: PostDeploymentTasksHandler;
	loginTasksHandler: LoginTasksHandler;

	startDeletePromptHandler: StartDeletePromptHandler;
	rdsPromptHandler: RDSPromptHandler;
	postDeletePromptHandler: PostDeletePromptHandler;
	deleteDemoTasksHandler: DeleteDemoTasksHandler;
	deleteSpokeTasksHandler: DeleteSpokeTasksHandler;
	deleteHubTasksHandler: DeleteHubTasksHandler;
}

class STSClientFactory {
	public static create(region: string): STSClient {
		return new STSClient({
			region,
		});
	}
}

class AccountClientFactory {
	public static create(region: string): AccountClient {
		return new AccountClient({
			region,
		});
	}
}

class DataZoneClientFactory {
	public static create(region: string): DataZoneClient {
		return new DataZoneClient({
			region,
		});
	}
}

class IAMClientFactory {
	public static create(region: string): IAMClient {
		return new IAMClient({
			region,
		});
	}
}

class OrganizationsClientFactory {
	public static create(region: string): OrganizationsClient {
		return new OrganizationsClient({
			region,
		});
	}
}

class EC2ClientFactory {
	public static create(region: string): EC2Client {
		return new EC2Client({
			region,
		});
	}
}

class SSMClientFactory {
	public static create(region: string): SSMClient {
		return new SSMClient({
			region,
		});
	}
}

class SSOAdminClientFactory {
	public static create(region: string): SSOAdminClient {
		return new SSOAdminClient({
			region,
		});
	}
}

class IdentitystoreClientFactory {
	public static create(region: string): IdentitystoreClient {
		return new IdentitystoreClient({
			region,
		});
	}
}

class LakeFormationClientFactory {
	public static create(region: string): LakeFormationClient {
		return new LakeFormationClient({
			region,
		});
	}
}

class CloudFormationClientFactory {
	public static create(region: string): CloudFormationClient {
		return new CloudFormationClient({
			region,
		});
	}
}

class RDSClientFactory {
	public static create(region: string): RDSClient {
		return new RDSClient({
			region,
		});
	}
}

// Create the container
export const diContainer = createContainer<Cradle>({
	injectionMode: InjectionMode.CLASSIC,
	strict: true,
});

// Register the classes
diContainer.register({
	logger: asFunction(() => {
		const loggerEnvironmentConfig: { [env: string]: LoggerOptions } = {
			local: {
				level: Bun.env.LOG_LEVEL ?? 'warn',
				transport: {
					target: 'pino-pretty',
					options: {
						translateTime: 'HH:MM:ss Z',
						ignore: 'pid,hostname',
					},
				},
			},
			cloud: {
				level: Bun.env.LOG_LEVEL ?? 'warn',
			},
		};
		const logger = pino(
			loggerEnvironmentConfig[Bun.env.NODE_ENV as string] ?? {
				level: Bun.env.LOG_LEVEL ?? 'info',
			}
		);
		return logger;
	}).singleton(),

	region: asValue(process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1'),

	stsClient: asFunction(() => STSClientFactory.create(diContainer.cradle.region)),
	accountClient: asFunction(() => AccountClientFactory.create(diContainer.cradle.region)),
	dataZoneClient: asFunction(() => DataZoneClientFactory.create(diContainer.cradle.region)),
	iamClient: asFunction(() => IAMClientFactory.create(diContainer.cradle.region)),
	organizationsClient: asFunction(() => OrganizationsClientFactory.create(diContainer.cradle.region)),
	ec2Client: asFunction(() => EC2ClientFactory.create(diContainer.cradle.region)),
	ssmClient: asFunction(() => SSMClientFactory.create(diContainer.cradle.region)),
	ssoAdminClient: asFunction(() => SSOAdminClientFactory.create(diContainer.cradle.region)),
	identitystoreClient: asFunction(() => IdentitystoreClientFactory.create(diContainer.cradle.region)),
	lakeFormationClient: asFunction(() => LakeFormationClientFactory.create(diContainer.cradle.region)),
	cloudFormationClient: asFunction(() => CloudFormationClientFactory.create(diContainer.cradle.region)),
	rdsClient: asFunction(() => RDSClientFactory.create(diContainer.cradle.region)),

	startPromptHandler: asClass(StartPromptHandler),
	organizationPromptHandler: asClass(OrganizationPromptHandler),
	vpcPromptHandler: asClass(VPCPromptHandler),
	identityCenterPromptHandler: asClass(IdentityCenterPromptHandler),
	identityStorePromptHandler: asClass(IdentityStorePromptHandler),
	dataZonePromptHandler: asClass(DataZonePromptHandler),
	dataZoneProjectPromptHandler: asClass(DataZoneProjectPromptHandler),
	dataZoneEnvironmentPromptHandler: asClass(DataZoneEnvironmentPromptHandler),
	configureHubPromptHandler: asClass(ConfigureHubPromptHandler),
	postDeploymentPromptHandler: asClass(PostDeploymentPromptHandler),
	portalLoginPromptHandler: asClass(PortalLoginPromptHandler),

	awsCliTasksHandler: asClass(AwsCliTasksHandler),
	nodeTasksHandler: asClass(NodeTasksHandler),
	npmTasksHandler: asClass(NpmTasksHandler),
	cdkBootstrapTasksHandler: asClass(CdkBootstrapTasksHandler),
	buildTasksHandler: asClass(BuildTasksHandler),
	cdkHubTasksHandler: asClass(CdkHubTasksHandler),
	cdkSpokeTasksHandler: asClass(CdkSpokeTasksHandler),
	cdkDemoTasksHandler: asClass(CdkDemoTasksHandler),
	certTasksHandler: asClass(CertTasksHandler),
	dockerTasksHandler: asClass(DockerTasksHandler),
	loginTasksHandler: asClass(LoginTasksHandler),
	identityStoreTasksHandler: asClass(IdentityStoreTasksHandler),
	postDeploymentTasksHandler: asClass(PostDeploymentTasksHandler),

	startDeletePromptHandler: asClass(StartDeletePromptHandler),
	rdsPromptHandler: asClass(RDSPromptHandler),
	postDeletePromptHandler: asClass(PostDeletePromptHandler),
	deleteDemoTasksHandler: asClass(DeleteDemoTasksHandler),
	deleteSpokeTasksHandler: asClass(DeleteSpokeTasksHandler),
	deleteHubTasksHandler: asClass(DeleteHubTasksHandler),
});

export function updateRegion(region: string) {
	diContainer.register({
		region: asValue(region),
		stsClient: asFunction(() => STSClientFactory.create(diContainer.cradle.region)),
		accountClient: asFunction(() => AccountClientFactory.create(diContainer.cradle.region)),
		dataZoneClient: asFunction(() => DataZoneClientFactory.create(diContainer.cradle.region)),
		iamClient: asFunction(() => IAMClientFactory.create(diContainer.cradle.region)),
		organizationsClient: asFunction(() => OrganizationsClientFactory.create(diContainer.cradle.region)),
		ec2Client: asFunction(() => EC2ClientFactory.create(diContainer.cradle.region)),
		ssmClient: asFunction(() => SSMClientFactory.create(diContainer.cradle.region)),
		ssoAdminClient: asFunction(() => SSOAdminClientFactory.create(diContainer.cradle.region)),
	});
}
