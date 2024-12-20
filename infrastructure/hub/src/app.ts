#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';
import { Aspects } from 'aws-cdk-lib';
import { SharedHubInfrastructureStack } from './shared/sharedHub.stack.js';
import { SsoCustomStack } from './shared/ssoCustom.stack.js';
import { CognitoCustomStack } from './shared/cognitoCustom.stack.js';
import { DataLineageStack } from './dataLineage/dataLineage.stack.js';
import { AwsSolutionsChecks } from 'cdk-nag';
import { tryGetBooleanContext, getOrThrow, userPoolIdParameter, OrganizationUnitPath } from '@dm/cdk-common';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import { DataAssetStack } from './dataAsset/dataAsset.stack.js';
import { DiscoveryStack } from './discovery/discovery.stack.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = new cdk.App();

const deleteBucket = tryGetBooleanContext(app, 'deleteBucket', false);

// mandatory (for now) AWS Organizations parameters
const orgId = getOrThrow(app, 'orgId');
const orgRootId = getOrThrow(app, 'orgRootId');
const orgOuId = getOrThrow(app, 'orgOuId');
const orgPath: OrganizationUnitPath = {
	orgId,
	rootId: orgRootId,
	ouId: orgOuId,
};

// user VPC config
const useExistingVpc = tryGetBooleanContext(app, 'useExistingVpc', false);

// Mandatory - Identity Store parameters
const identityStoreId = getOrThrow(app, 'identityStoreId');
const identityStoreRoleArnStr = app.node.tryGetContext('identityStoreRoleArn') as string; // An assumable role that can be used to make API calls to Identity Store
const identityStoreRoleArn = identityStoreRoleArnStr === 'undefined' ? undefined : identityStoreRoleArnStr;
const identityStoreRegion = getOrThrow(app, 'identityStoreRegion');

const ssoRegion = app.node.tryGetContext('ssoRegion');
const adminEmail = app.node.tryGetContext('adminEmail');

// Optional requirements to configure the step function
const taskTimeOutMinutes = (app.node.tryGetContext('taskTimeOutMinutes') as number) ?? 1440;

// Optional requirements to specify the cognito SAML provider
const ssoInstanceArn = app.node.tryGetContext('ssoInstanceArn');
const samlMetaDataUrlStr = app.node.tryGetContext('samlMetaDataUrl') as string;
const samlMetaDataUrl = samlMetaDataUrlStr === 'undefined' ? undefined : samlMetaDataUrlStr;
const callbackUrlsStr = app.node.tryGetContext('callbackUrls') as string;
const callbackUrls = callbackUrlsStr === 'undefined' ? undefined : callbackUrlsStr;

let userVpcId;
let userIsolatedSubnetIds, userPrivateSubnetIds, userPublicSubnetIds;
if (useExistingVpc) {
	userVpcId = getOrThrow(app, 'existingVpcId');
	userPublicSubnetIds = getOrThrow(app, 'existingPublicSubnetIds').toString().split(',');
	userPrivateSubnetIds = getOrThrow(app, 'existingPrivateSubnetIds').toString().split(',');
	userIsolatedSubnetIds = getOrThrow(app, 'existingIsolatedSubnetIds').toString().split(',');
}

// tags the entire deployment
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

const stackNamePrefix = `dm-hub`;

const stackName = (suffix: string) => `${stackNamePrefix}-${suffix}`;
const stackDescription = (moduleName: string) => `Infrastructure for ${moduleName} module`;

