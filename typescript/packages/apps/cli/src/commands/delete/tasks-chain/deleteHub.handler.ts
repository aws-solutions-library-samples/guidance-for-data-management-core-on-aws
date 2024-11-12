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
import { bomb } from '../../../prompts/common.prompts.js';
import type { Answers } from '../../answers.js';
import { TasksHandler } from './base.handler.js';

export class DeleteHubTasksHandler extends TasksHandler {
	protected getMacTasks = (): ListrTask[] => {
		return [
			{
				title: 'Removing hub resources.',
				task: async (ctx: Answers): Promise<void> => {
					await switchToICli();
					await switchToInfrastructureHub();

					const deploy = await $`npm run cdk -- destroy \
-c adminEmail=${ctx.adminEmail} \
-c identityStoreId=${ctx.identityStoreId} \
-c identityStoreRoleArn=${ctx.identityStoreRoleArn} \
-c identityStoreRegion=${ctx.identityStoreRegion} \
-c loadBalancerCertificateArn=${ctx.loadBalancerCertificateArn} \
-c orgId=${ctx.orgId} \
-c orgOuId=${ctx.orgOuId} \
-c orgRootId=${ctx.orgRootId} \
-c ssoInstanceArn=${ctx.identityStoreId} \
-c callbackUrls=${ctx?.callbackUrls ? ctx.callbackUrls : undefined} \
-c samlMetaDataUrl=${ctx?.samlMetaDataUrl ? ctx.samlMetaDataUrl : undefined} \
-c useExistingVpc=${ctx.useExistingVpc} \
-c existingVpcId=${ctx?.existingVpcId ? ctx.existingVpcId : undefined} \
-c existingPublicSubnetIds=${ctx?.existingVpcPublicSubnetIds ? ctx.existingVpcPublicSubnetIds.join(',') : undefined} \
-c existingPrivateSubnetIds=${ctx?.existingVpcPrivateSubnetIds ? ctx.existingVpcPrivateSubnetIds.join(',') : undefined} \
-c existingIsolatedSubnetIds=${ctx?.existingVpcIsolatedSubnetIds ? ctx.existingVpcIsolatedSubnetIds.join(',') : undefined} \
--force --concurrency=10 --all`.quiet();

					if (deploy.exitCode == 1) {
						this.logger.info('Hub deletion failed, please fix underlying issues before retrying');
						bomb('Hub deletion failed, please fix underlying issues before retrying');
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
			title: 'Removing hub resources.',
			task: async (ctx: Answers): Promise<void> => {
				await switchToICli();
				await switchToInfrastructureHub(true);

				const deploy = await $`npm run cdk -- destroy \
-c adminEmail=${ctx.adminEmail} \
-c identityStoreId=${ctx.identityStoreId} \
-c identityStoreRoleArn=${ctx.identityStoreRoleArn} \
-c identityStoreRegion=${ctx.identityStoreRegion} \
-c loadBalancerCertificateArn=${ctx.loadBalancerCertificateArn} \
-c orgId=${ctx.orgId} \
-c orgOuId=${ctx.orgOuId} \
-c orgRootId=${ctx.orgRootId} \
-c ssoInstanceArn=${ctx.identityStoreId} \
-c callbackUrls=${ctx?.callbackUrls ? ctx.callbackUrls : undefined} \
-c samlMetaDataUrl=${ctx?.samlMetaDataUrl ? ctx.samlMetaDataUrl : undefined} \
-c useExistingVpc=${ctx.useExistingVpc} \
-c existingVpcId=${ctx?.existingVpcId ? ctx.existingVpcId : undefined} \
-c existingPublicSubnetIds=${ctx?.existingVpcPublicSubnetIds ? ctx.existingVpcPublicSubnetIds.join(',') : undefined} \
-c existingPrivateSubnetIds=${ctx?.existingVpcPrivateSubnetIds ? ctx.existingVpcPrivateSubnetIds.join(',') : undefined} \
-c existingIsolatedSubnetIds=${ctx?.existingVpcIsolatedSubnetIds ? ctx.existingVpcIsolatedSubnetIds.join(',') : undefined} \
--force --concurrency=10 --all`.quiet();

				if (deploy.exitCode == 1) {
					this.logger.info('Hub deletion failed, please fix underlying issues before retrying');
					bomb('Hub deletion failed, please fix underlying issues before retrying');
				}
			},
		},
	];
}
