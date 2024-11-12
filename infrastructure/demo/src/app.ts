#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';
import { Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DemoHubStack } from './hub/hub.stack.js';
import { DemoSpokeStack } from './spoke/spoke.stack.js';
import { DemoManagementStack } from './management/management.stack.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = new cdk.App();

// tags the entire deployment
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

const stackNamePrefix = `df-demo`;

const stackName = (suffix: string) => `${stackNamePrefix}-${suffix}`;
const stackDescription = (moduleName: string) => `Infrastructure for ${moduleName} module`;

// Management account parameters
const deployManagement = app.node.tryGetContext('deployManagement') as string;

// Hub parameters
const deployHub = app.node.tryGetContext('deployHub') as boolean;
const IdentityStoreAdminUserIdStr = app.node.tryGetContext('IdentityStoreAdminUserId') as string;
const IdentityStoreAdminUserId = IdentityStoreAdminUserIdStr === 'undefined' ? undefined : IdentityStoreAdminUserIdStr;

// Spoke parameters
const deploySpoke = app.node.tryGetContext('deployHub') as boolean;
const vpcId = app.node.tryGetContext('vpcId') as boolean;
const dataZoneDomainIdStr = app.node.tryGetContext('dataZoneDomainId') as string;
const dataZoneDomainId = dataZoneDomainIdStr === 'undefined' ? undefined : dataZoneDomainIdStr;
const dataZoneProjectIdStr = app.node.tryGetContext('dataZoneProjectId') as string;
const dataZoneProjectId = dataZoneProjectIdStr === 'undefined' ? undefined : dataZoneProjectIdStr;

const deployPlatform = (callerEnvironment?: { accountId?: string; region?: string }): void => {
	const env: cdk.Environment = {
		// The DF_REGION domain variable
		region: process.env?.['DF_REGION'] || callerEnvironment?.region,
		account: callerEnvironment?.accountId,
	};

	if (deployHub) {
		const demoHubStack = new DemoHubStack(app, 'DemoHubStack', {
			stackName: stackName('hub'),
			description: stackDescription('demo hub infrastructure'),
			IdentityStoreAdminUserId,
			env,
		});
	}
	if (deploySpoke) {
		const demoSpokeStack = new DemoSpokeStack(app, 'DemoSpokeStack', {
			stackName: stackName('spoke'),
			description: stackDescription('demo spoke infrastructure'),
			dataZoneDomainId,
			dataZoneProjectId,
			env,
		});
	}

	if (deployManagement) {
		const demoManagementStack = new DemoManagementStack(app, 'DemoManagement', {
			stackName: stackName('management'),
			description: stackDescription('demo spoke infrastructure'),
			env,
		});
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
