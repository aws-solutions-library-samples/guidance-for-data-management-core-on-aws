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

import {
	DescribeOrganizationCommand,
	ListOrganizationalUnitsForParentCommand,
	ListRootsCommand,
	type OrganizationalUnit,
	type OrganizationsClient,
	type Root,
} from '@aws-sdk/client-organizations';
import { input, select, confirm } from '@inquirer/prompts';
import type { Ora } from 'ora';
import type { BaseLogger } from 'pino';
import { bomb, continueOrAbortConfirm, validateStartsWith } from '../../../prompts/common.prompts.ts';
import type { Answers } from '../../answers.ts';
import { PromptHandler } from '../../../prompts/base.handler.ts';
import { saveAnswers } from '../../../utils/answers.ts';

export class OrganizationPromptHandler extends PromptHandler {
	constructor(private readonly logger: BaseLogger, private readonly organizationsClient: OrganizationsClient) {
		super();
	}
	public override async handle(answers: Answers, spinner: Ora): Promise<Answers> {
		/**
		 * org root
		 * */
		try {
			await this.validateAccount(answers, spinner);
			await this.discoverOrganizationID(answers, spinner);
		} catch (e) {
			const err = e as Error;
			spinner.fail(err.message);
			if (err.name === 'AWSOrganizationsNotInUseException') {
				bomb('Your account is not a member of an organization. Add it to an organization, then resume the install.');
			} else {
				await this.enterOrganizationID(answers);
			}
		}

		/**
		 * org root id
		 * */
		try {
			let confirmOrgRoot = false;
			if (answers?.orgRootId) {
				confirmOrgRoot = await confirm({
					message: `Confirm organization root ID Id '${answers.orgRootId}' ?`,
				});
			}

			if (!confirmOrgRoot || !answers?.orgRootId) {
				await this.discoverOrganizationRootID(answers, spinner);
			}
		} catch (e) {
			spinner.fail((e as Error).message);
			await this.enterOrganizationRootID(answers);
		}

		/**
		 * org ou id
		 * */
		try {
			let confirmOrgUnit = false;
			if (answers?.orgOuId) {
				confirmOrgUnit = await confirm({
					message: `Confirm Organization Unit ID Id '${answers.orgOuId}' ?`,
				});
			}

			if (!confirmOrgUnit || !answers?.orgOuId) {
				await this.discoverOrganizationUnitID(spinner, answers);
			}
		} catch (e) {
			spinner.fail((e as Error).message);
			await this.enterOrganizationUnitID(answers);
		}

		await saveAnswers(answers);

		return super.handle(answers, spinner);
	}

	private async enterOrganizationUnitID(answers: Answers) {
		answers.orgOuId = await input({
			message: 'Enter the organization unit ID (unable to retrieve automatically)',
			validate: (value) => validateStartsWith(value, 'ou-'),
		});
	}

	private async discoverOrganizationUnitID(spinner: Ora, answers: Answers) {
		spinner.start('Retrieving organization unit ID');
		const response = await this.organizationsClient.send(
			new ListOrganizationalUnitsForParentCommand({
				ParentId: answers.orgRootId,
			})
		);
		const orgOus = response.OrganizationalUnits!;
		if (orgOus.length === 0) {
			spinner.succeed('No organizational units found');

			await continueOrAbortConfirm(
				'No organizational units found in the organization root. Shall I create one?',
				'No organizational units found in the organization root. Please create one, then resume the install.'
			);
			answers.createOrgOu = true;
		} else {
			if (orgOus.length === 1) {
				answers.orgOuId = orgOus[0].Id;
				spinner.succeed('Found organization unit ID: ' + answers.orgOuId);
			} else {
				await this.selectOrganizationUnitID(answers, spinner, orgOus);
			}
		}
	}

	private async selectOrganizationUnitID(answers: Answers, spinner: Ora, organizationalUnits: OrganizationalUnit[]) {
		spinner.succeed('Found multiple organization unit IDs');
		answers.orgOuId = await select({
			message: 'Select the organization organizational unit ID',
			choices: organizationalUnits.map((ou) => ({
				name: ou.Name,
				value: ou.Id,
			})),
		});
	}

	private async discoverOrganizationRootID(answers: Answers, spinner: Ora) {
		spinner.start('Retrieving organization root ID');
		const response = await this.organizationsClient.send(new ListRootsCommand());
		this.logger.debug(response);

		if ((response.Roots?.length ?? 0) > 1) {
			await this.selectOrganizationRootID(answers, spinner, response.Roots!);
		} else {
			answers.orgRootId = response.Roots![0].Id;
			spinner.succeed('Found organization root ID: ' + answers.orgRootId);
		}
	}

	private async selectOrganizationRootID(answers: Answers, spinner: Ora, roots: Root[]) {
		spinner.succeed('Found multiple organization root IDs');
		answers.orgRootId = await select({
			message: 'Select the organization root ID',
			choices: roots.map((r) => ({
				name: `${r.Name} (${r.Id})`,
				value: r.Id,
			})),
		});
	}

	private async enterOrganizationRootID(answers: Answers) {
		answers.orgRootId = await input({
			message: 'Enter the organization root ID (unable to retrieve automatically)',
			validate: (value) => validateStartsWith(value, 'r-'),
		});
	}

	private async enterOrganizationID(answers: Answers): Promise<void> {
		answers.orgId = await input({
			message: 'Enter the organization ID (unable to retrieve automatically)',
			validate: (value) => validateStartsWith(value, 'o-'),
		});
	}

	private async discoverOrganizationID(answers: Answers, spinner: Ora): Promise<void> {
		spinner.start('Retrieving organization ID');
		const response = await this.organizationsClient.send(new DescribeOrganizationCommand());
		this.logger.debug(response);
		answers.orgId = response.Organization?.Id!;
		spinner.succeed('Found organization ID: ' + answers.orgId);
	}

	// Validate account is not a member account account
	private async validateAccount(answers: Answers, spinner: Ora): Promise<void> {
		spinner.start('Validating Account');
		try {
			const response = await this.organizationsClient.send(new DescribeOrganizationCommand());
			if (answers.accountId !== response.Organization?.MasterAccountId) {
				spinner.fail('Cannot use an organization member account !\n Please install with a management account');
				bomb();
			} else {
				spinner.succeed('Validated Account ID: ' + answers.accountId);
			}
		} catch (error) {
			spinner.succeed('Validated Account ID: ' + answers.accountId);
		}
	}
}
