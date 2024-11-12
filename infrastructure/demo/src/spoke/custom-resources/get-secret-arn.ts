/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import { CdkCustomResourceEvent, CdkCustomResourceHandler, CdkCustomResourceResponse } from 'aws-lambda';
import { logger } from './logger.js';
import { GetNamespaceCommand, RedshiftServerlessClient } from '@aws-sdk/client-redshift-serverless';
import { TagResourceCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

export type GetSecretArnProperties = {
	readonly namespaceName: string;
};

export type ResourcePropertiesType = GetSecretArnProperties & {
	readonly ServiceToken: string;
	readonly dataZoneDomainId: string;
	readonly dataZoneProjectId: string;
};

export const handler: CdkCustomResourceHandler = async (event) => {
	const response: CdkCustomResourceResponse = {
		PhysicalResourceId: 'create-redshift-kpi-custom-resource',
		Data: {},
		Status: 'SUCCESS',
	};

	try {
		if (event.RequestType === 'Create' || event.RequestType === 'Update') {
			response.Data['AdminSecretArn'] = await onCreate(event);
		}

		if (event.RequestType === 'Delete') {
			await onDelete();
		}
	} catch (e) {
		if (e instanceof Error) {
			logger.error('Error when creating materialized views in redshift', e);
		}
		throw e;
	}
	return response;
};

async function getRedshiftSecretArn(namespace: string, dataZoneDomainId: string, dataZoneProjectId: string): Promise<string> {
	logger.info(`getRedshiftSecretArn > namespace:${namespace}, dataZoneDomainId:${dataZoneDomainId}, dataZoneProjectId:${dataZoneProjectId}`);
	const redshiftServerlessClient = new RedshiftServerlessClient();
	const response = await redshiftServerlessClient.send(new GetNamespaceCommand({ namespaceName: namespace }));

	// Add datazone tags to the secret
	const smClient = new SecretsManagerClient();
	await smClient.send(
		new TagResourceCommand({
			SecretId: response.namespace.adminPasswordSecretArn,
			Tags: [
				{
					Key: 'AmazonDataZoneDomain',
					Value: dataZoneDomainId,
				},
				{
					Key: 'AmazonDataZoneProject',
					Value: dataZoneProjectId,
				},
			],
		})
	);
	return response.namespace.adminPasswordSecretArn;
}

async function onCreate(event: CdkCustomResourceEvent): Promise<string> {
	logger.info('onCreate()');
	const props = event.ResourceProperties as ResourcePropertiesType;
	try {
		return await getRedshiftSecretArn(props?.namespaceName, props.dataZoneDomainId, props.dataZoneProjectId);
	} catch (err) {
		if (err instanceof Error) {
			logger.error('Error getting secret arn from serverless Redshift.', err);
		}
		throw err;
	}
}

async function onDelete(): Promise<void> {}
