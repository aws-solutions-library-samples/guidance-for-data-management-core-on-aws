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

import type { Ora } from 'ora';
import type { BaseLogger } from 'pino';
import type { Answers } from '../../answers.ts';
import { PromptHandler } from '../../../prompts/base.handler.ts';
import { deleteAnswers } from '../../../utils/answers.ts';
import { LakeFormationClient, RevokePermissionsCommand, DeregisterResourceCommand } from '@aws-sdk/client-lakeformation';

export class PostDeletePromptHandler extends PromptHandler {
	constructor(private readonly logger: BaseLogger, private readonly lakeFormationClient: LakeFormationClient) {
		super();
	}
	public override async handle(answers: Answers, spinner: Ora): Promise<Answers> {
		//  Cleanup LakeFormation permissions is a best effort task since we dont know what permissions have been granted or not

		if (answers?.dataZoneGlueAccessRoleArn) {
			try {
				spinner.start(`Revoking DataZone LakeFormation Table permissions for DB:${answers.spokeGlueDatabaseName}`);
				// Revoke permissions to DataZone for table
				await this.lakeFormationClient.send(
					new RevokePermissionsCommand({
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
				spinner.succeed();
			} catch {
				spinner.fail(`Principal not found`);
			}

			try {
				spinner.start(`Revoking DataZone LakeFormation Database permissions for DB:${answers.spokeGlueDatabaseName}`);
				// Revoke permissions to DataZone for the database
				await this.lakeFormationClient.send(
					new RevokePermissionsCommand({
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
				spinner.succeed();
			} catch {
				spinner.fail(`Principal not found`);
			}
		}

		if (answers?.spokeGlueRoleArn) {
			try {
				spinner.start(`Revoking  Glue Role table permissions for DB:${answers.spokeGlueDatabaseName}`);
				// Revoke permissions to Glue Role for table
				await this.lakeFormationClient.send(
					new RevokePermissionsCommand({
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
				spinner.succeed();
			} catch {
				spinner.fail(`Principal not found`);
			}

			try {
				spinner.start(`Revoking Glue Role Database permissions for DB:${answers.spokeGlueDatabaseName}`);
				// Revoke permissions to Glue Role for the database
				await this.lakeFormationClient.send(
					new RevokePermissionsCommand({
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
				spinner.succeed();
			} catch {
				spinner.fail(`Principal not found`);
			}

			try {
				spinner.start(`Revoking Glue Role  permissions to S3 location:${answers.spokeBucketName}`);
				// Revoke Glue Role permission to S3 locations
				await this.lakeFormationClient.send(
					new RevokePermissionsCommand({
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
				spinner.succeed();
			} catch {
				spinner.fail(`Principal not found`);
			}
		}

		try {
			spinner.start(`Revoking dataZone Environment permissions to S3 location:${answers.spokeBucketName}`);
			// Revoke dataZone Environment Role permission to S3 locations
			await this.lakeFormationClient.send(
				new RevokePermissionsCommand({
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
			spinner.succeed();
		} catch {
			spinner.fail(`Principal not found`);
		}

		try {
			spinner.start(`Deregister S3 location:${answers.spokeBucketName} from LakeFormation`);
			await this.lakeFormationClient.send(new DeregisterResourceCommand({ ResourceArn: answers.spokeBucketArn }));
			spinner.succeed();
		} catch {
			spinner.fail(`Location not found`);
		}

		await deleteAnswers();
		return super.handle(answers, spinner);
	}
}
