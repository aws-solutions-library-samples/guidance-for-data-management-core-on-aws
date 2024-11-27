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

import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { confirm } from '@inquirer/prompts';
import type { Ora } from 'ora';
import { diContainer, updateRegion } from '../../../di.ts';
import { awsRegionSelect, bomb, enterArn, enterEmail } from '../../../prompts/common.prompts.ts';
import type { Answers } from '../../answers.ts';
import { PromptHandler } from '../../../prompts/base.handler.ts';
import { getSavedAnswers, saveAnswers } from '../../../utils/answers.ts';
import { asValue } from 'awilix';

export class StartPromptHandler extends PromptHandler {
	public override async handle(answers: Answers, spinner: Ora): Promise<Answers> {
		const cradle = diContainer.cradle;

		// get saved answers if any exist
		const existingAnswers = await getSavedAnswers(answers);

		if (existingAnswers) {
			answers = existingAnswers;
		}

		// We force the deployment of all the demo stacks unless specified
		answers.deployDemoManagement = true;
		answers.deployDemoHub = true;
		answers.deployDemoSpoke = true;

		let shouldContinue = await confirm({
			message: 'This will deploy Data Management into a single AWS Account. This mode is recommended for evaluating the Data Management only.\n  Continue?',
		});
		if (!shouldContinue) {
			bomb();
		}

		let accountId: string | undefined;
		try {
			const response = await cradle.stsClient.send(new GetCallerIdentityCommand());
			accountId = response.Account!;
		} catch (e) {
			const err = e as Error;
			bomb(`Error retrieving account ID - ${err.message}.`);
		}

		shouldContinue = await confirm({
			message: `Confirm AWS Account Id '${accountId}' ?`,
		});
		if (!shouldContinue) {
			bomb();
		}

		let region = answers?.region ? answers.region : cradle.region;
		shouldContinue = await confirm({
			message: `Confirm AWS Region '${region}'?`,
		});
		if (!shouldContinue) {
			region = await awsRegionSelect();
		}

		//Get the Admin role for management of dataZone projects
		let getAdminRole = await confirm({
			message: `Do you want to use an admin role for ownership of DataZone projects ?`,
		});

		if (getAdminRole) {
			let useExistingRole = false;
			let adminRole: string | undefined = answers?.dataZoneAdminRoleArn;
			if (adminRole) {
				useExistingRole = await confirm({
					message: `Confirm DataZone admin roleArn: '${adminRole}'`,
				});
			}
			if (!useExistingRole) {
				answers.dataZoneAdminRoleArn = await enterArn('Enter the DataZone admin roleArn: ');
			}
		}

		// TODO: in future we need to separate hub , spoke & Identity center accounts
		answers.accountId = accountId;
		answers.IamIdentityCenterAccountId = accountId;
		answers.hubAccountId = accountId;
		answers.spokeAccountId = accountId;

		answers.region = region;
		updateRegion(answers.region);

		// Get Admin Email
		let adminEmail = answers?.adminEmail ? answers.adminEmail : undefined;
		if (adminEmail) {
			shouldContinue = await confirm({
				message: `Confirm Admin Email '${adminEmail}'?`,
			});
		}

		if (!shouldContinue || !adminEmail) {
			adminEmail = await enterEmail('Enter the admin email');
		}

		answers.adminEmail = adminEmail;

		await saveAnswers(answers);

		return super.handle(answers, spinner);
	}
}
