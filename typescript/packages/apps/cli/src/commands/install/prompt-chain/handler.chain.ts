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

import { diContainer } from '../../../di.ts';
import type { PromptHandler } from '../../../prompts/base.handler.ts';

export const preDeployPromptHandlerChain = (): PromptHandler => {
	const startHandler = diContainer.cradle.startPromptHandler;

	startHandler
		.setNext(diContainer.cradle.organizationPromptHandler)
		.setNext(diContainer.cradle.vpcPromptHandler)
		.setNext(diContainer.cradle.identityCenterPromptHandler)
		.setNext(diContainer.cradle.dataZonePromptHandler);

	return startHandler;
};

export const deployPromptHandlerChain = (): PromptHandler => {
	const configureHubHandler = diContainer.cradle.configureHubPromptHandler;

	configureHubHandler.setNext(diContainer.cradle.dataZoneProjectPromptHandler).setNext(diContainer.cradle.dataZoneEnvironmentPromptHandler);

	return configureHubHandler;
};

export const postDeploymentPromptHandlerChain = (): PromptHandler => {
	const postDeploymentPromptHandler = diContainer.cradle.postDeploymentPromptHandler;

	postDeploymentPromptHandler.setNext(diContainer.cradle.identityStorePromptHandler).setNext(diContainer.cradle.portalLoginPromptHandler);

	return postDeploymentPromptHandler;
};
