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
import { TasksHandler } from '../../../tasks/base.handler.ts';
import type { Answers } from '../../answers.js';

export class LoginTasksHandler extends TasksHandler {
	private nonWindowsTasks = [
		{
			title: 'Logging in user.',
			task: async (ctx: Answers): Promise<void> => {
				await $`echo ${ctx.dataZonePortalUrl}`.quiet();
				await $`open ${ctx.dataZonePortalUrl}`.quiet();
			},
		},
	];

	private windowsTasks = [
		{
			title: 'Logging in user.',
			task: async (ctx: Answers): Promise<void> => {
				await $`start ${ctx.dataZonePortalUrl}`.quiet();
			},
		},
	];

	protected override getLinuxTasks(): ListrTask[] {
		return this.nonWindowsTasks;
	}

	protected override getMacTasks(): ListrTask[] {
		return this.nonWindowsTasks;
	}

	protected override getWindowsTasks(): ListrTask[] {
		return this.windowsTasks;
	}
}
