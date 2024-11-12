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
import { bomb, enterEmail } from '../../../prompts/common.prompts.ts';
import type { Answers } from '../../answers.ts';
import { PromptHandler } from '../../../prompts/base.handler.ts';
import { input } from '@inquirer/prompts';

export class IdentityStorePromptHandler extends PromptHandler {
	constructor(private readonly logger: BaseLogger) {
		super();
	}
	public override async handle(answers: Answers, spinner: Ora): Promise<Answers> {
		try {
			await this.process(answers, spinner);
		} catch (e) {
			// spinner.fail();
			bomb();
		}
		return super.handle(answers, spinner);
	}

	private async process(answers: Answers, spinner: Ora) {
		answers.restricted = { user: {} };
		// Create the user
		answers.restricted.user.userName = await input({
			message: 'enter a unique username for the user',
		});

		answers.restricted.user.email = await enterEmail('enter the user Email');

		answers.restricted.user.displayName = await input({
			message: 'enter a display name for the user',
		});

		answers.restricted.user.firstName = await input({
			message: 'enter first name for the user',
		});

		answers.restricted.user.lastName = await input({
			message: 'enter last name for the user',
		});
	}
}
