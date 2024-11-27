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
import { switchToICli, switchToInfrastructureDemo } from '../../../utils/shell.js';
import type { Answers } from '../../answers.js';
import { bomb } from '../../../prompts/common.prompts.js';
import { TasksHandler } from '../../../tasks/base.handler.ts';

export class CdkDemoTasksHandler extends TasksHandler {
	protected getMacTasks = (): ListrTask[] => {
		return [
			{
				title: 'Deploying demo resources.',
				task: async (ctx: Answers): Promise<void> => {
					await switchToICli();

					await switchToInfrastructureDemo();
					/**
					 * Due to bun limitation we are forced to pass an undefined value here. bun parser cannot cope with having dynamic parameters like
					 * ${ctx?.IdentityStoreAdminUserId ? '-c IdentityStoreAdminUserId=' + ctx.IdentityStoreAdminUserId : ''}
					 * */
					const deployment = await $`npm run cdk -- deploy \
-c IdentityStoreAdminUserId=${ctx?.IdentityStoreAdminUserId ? ctx.IdentityStoreAdminUserId : undefined} \
-c DataZoneAdminRoleArnStr=${ctx?.dataZoneAdminRoleArn ? ctx.dataZoneAdminRoleArn : undefined} \
-c deployHub=${ctx?.deployDemoHub ? ctx.deployDemoHub : true} \
-c dataZoneDomainId=${ctx?.dataZoneDomainId ? ctx.dataZoneDomainId : undefined} \
-c dataZoneProjectId=${ctx?.dataZoneProjectId ? ctx.dataZoneProjectId : undefined} \
-c deploySpoke=${ctx?.deployDemoSpoke ? ctx.deployDemoSpoke : true} \
-c deployManagement=${ctx?.deployDemoManagement ? ctx.deployDemoManagement : true} \
--require-approval never --concurrency=10 --all`.quiet();
					if (deployment.exitCode == 1) {
						bomb('Demo deployment failed, please fix underlying issues before re-installing');
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
			title: 'Deploying demo resources.',
			task: async (ctx: Answers): Promise<void> => {
				await switchToICli();

				await switchToInfrastructureDemo(true);
				/**
				 * Due to bun limitation we are forced to pass an undefined value here. bun parser cannot cope with having dynamic parameters like
				 * ${ctx?.IdentityStoreAdminUserId ? '-c IdentityStoreAdminUserId=' + ctx.IdentityStoreAdminUserId : ''}
				 * */
				const deployment = await $`npm run cdk -- deploy \
-c IdentityStoreAdminUserId=${ctx?.IdentityStoreAdminUserId ? ctx.IdentityStoreAdminUserId : undefined} \
-c deployHub=${ctx?.deployDemoHub ? ctx.deployDemoHub : true} \
-c dataZoneDomainId=${ctx?.dataZoneDomainId ? ctx.dataZoneDomainId : undefined} \
-c dataZoneProjectId=${ctx?.dataZoneProjectId ? ctx.dataZoneProjectId : undefined} \
-c deploySpoke=${ctx?.deployDemoSpoke ? ctx.deployDemoSpoke : true} \
-c deployManagement=${ctx?.deployDemoManagement ? ctx.deployDemoManagement : true} \
--require-approval never --concurrency=10 --all`.quiet();
				if (deployment.exitCode == 1) {
					bomb('Demo deployment failed, please fix underlying issues before re-installing');
				}
			},
		},
	];
}
