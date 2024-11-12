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
import { switchToICli, switchToInfrastructureSpoke } from '../../../utils/shell.js';

import { bomb } from '../../../prompts/common.prompts.js';
import type { Answers } from '../../answers.js';
import { TasksHandler } from './base.handler.js';

export class DeleteSpokeTasksHandler extends TasksHandler {
	protected getMacTasks = (): ListrTask[] => {
		return [
			{
				title: 'Removing spoke resources.',
				task: async (ctx: Answers): Promise<void> => {
					await switchToICli();
					await switchToInfrastructureSpoke();
					const deployment = await $`npm run cdk -- destroy \
-c hubAccountId=${ctx.hubAccountId} \
-c orgId=${ctx.orgId} \
-c orgOuId=${ctx.orgOuId} \
-c orgRootId=${ctx.orgRootId} \
-c deleteBucket=true \
--force --concurrency=10 --all`.quiet();
					if (deployment.exitCode == 1) {
						bomb('Spoke deletion failed, please fix underlying issues before retrying');
					}
				},
			},
		];
	};

	protected getLinuxTasks = (): ListrTask[] => {
		return this.getMacTasks();
	};

	protected getWindowsTasks = (): ListrTask[] => [
		{
			title: 'Removing spoke resources.',
			task: async (ctx: Answers): Promise<void> => {
				await switchToICli();
				await switchToInfrastructureSpoke();
				const deployment = await $`npm run cdk -- destroy \
-c hubAccountId=${ctx.hubAccountId} \
-c orgId=${ctx.orgId} \
-c orgOuId=${ctx.orgOuId} \
-c orgRootId=${ctx.orgRootId} \
-c deleteBucket=true \
--force --concurrency=10 --all`.quiet();
				if (deployment.exitCode == 1) {
					bomb('Spoke deletion failed, please fix underlying issues before retrying');
				}
			},
		},
	];
}
