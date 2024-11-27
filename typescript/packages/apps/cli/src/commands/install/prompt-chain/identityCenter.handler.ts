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

import { ListInstancesCommand, type InstanceMetadata, type SSOAdminClient, CreateInstanceCommand } from '@aws-sdk/client-sso-admin';

import { confirm, input, select } from '@inquirer/prompts';
import type { Ora } from 'ora';
import type { BaseLogger } from 'pino';
import { bomb, validateStartsWith } from '../../../prompts/common.prompts.ts';
import type { Answers } from '../../answers.ts';
import { PromptHandler } from '../../../prompts/base.handler.ts';

export class IdentityCenterPromptHandler extends PromptHandler {
	constructor(private readonly logger: BaseLogger, private readonly ssoAdminClient: SSOAdminClient) {
		super();
	}
	public override async handle(answers: Answers, spinner: Ora): Promise<Answers> {
		answers.identityStoreRegion = answers.region;
		answers.ssoRegion = answers.region;

		/**
		 * identity store id
		 */
		try {
			await this.discoverIdentityInstanceID(answers, spinner);
		} catch (e) {
			spinner.fail((e as Error).message);
			await this.enterIdentityInstanceID(answers);
		}

		/**
		 * Note: `answers.identityStoreRoleArn` is available once infrastructure-demo is deployed
		 */

		return super.handle(answers, spinner);
	}

	private async discoverIdentityInstanceID(answers: Answers, spinner: Ora) {
		spinner.start('Retrieving identity instance ID');
		const response = await this.ssoAdminClient.send(new ListInstancesCommand());

		if (response.Instances?.length === 0) {
			spinner.fail();
			bomb('No identity instance found. Please enable IAM Identity Store, then resume the install.');
		} else if (response.Instances?.length === 1) {
			answers.identityStoreId = response.Instances![0].IdentityStoreId;
			spinner.succeed('Found identity instance ID: ' + answers.identityStoreId);
		} else {
			await this.selectIdentityInstanceID(answers, spinner, response.Instances!);
		}
		spinner.succeed('Found identity instance ID: ' + answers.identityStoreId);
	}

	private async enterIdentityInstanceID(answers: Answers) {
		answers.orgId = await input({
			message: 'Enter the IAM Identity Store ID (unable to retrieve automatically)',
			validate: (value) => validateStartsWith(value, 'd-'),
		});
	}

	private async selectIdentityInstanceID(answers: Answers, spinner: Ora, instances: InstanceMetadata[]) {
		spinner.succeed('Found multiple identity instance IDs');
		answers.identityStoreId = await select({
			message: 'Select the identity instance ID',
			choices: instances.map((i) => ({
				name: i.IdentityStoreId,
				value: i.IdentityStoreId,
			})),
		});
	}

	// Datazone has recently released support for IAM Identity center account instances this is meant for testing this feature
	private async createIdentityInstance(answers: Answers, spinner: Ora): Promise<string> {
		spinner.start('Creating the identity instance');

		const instanceId = await this.ssoAdminClient.send(new CreateInstanceCommand({ Name: 'dm-instance' }));
		answers.identityStoreId = instanceId.InstanceArn;
		spinner.succeed('Created identity instance with ID: ' + instanceId.InstanceArn);

		return instanceId.InstanceArn as string;
	}
}
