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

import { type ListrTask } from 'listr2';
import type { Answers } from '../../answers.js';
import { bomb } from '../../../prompts/common.prompts.js';
import type { Logger } from 'pino';
import { GrantPermissionsCommand, ListResourcesCommand, RegisterResourceCommand, type LakeFormationClient } from '@aws-sdk/client-lakeformation';
import { SimpleTasksHandler } from '../../../tasks/simple.handler.ts';

export class PostDeploymentTasksHandler extends SimpleTasksHandler {
	constructor(public readonly logger: Logger, private readonly lakeFormationClient: LakeFormationClient) {
		super(logger);
	}
	protected installTasks = (): ListrTask[] => [
		{
			title: 'Creating LakeFormation Permissions',
			task: async (answers: Answers): Promise<void> => {
				// Grant permissions to DataZone for the database
				await this.lakeFormationClient.send(
					new GrantPermissionsCommand({
						Principal: { DataLakePrincipalIdentifier: answers.dataZoneGlueAccessRoleArn },
						Resource: {
							Database: {
								CatalogId: answers.spokeAccountId,
								Name: answers.spokeGlueDatabaseName,
							},
						},
						Permissions: ['DESCRIBE'],
						PermissionsWithGrantOption: ['DESCRIBE'],
					})
				);

				// Grant permissions to DataZone for table
				await this.lakeFormationClient.send(
					new GrantPermissionsCommand({
						Principal: { DataLakePrincipalIdentifier: answers.dataZoneGlueAccessRoleArn },
						Resource: {
							Table: {
								CatalogId: answers.spokeAccountId,
								DatabaseName: answers.spokeGlueDatabaseName,
								TableWildcard: {},
							},
						},
						Permissions: ['DESCRIBE', 'SELECT'],
						PermissionsWithGrantOption: ['DESCRIBE', 'SELECT'],
					})
				);

				// Grant permissions to Glue Role for the database
				await this.lakeFormationClient.send(
					new GrantPermissionsCommand({
						Principal: { DataLakePrincipalIdentifier: answers.spokeGlueRoleArn },
						Resource: {
							Database: {
								CatalogId: answers.spokeAccountId,
								Name: answers.spokeGlueDatabaseName,
							},
						},
						Permissions: ['DESCRIBE', 'CREATE_TABLE'],
					})
				);

				// Grant permissions to Glue Role for table
				await this.lakeFormationClient.send(
					new GrantPermissionsCommand({
						Principal: { DataLakePrincipalIdentifier: answers.spokeGlueRoleArn },
						Resource: {
							Table: {
								CatalogId: answers.spokeAccountId,
								DatabaseName: answers.spokeGlueDatabaseName,
								TableWildcard: {},
							},
						},
						Permissions: ['ALTER', 'DESCRIBE', 'INSERT', 'SELECT'],
					})
				);

				/**
				 * Register a location
				 */

				// Check if location exists
				const locationList = await this.lakeFormationClient.send(
					new ListResourcesCommand({ FilterConditionList: [{ Field: 'RESOURCE_ARN', ComparisonOperator: 'EQ', StringValueList: [answers.spokeBucketArn as string] }] })
				);

				if (!answers?.dataZoneDataLakeEnvironmentId) {
					bomb('No DataLake environment found in the DataZone domain.');
				}

				if (locationList.ResourceInfoList?.length == 0) {
					await this.lakeFormationClient.send(
						new RegisterResourceCommand({
							ResourceArn: answers.spokeBucketArn,
							RoleArn: answers.dataZoneGlueAccessRoleArn,
							HybridAccessEnabled: true,
						})
					);
				}

				// Grant dataZone Environment Role permission to S3 locations
				await this.lakeFormationClient.send(
					new GrantPermissionsCommand({
						Principal: { DataLakePrincipalIdentifier: answers.dataZoneDataLakeEnvironmentRoleArn },
						Resource: {
							DataLocation: {
								CatalogId: answers.spokeAccountId,
								ResourceArn: answers.spokeBucketArn,
							},
						},
						Permissions: ['DATA_LOCATION_ACCESS'],
					})
				);

				// Grant Glue Role permission to S3 locations
				await this.lakeFormationClient.send(
					new GrantPermissionsCommand({
						Principal: { DataLakePrincipalIdentifier: answers.spokeGlueRoleArn },
						Resource: {
							DataLocation: {
								CatalogId: answers.accountId,
								ResourceArn: answers.spokeBucketArn,
							},
						},
						Permissions: ['DATA_LOCATION_ACCESS'],
					})
				);

				// Grant dataZone Environment Role permission to S3 locations
				await this.lakeFormationClient.send(
					new GrantPermissionsCommand({
						Principal: { DataLakePrincipalIdentifier: answers.dataZoneDataLakeEnvironmentRoleArn },
						Resource: {
							DataLocation: {
								CatalogId: answers.spokeAccountId,
								ResourceArn: answers.spokeBucketArn,
							},
						},
						Permissions: ['DATA_LOCATION_ACCESS'],
					})
				);

				// Grant Glue Role permission to S3 locations
				await this.lakeFormationClient.send(
					new GrantPermissionsCommand({
						Principal: { DataLakePrincipalIdentifier: answers.spokeGlueRoleArn },
						Resource: {
							DataLocation: {
								CatalogId: answers.accountId,
								ResourceArn: answers.spokeBucketArn,
							},
						},
						Permissions: ['DATA_LOCATION_ACCESS'],
					})
				);
			},
		},
	];
}
