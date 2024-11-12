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

import { confirm, input, select } from '@inquirer/prompts';
import type { Ora } from 'ora';
import type { BaseLogger } from 'pino';
import { bomb, validateStartsWith } from '../../../prompts/common.prompts.ts';
import type { Answers } from '../../answers.ts';
import { PromptHandler } from '../../../prompts/base.handler.ts';
import { ListDomainsCommand, DataZoneClient, DomainStatus, type DomainSummary, GetDomainCommand } from '@aws-sdk/client-datazone';

export class DataZonePromptHandler extends PromptHandler {
	constructor(private readonly logger: BaseLogger, private readonly dataZoneClient: DataZoneClient) {
		super();
	}
	public override async handle(answers: Answers, spinner: Ora): Promise<Answers> {
		/**
		 * IAM identity Center application
		 */
		try {
			await this.discoverDomain(answers, spinner);
		} catch (e) {
			spinner.fail((e as Error).message);
			// await this.enterDomainID(answers);
		}
		return super.handle(answers, spinner);
	}

	private async discoverDomain(answers: Answers, spinner: Ora) {
		spinner.start('Retrieving DataZone Domains');
		const response = await this.dataZoneClient.send(new ListDomainsCommand());

		if (response.items?.length === 0) {
			spinner.fail();
			let shouldContinue = await confirm({
				message: 'No DataZone domain found. \n  Do you want to create one?',
			});
			if (!shouldContinue) {
				bomb('No DataZone domain found. Please create a domain, then resume the install.');
			} else {
				answers.deployDemoHub = true;
				answers.dataZoneDomainIsDeployed = false;
				spinner.succeed('Will attempt to create a new DataZone domain');
			}
		} else if (response.items?.length === 1) {
			spinner.succeed();

			let useDomain = await confirm({
				message: `confirm DataZone Domain "${response.items![0].name}" ?`,
			});
			if (!useDomain) {
				bomb('No DataZone domain found. Please create a domain, then resume the install.');
			} else {
				answers.dataZoneDomainId = response.items![0].id;
				answers.dataZoneDomainName = response.items![0].name;
				answers.dataZoneDomainDescription = response.items![0].description;
				answers.dataZoneDomainIsDeployed = true;
				spinner.succeed('Found DataZone Domain: ' + answers.dataZoneDomainName);
			}
		} else {
			await this.selectDomain(answers, spinner, response.items!);
		}

		if (answers?.dataZoneDomainId) {
			await this.validateDomainStatus(answers, spinner);
			spinner.succeed('Using DataZone Domain: ' + answers.dataZoneDomainName);
		}

		// We check if we are using the default df-demo domain by comparing the description. if not we will not deploy
		if (answers?.dataZoneDomainDescription !== 'df-demo:Data Fabric') {
			answers.deployDemoHub = false;
		}
	}

	private async enterDomainID(answers: Answers) {
		answers.dataZoneDomainId = await input({
			message: 'Enter the DataZone domain ID (unable to retrieve automatically)',
			validate: (value) => validateStartsWith(value, 'd-'),
		});
	}

	private async selectDomain(answers: Answers, spinner: Ora, domains: DomainSummary[]) {
		spinner.succeed('Found multiple DataZone domains');
		answers.dataZoneDomainId = await select({
			message: 'Select the DataZone domain',
			choices: domains.map((i) => ({
				name: i.name,
				value: i.id,
			})),
		});
	}

	private async validateDomainStatus(answers: Answers, spinner: Ora): Promise<string> {
		spinner.start('Validating DataZone Domain Status');

		let status: DomainStatus | undefined = undefined;
		let response;
		while (status !== 'AVAILABLE' && status !== 'CREATION_FAILED' && status !== 'DELETED') {
			// Wait for 3 seconds
			await Bun.sleepSync(3000);
			response = await this.dataZoneClient.send(new GetDomainCommand({ identifier: answers.dataZoneDomainId }));
			status = response.status;
		}

		if (status === 'CREATION_FAILED' || status === 'DELETED' || !response) {
			spinner.fail('Failed to validate the DataZone Domain');
		}

		answers.dataZoneDomainName = response?.name;
		answers.dataZoneDomainDescription = response?.description;

		spinner.succeed('DataZone Domain with ID: ' + answers.dataZoneDomainId + 'is ready');

		return answers.dataZoneDomainName as string;
	}
}
