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

import { ListProjectsCommand } from '@aws-sdk/client-datazone';
import { confirm, select } from '@inquirer/prompts';
import type { Ora } from 'ora';
import type { BaseLogger } from 'pino';
import { bomb } from '../../../prompts/common.prompts.ts';
import type { Answers } from '../../answers.ts';
import { PromptHandler } from '../../../prompts/base.handler.ts';
import type { DataZoneClient, ProjectSummary } from '@aws-sdk/client-datazone';

export class DataZoneProjectPromptHandler extends PromptHandler {
	constructor(private readonly logger: BaseLogger, private readonly dataZoneClient: DataZoneClient) {
		super();
	}
	public override async handle(answers: Answers, spinner: Ora): Promise<Answers> {
		try {
			// Only check for DataZone project if a domain is deployed
			if (answers?.dataZoneDomainIsDeployed) {
				await this.discoverDataZoneProjects(answers, spinner);
			}
		} catch (e) {
			spinner.fail((e as Error).message);
			bomb('No project found. Please create a project in your DataZone domain and then resume the install.');
		}
		return super.handle(answers, spinner);
	}

	private async discoverDataZoneProjects(answers: Answers, spinner: Ora) {
		spinner.start('Retrieving DataZone Domain projects');
		const response = await this.dataZoneClient.send(new ListProjectsCommand({ domainIdentifier: answers.dataZoneDomainId }));

		if (response.items?.length === 0) {
			spinner.fail();
			if (!answers.deployDemoHub) {
				// only bomb out if we are not deploying demoHub stack
				bomb(`No projects found in the domain ${answers.dataZoneDomainName}. Please create a project, then resume the install.`);
			} else {
				spinner.fail('No projects found, attempting to deploy DataZone to hub account to fix the issue');
			}
		} else if (response.items?.length === 1) {
			spinner.succeed();
			let useProject = await confirm({
				message: `Confirm DataZone project "${response.items![0].name}" ?`,
			});
			if (!useProject) {
				bomb('Please create a DataZone project, then resume the install.');
			} else {
				answers.dataZoneProjectId = response.items![0].id;
				spinner.succeed('Using DataZone projectId: ' + answers.dataZoneProjectId);
			}
		} else {
			await this.selectProject(answers, spinner, response.items!);
			spinner.succeed('Using DataZone projectId: ' + answers.dataZoneProjectId);
		}
	}

	private async selectProject(answers: Answers, spinner: Ora, projects: ProjectSummary[]) {
		spinner.succeed('Found multiple projects in the domain');
		answers.dataZoneProjectId = await select({
			message: 'Select the project',
			choices: projects.map((i) => ({
				name: i.name,
				value: i.id,
			})),
		});
	}
}
