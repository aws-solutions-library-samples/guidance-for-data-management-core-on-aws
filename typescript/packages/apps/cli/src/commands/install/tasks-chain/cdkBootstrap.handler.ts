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

import { $ } from 'bun';
import { type ListrTask } from 'listr2';
import type { Answers } from '../../answers.js';
import { SimpleTasksHandler } from '../../../tasks/simple.handler.ts';
import { switchToICli } from '../../../utils/shell.js';

export class CdkBootstrapTasksHandler extends SimpleTasksHandler {
	protected installTasks = (): ListrTask[] => [
		{
			title: 'Bootstrapping CDK.',
			task: async (ctx: Answers): Promise<void> => {
				await switchToICli();

				const deployment = await $`npm run cdk -- bootstrap aws://${ctx.accountId}/${ctx.region}`.quiet();

				if (deployment.exitCode == 1) {
					this.logger.info('Bootstrapping failed, please fix underlying issues before re-installing');
					throw new Error('CDK Bootstrapping failed, please fix underlying issues before re-installing');
				}
			},
		},
	];
}
