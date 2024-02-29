#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AccessManagementStack } from './accessManagement/accessManagement.stack.js';
import { DataAssetStack } from './dataAsset/dataAsset.stack.js';

import { getOrThrow, OrganizationUnitPath } from '@df/cdk-common';
import * as fs from 'fs';
import path from "path";
import { fileURLToPath } from "url";

import { AwsSolutionsChecks } from 'cdk-nag';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = new cdk.App();

// mandatory parameters
const hubAccountId = getOrThrow(app, 'hubAccountId');

// mandatory (for now) AWS Organizations parameters
const orgId = getOrThrow(app, 'orgId');
const orgRootId = getOrThrow(app, 'orgRootId');
const orgOuId = getOrThrow(app, 'orgOuId');
const orgPath: OrganizationUnitPath = {
    orgId,
    rootId: orgRootId,
    ouId: orgOuId
};


const stackNamePrefix = `df-shared`;

const stackName = (suffix: string) => `${stackNamePrefix}-${suffix}`;
const platformStackDescription = (moduleName: string) => `Infrastructure for ${moduleName} module`;

const deployPlatform = (callerEnvironment?: { accountId?: string, region?: string }): void => {

  new AccessManagementStack(app, 'AccessManagementStack', {
      stackName: stackName('accessManagement'),
      description: platformStackDescription('AccessManagement'),
      hubAccountId: hubAccountId,
      env: {
        // The DF_REGION domainId variable
        region: process.env?.['DF_REGION'] || callerEnvironment?.region,
        account: callerEnvironment?.accountId
      },
  });

  new DataAssetStack(app, 'DataAssetStack', {
    stackName: stackName('dataAsset'),
    description: platformStackDescription('DataAsset'),
    moduleName: 'dataAsset',
    hubAccountId: hubAccountId,
    orgPath: orgPath,
    env: {
      // The DF_REGION domainId variable
      region: process.env?.['DF_REGION'] || callerEnvironment?.region,
      account: callerEnvironment?.accountId
    },
  });

  // tags the entire platform with cost allocation tags
  cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

};

const getCallerEnvironment = (): { accountId?: string, region?: string } | undefined => {
	if (!fs.existsSync(`${__dirname}/predeploy.json`)) {
		throw new Error('Pre deployment file does not exist\n' +
			'Make sure you run the cdk using npm script which will run the predeploy script automatically\n' +
			'EXAMPLE\n' +
			'$ npm run cdk deploy -- -e sampleEnvironment');
	}
	const { callerEnvironment } = JSON.parse(fs.readFileSync(`${__dirname}/predeploy.json`, 'utf-8'));
	return callerEnvironment;
};

deployPlatform(getCallerEnvironment());