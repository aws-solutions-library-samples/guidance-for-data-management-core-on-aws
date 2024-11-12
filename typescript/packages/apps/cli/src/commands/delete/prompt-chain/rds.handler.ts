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

import { confirm } from '@inquirer/prompts';
import type { Ora } from 'ora';
import { diContainer } from '../../../di.ts';
import { bomb } from '../../../prompts/common.prompts.ts';
import { PromptHandler } from '../../../prompts/base.handler.ts';
import type { Answers } from '../../answers.ts';
import { RDSClient, ModifyDBClusterCommand } from '@aws-sdk/client-rds';
import type { BaseLogger } from 'pino';
import { getParameterValue } from '../../../utils/ssm.ts';

export class RDSPromptHandler extends PromptHandler {
	constructor(private readonly logger: BaseLogger, private readonly rdsClient: RDSClient) {
		super();
	}
	public override async handle(answers: Answers, spinner: Ora): Promise<Answers> {
		if (answers.deleteHub) {
			const rdsClusterId = (answers.identityStoreRoleArn = await getParameterValue('dataLineage', 'aurora/rdsClusterId'));

			let shouldContinue = await confirm({
				message: `Delete the RDS database ${rdsClusterId} for data Lineage ?`,
			});
			if (!shouldContinue) {
				bomb(`Hub resources cannot be removed.\n RDS database delete protection must be disabled in order to continue with the deletion of the hub stacks`);
			}

			spinner.start(`Disabling delete protection for ${rdsClusterId} cluster`);

			this.rdsClient.send(new ModifyDBClusterCommand({ DBClusterIdentifier: rdsClusterId, DeletionProtection: false, ApplyImmediately: true }));
			spinner.succeed();
		}

		return super.handle(answers, spinner);
	}
}
