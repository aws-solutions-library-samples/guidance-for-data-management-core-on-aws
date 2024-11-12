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
import { DescribeStatementCommand, ExecuteStatementCommand, RedshiftDataClient, StatusString } from '@aws-sdk/client-redshift-data';
import pWaitFor from 'p-wait-for';
import { tableDefinitions } from '../assets/tables.js';

export type CreateSchemaProperties = {
	readonly id: string;
	readonly databaseName: string;
	readonly workgroupName: string;
	readonly schemaName: string;
	readonly secretArn: string;
};

export type ResourcePropertiesType = CreateSchemaProperties & {
	readonly ServiceToken: string;
	readonly schemaName: string;
};

export type RedshiftConnectionContext = Pick<ResourcePropertiesType, 'workgroupName' | 'databaseName' | 'schemaName' | 'secretArn'>;

const dataClient = new RedshiftDataClient();
export const handler: CdkCustomResourceHandler = async (event) => {
	logger.info(`handler > start event : ${JSON.stringify(event)}`);
	const response: CdkCustomResourceResponse = {
		PhysicalResourceId: event.PhysicalResourceId,
		Data: {},
		Status: 'SUCCESS',
	};

	const requestType = event.RequestType;
	try {
		logger.info('RequestType: ' + requestType);
		if (requestType === 'Create' || requestType === 'Update') {
			response.Data = await onCreate(event);
		}

		if (requestType === 'Delete') {
			await onDelete();
		}
	} catch (e) {
		if (e instanceof Error) {
			logger.error('Error when creating database and schema in redshift', e);
		}
		throw e;
	}
	logger.info(`handler > exit response: ${JSON.stringify(response)}`);
	return response;
};

async function createSchema(context: RedshiftConnectionContext): Promise<void> {
	const executeStatementResponse = await dataClient.send(
		new ExecuteStatementCommand({
			WorkgroupName: context.workgroupName,
			Database: context.databaseName,
			SecretArn: context.secretArn,
			Sql: `CREATE SCHEMA ${context.schemaName}`,
		})
	);

	let resp;
	await pWaitFor(async () => {
		const describeStatementResponse = await dataClient.send(
			new DescribeStatementCommand({
				Id: executeStatementResponse.Id,
			})
		);
		resp = describeStatementResponse;
		return [StatusString.ABORTED, StatusString.FAILED, StatusString.FINISHED].includes(describeStatementResponse.Status as any);
	});
	logger.info(`createSchema > exit Query response : ${JSON.stringify(resp)}`);
}

async function createTable(context: RedshiftConnectionContext, tableSchema: string): Promise<void> {
	logger.info(`createTable > start tableSchema: ${tableSchema}`);
	tableSchema = tableSchema.replace('schemaName', context.schemaName);
	const executeStatementResponse = await dataClient.send(
		new ExecuteStatementCommand({
			WorkgroupName: context.workgroupName,
			Database: context.databaseName,
			SecretArn: context.secretArn,
			Sql: tableSchema,
		})
	);
	let resp;
	await pWaitFor(async () => {
		const describeStatementResponse = await dataClient.send(
			new DescribeStatementCommand({
				Id: executeStatementResponse.Id,
			})
		);
		resp = describeStatementResponse;
		return [StatusString.ABORTED, StatusString.FAILED, StatusString.FINISHED].includes(describeStatementResponse.Status as any);
	});
	logger.info(`createTable > exit Query response : ${JSON.stringify(resp)}`);
}

async function onCreate(event: CdkCustomResourceEvent): Promise<{ schemaName: string }> {
	logger.info('onCreate> start');
	const props = event.ResourceProperties as ResourcePropertiesType;
	try {
		const { databaseName, workgroupName, schemaName, secretArn } = props;

		// Create the Database schema if it does not exist
		// Create live Schema
		await createSchema({ databaseName, workgroupName, schemaName, secretArn });

		// Create the database tables
		for (const table of tableDefinitions) {
			// Create live table
			await createTable({ databaseName, workgroupName, schemaName, secretArn }, table.schema);
		}
		logger.info(`onCreate> exit schemaName:${schemaName}`);
		return { schemaName };
	} catch (err) {
		if (err instanceof Error) {
			logger.error('Error when creating database in serverless Redshift.', err);
		}
		throw err;
	}
}

async function onDelete() {
	// do nothing
}
