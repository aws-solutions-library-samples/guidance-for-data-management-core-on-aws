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
import { bomb } from '../../../prompts/common.prompts.ts';
import type { Answers } from '../../answers.ts';
import { PromptHandler } from '../../../prompts/base.handler.ts';
import { DataZoneClient, GetIamPortalLoginUrlCommand } from '@aws-sdk/client-datazone';

export class PortalLoginPromptHandler extends PromptHandler {
	constructor(private readonly logger: BaseLogger, private readonly dataZoneClient: DataZoneClient) {
		super();
	}
	public override async handle(answers: Answers, spinner: Ora): Promise<Answers> {
		try {
			await this.process(answers, spinner);
		} catch (e) {
			spinner.fail();
			bomb(JSON.stringify(e));
		}
		return super.handle(answers, spinner);
	}

	private async process(answers: Answers, spinner: Ora) {
		spinner.start('Getting DataZone login Url');

		const resp = await this.dataZoneClient.send(
			new GetIamPortalLoginUrlCommand({
				domainIdentifier: answers.dataZoneDomainId,
			})
		);

		answers.dataZonePortalUrl = resp.authCodeUrl;
		spinner.succeed();
	}
}
