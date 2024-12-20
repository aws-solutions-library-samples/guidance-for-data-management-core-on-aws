#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SharedSpokeInfrastructureStack } from './shared/sharedSpoke.stack.js';
import { DataAssetSpokeStack } from './dataAsset/dataAsset.stack.js';

import { getOrThrow, OrganizationUnitPath, tryGetBooleanContext } from '@dm/cdk-common';
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

//Optional parameters
const deleteBucket = tryGetBooleanContext(app, 'deleteBucket', false);

// Optional parameters to configure the step function 
const taskTimeOutMinutes =  (app.node.tryGetContext('taskTimeOutMinutes')as number ?? 1440);


const stackNamePrefix = `dm-spoke`;

const stackName = (suffix: string) => `${stackNamePrefix}-${suffix}`;
const spokeStackDescription = (moduleName: string, includeGuidanceCode: boolean) => `Infrastructure for ${moduleName} module${includeGuidanceCode ? ' -- Guidance for Data Management on AWS (SO9438).' : '.'}`;

const deploySpoke = (callerEnvironment?: { accountId?: string, region?: string }): void => {

  const shared = new SharedSpokeInfrastructureStack(app, 'SharedSpoke', {
    stackName: stackName('shared'),
    description: spokeStackDescription('Shared', true),
    hubAccountId: hubAccountId,
    orgPath: orgPath,
    deleteBucket,
    env: {
      // The DM_REGION domainId variable
      region: process.env?.['DM_REGION'] || callerEnvironment?.region,
      account: callerEnvironment?.accountId
    },
  });

  const dataAsset = new DataAssetSpokeStack(app, 'DataAssetStack', {
    stackName: stackName('dataAsset'),
    description: spokeStackDescription('DataAsset', false),
    moduleName: 'dataAsset',
    hubAccountId: hubAccountId,
    orgPath: orgPath,
    taskTimeOutMinutes,
    env: {
      // The DM_REGION domainId variable
      region: process.env?.['DM_REGION'] || callerEnvironment?.region,
      account: callerEnvironment?.accountId
    },
  });

  dataAsset.node.addDependency(shared);

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

deploySpoke(getCallerEnvironment());