const deployPlatform = (callerEnvironment?: { accountId?: string; region?: string }): void => {
	const sharedStack = new SharedHubInfrastructureStack(app, 'SharedHubStack', {
		stackName: stackName('shared'),
		description: stackDescription('SharedHub'),
		userVpcConfig: useExistingVpc
			? {
					vpcId: userVpcId,
					isolatedSubnetIds: userIsolatedSubnetIds,
					privateSubnetIds: userPrivateSubnetIds,
					publicSubnetIds: userPublicSubnetIds,
			  }
			: undefined,
		deleteBucket,
		env: {
			// The DM_REGION domain variable
			region: process.env?.['DM_REGION'] || callerEnvironment?.region,
			account: callerEnvironment?.accountId,
		},
	});

	if (identityStoreId) {
		const discoveryStack = new DiscoveryStack(app, 'DiscoveryStack', {
			stackName: stackName('discovery'),
			description: stackDescription('Discovery'),
			identityStoreId: identityStoreId,
		});
		discoveryStack.node.addDependency(sharedStack);
	}

	if (samlMetaDataUrl && callbackUrls) {
		const cognitoCustomStack = new CognitoCustomStack(app, 'CognitoCustomStack', {
			stackName: stackName('CognitoCustomStack'),
			description: stackDescription('CognitoCustomStack'),
			ssoRegion,
			samlMetaDataUrl,
			userPoolIdParameter,
			callbackUrls,
		});
		cognitoCustomStack.node.addDependency(sharedStack);

		// Optional requirement for DataLineage
		const openlineageApiMemory = (app.node.tryGetContext('openlineageApiMemory') as number) ?? 8192;
		const openlineageApiCpu = (app.node.tryGetContext('openlineageApiCpu') as number) ?? 2048;
		const openlineageWebMemory = (app.node.tryGetContext('openlineageApiMemory') as number) ?? 2048;
		const openlineageWebCpu = (app.node.tryGetContext('openlineageApiCpu') as number) ?? 512;
		const marquezVersionTag = app.node.tryGetContext('marquezVersionTag') ?? '0.46.0';
		const loadBalancerCertificateArn = getOrThrow(app, 'loadBalancerCertificateArn');

		const dataLineage = new DataLineageStack(app, 'DataLineageStack', {
			stackName: stackName('datalineage'),
			description: stackDescription('DataLineage'),
			openlineageApiCpu,
			openlineageApiMemory,
			openlineageWebCpu,
			openlineageWebMemory,
			marquezVersionTag,
			loadBalancerCertificateArn,
			orgPath: orgPath,
			env: {
				// The DM_REGION domain variable
				region: process.env?.['DM_REGION'] || callerEnvironment?.region,
				account: callerEnvironment?.accountId,
			},
		});
		dataLineage.node.addDependency(sharedStack);

		if (identityStoreRoleArn) {
			const dataAsset = new DataAssetStack(app, 'DataAssetStack', {
				stackName: stackName('dataAsset'),
				description: stackDescription('DataAsset'),
				moduleName: 'dataAsset',
				orgPath: orgPath,
				identityStoreId: identityStoreId,
				identityStoreRoleArn,
				identityStoreRegion,
				taskTimeOutMinutes,
			});
			dataAsset.node.addDependency(sharedStack);
		}
	}

	if (ssoInstanceArn && adminEmail) {
		const ssoCustomStack = new SsoCustomStack(app, 'SsoCustomStack', {
			stackName: stackName('SsoCustomStack'),
			description: stackDescription('SsoCustomStack'),
			ssoInstanceArn,
			ssoRegion,
			adminEmail,
		});
		ssoCustomStack.node.addDependency(sharedStack);
	}
};

const getCallerEnvironment = (): { accountId?: string; region?: string } | undefined => {
	if (!fs.existsSync(`${__dirname}/predeploy.json`)) {
		throw new Error(
			'Pre deployment file does not exist\n' +
				'Make sure you run the cdk using npm script which will run the predeploy script automatically\n' +
				'EXAMPLE\n' +
				'$ npm run cdk deploy -- -e sampleEnvironment'
		);
	}
	const { callerEnvironment } = JSON.parse(fs.readFileSync(`${__dirname}/predeploy.json`, 'utf-8'));
	return callerEnvironment;
};

deployPlatform(getCallerEnvironment());
