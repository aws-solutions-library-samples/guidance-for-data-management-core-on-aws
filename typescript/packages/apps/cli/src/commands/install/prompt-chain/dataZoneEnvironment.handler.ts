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

import { confirm, select } from '@inquirer/prompts';
import type { Ora } from 'ora';
import type { BaseLogger } from 'pino';
import { bomb } from '../../../prompts/common.prompts.ts';
import type { Answers } from '../../answers.ts';
import { PromptHandler } from '../../../prompts/base.handler.ts';
import { type DataZoneClient, type EnvironmentProfileSummary, ListEnvironmentProfilesCommand, ListEnvironmentBlueprintsCommand } from '@aws-sdk/client-datazone';
import { saveAnswers } from '../../../utils/answers.ts';
import { getParameterValue } from '../../../utils/ssm.ts';

export class DataZoneEnvironmentPromptHandler extends PromptHandler {
	constructor(private readonly logger: BaseLogger, private readonly dataZoneClient: DataZoneClient) {
		super();
	}
	public override async handle(answers: Answers, spinner: Ora): Promise<Answers> {
		try {
			// Only check for DataZone environment if a project is deployed
			if (answers?.dataZoneDomainIsDeployed) {
				await this.discoverDataZoneEnvironments(answers, spinner);
				await saveAnswers(answers);
			}
		} catch (e) {
			spinner.fail((e as Error).message);
			bomb('No environment found. Please create a environment, then resume the install.');
		}
		return super.handle(answers, spinner);
	}

	private async discoverDataZoneEnvironments(answers: Answers, spinner: Ora) {
		spinner.start('Retrieving Domain environments');

		const dataLakeBluePrintId = await getParameterValue('hub', 'datazone/dataLakeBluePrintId', 'dm-demo');
		const redshiftBluePrintId = await getParameterValue('hub', 'datazone/redshiftBluePrintId', 'dm-demo');
		const response = await this.dataZoneClient.send(
			new ListEnvironmentProfilesCommand({ domainIdentifier: answers.dataZoneDomainId, projectIdentifier: answers.dataZoneProjectId })
		);

		if (response.items?.length === 0) {
			spinner.fail();
			if (!answers.deployDemoHub) {
				// only bomb out if we are not deploying demoHub stack
				bomb(`No environments found in the domain ${answers.dataZoneDomainName}. Please create a environment, then resume the install.`);
			} else {
				spinner.fail('No environments found, attempting to deploy DataZone to hub account to fix the issue');
			}
		} else {
			const dataLakeItems = response.items?.filter((i) => i.environmentBlueprintId === dataLakeBluePrintId);
			let useDataLakeEnv = false;
			if (answers?.dataZoneDataLakeEnvironmentId) {
				spinner.succeed();
				useDataLakeEnv = await confirm({
					message: `Confirm Lake formation environment "${answers?.dataZoneDataLakeEnvironmentName}" ?`,
				});
			}
			if (!useDataLakeEnv) {
				answers.dataZoneDataLakeEnvironmentId = await this.selectEnvironment(spinner, dataLakeItems!, 'Select the Lake formation environment');
				answers.dataZoneDataLakeEnvironmentName = response.items?.find((i) => i.id == answers.dataZoneDataLakeEnvironmentId)?.name;
			}

			const redshiftItems = response.items?.filter((i) => i.environmentBlueprintId === redshiftBluePrintId);
			let useRedshiftEnv = false;
			if (answers?.dataZoneRedshiftEnvironmentId) {
				spinner.succeed();
				useRedshiftEnv = await confirm({
					message: `Confirm Redshift environment "${answers?.dataZoneRedshiftEnvironmentName}" ?`,
				});
			}
			if (!useRedshiftEnv) {
				answers.dataZoneRedshiftEnvironmentId = await this.selectEnvironment(spinner, redshiftItems!, 'Select the Redshift environment');
				answers.dataZoneRedshiftEnvironmentName = response.items?.find((i) => i.id == answers.dataZoneRedshiftEnvironmentId)?.name;
			}

			spinner.succeed('Completed DataZone environment config');
		}
	}

	private async selectEnvironment(spinner: Ora, environments: EnvironmentProfileSummary[], message: string): Promise<string | undefined> {
		spinner.succeed('Found multiple environments in the domain');
		return await select({
			message,
			choices: environments.map((i) => ({
				name: i.name,
				value: i.id,
			})),
		});
	}
}
