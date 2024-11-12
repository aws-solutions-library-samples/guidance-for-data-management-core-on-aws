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
import { diContainer } from '../../../di.ts';
import { awsRegionSelect, bomb } from '../../../prompts/common.prompts.ts';
import { PromptHandler } from '../../../prompts/base.handler.ts';
import type { Answers } from '../../answers.ts';
import { getSavedAnswers } from '../../../utils/answers.ts';

export class StartPromptHandler extends PromptHandler {
	public override async handle(answers: Answers, spinner: Ora): Promise<Answers> {
		const cradle = diContainer.cradle;

		// get saved answers if any exist
		const existingAnswers = await getSavedAnswers(answers);

		if (existingAnswers) {
			answers = existingAnswers;
		}

		// We force the deployment of all the demo stacks unless specified
		answers.deleteDemo = true;
		answers.deleteSpoke = true;
		answers.deleteHub = true;

		let shouldContinue = await confirm({
			message: 'This will delete Data Fabric from your account, Continue?',
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

		answers.deleteSpoke = await confirm({
			message: `Confirm deletion of spoke resource' ?`,
		});

		answers.deleteHub = await confirm({
			message: `Confirm deletion of hub resource' ?`,
		});

		answers.deleteDemo = await confirm({
			message: `Confirm deletion of demo resource' ?`,
		});

		// TODO: in future we need to separate hub , spoke & Identity center accounts
		answers.accountId = accountId;
		answers.IamIdentityCenterAccountId = accountId;
		answers.hubAccountId = accountId;
		answers.spokeAccountId = accountId;

		return super.handle(answers, spinner);
	}
}
