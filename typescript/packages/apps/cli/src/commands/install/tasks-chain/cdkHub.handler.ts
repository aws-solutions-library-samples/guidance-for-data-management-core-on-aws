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
import { bomb } from '../../../prompts/common.prompts.js';
import { TasksHandler } from '../../../tasks/base.handler.ts';

export class CdkHubTasksHandler extends TasksHandler {
	protected getMacTasks = (): ListrTask[] => {
		return [
			{
				title: 'Deploying hub resources.',
				task: async (ctx: Answers): Promise<void> => {
					await switchToICli();
					// const path = await $`pwd`;
					// this.logger.info(`Deploying hub resources > currentPath: ${Buffer.from(path.stdout).toString('utf-8')}`);
					// this.logger.info(`Deploying hub resources > ctx: ${JSON.stringify(ctx)}`);

					await switchToInfrastructureHub();

					const deploy = await $`npm run cdk -- deploy \
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
--require-approval never --concurrency=10 --all`.quiet();

					if (deploy.exitCode == 1) {
						this.logger.info('Hub deployment failed, please fix underlying issues before re-installing');
						bomb('Hub deployment failed, please fix underlying issues before re-installing');
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
			title: 'Deploying hub resources.',
			task: async (ctx: Answers): Promise<void> => {
				await switchToICli();
				await switchToInfrastructureHub(true);

				const deploy = await $`npm run cdk -- deploy \
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
--require-approval never --concurrency=10 --all`.quiet();

				if (deploy.exitCode == 1) {
					this.logger.info('Hub deployment failed, please fix underlying issues before re-installing');
					bomb('Hub deployment failed, please fix underlying issues before re-installing');
				}
			},
		},
	];
}
