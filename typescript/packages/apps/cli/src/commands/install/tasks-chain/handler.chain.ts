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
import type { TasksHandler } from '../../../tasks/base.handler.ts';

export const preDeployTasksHandlerChain = (): TasksHandler => {
	const cliTask = diContainer.cradle.awsCliTasksHandler;

	cliTask
		.setNext(diContainer.cradle.nodeTasksHandler)
		.setNext(diContainer.cradle.npmTasksHandler)
		.setNext(diContainer.cradle.certTasksHandler)
		.setNext(diContainer.cradle.buildTasksHandler)
		.setNext(diContainer.cradle.dockerTasksHandler)
		.setNext(diContainer.cradle.cdkBootstrapTasksHandler)
		.setNext(diContainer.cradle.cdkDemoTasksHandler)
		.setNext(diContainer.cradle.cdkHubTasksHandler);

	return cliTask;
};

export const deployTasksHandlerChain = (): TasksHandler => {
	const hubTask = diContainer.cradle.cdkHubTasksHandler;

	hubTask.setNext(diContainer.cradle.cdkBootstrapTasksHandler).setNext(diContainer.cradle.cdkSpokeTasksHandler);

	return hubTask;
};

export const UserCreationTasksHandlerChain = (): TasksHandler => {
	const userCreationTask = diContainer.cradle.identityStoreTasksHandler;
	return userCreationTask;
};

export const AddProjectMemberTasksHandlerChain = (): TasksHandler => {
	const addProjectMemberTask = diContainer.cradle.cdkDemoTasksHandler;
	return addProjectMemberTask;
};

export const PostDeployTasksHandlerChain = (): TasksHandler => {
	const loginTask = diContainer.cradle.postDeploymentTasksHandler;

	loginTask.setNext(diContainer.cradle.loginTasksHandler);

	return loginTask;
};
