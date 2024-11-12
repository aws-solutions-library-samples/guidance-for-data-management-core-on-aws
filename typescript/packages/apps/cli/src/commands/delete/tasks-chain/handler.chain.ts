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

export const DeleteSpokeTasksHandlerChain = (): TasksHandler => {
	const deleteSpokeTask = diContainer.cradle.deleteSpokeTasksHandler;
	return deleteSpokeTask;
};

export const DeleteHubTasksHandlerChain = (): TasksHandler => {
	const deleteHubTask = diContainer.cradle.deleteHubTasksHandler;
	return deleteHubTask;
};

export const DeleteDemoTasksHandlerChain = (): TasksHandler => {
	const deleteDemoTask = diContainer.cradle.deleteDemoTasksHandler;
	return deleteDemoTask;
};
