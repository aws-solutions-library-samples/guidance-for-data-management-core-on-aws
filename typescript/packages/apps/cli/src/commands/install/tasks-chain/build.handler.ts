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
import { switchToICli, switchToInfrastructureHub } from '../../../utils/shell.js';
import type { Answers } from '../../answers.js';
import { TasksHandler } from '../../../tasks/base.handler.ts';

export class BuildTasksHandler extends TasksHandler {
	protected override getLinuxTasks(): ListrTask[] {
		return [
			{
				title: 'Building resources.',
				task: async (ctx: Answers): Promise<void> => {
					await switchToICli();
					await switchToInfrastructureHub();
					await $`rush update`.quiet();
					await $`rush build`.quiet();
				},
			},
		];
	}
	protected override getMacTasks(): ListrTask[] {
		return [
			{
				title: 'Building resources.',
				task: async (ctx: Answers): Promise<void> => {
					await switchToICli();
					await switchToInfrastructureHub();
					await $`rush update`.quiet();
					await $`rush build`.quiet();
				},
			},
		];
	}

	protected override getWindowsTasks(): ListrTask[] {
		return [
			{
				title: 'Building resources.',
				task: async (ctx: Answers): Promise<void> => {
					await switchToInfrastructureHub(true);
					await $`rush update`.quiet();
					await $`rush build`.quiet();
				},
			},
		];
	}
}
