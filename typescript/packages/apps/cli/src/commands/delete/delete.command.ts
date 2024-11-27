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

import { Listr } from 'listr2';
import ora from 'ora';
import type { Answers } from '../answers.ts';
import { deleteHandlerChain, postDeleteHandlerChain } from './prompt-chain/handler.chain.ts';
import { DeleteDemoTasksHandlerChain, DeleteHubTasksHandlerChain, DeleteSpokeTasksHandlerChain } from './tasks-chain/handler.chain.ts';

const command = 'delete';

const describe = 'delete Data Management from a single AWS Account.';

const handler = async () => {
	const spinner = ora({ discardStdin: false });

	// collect the answers we need
	let answers: Answers = {};
	const deleteChain = deleteHandlerChain();
	answers = await deleteChain.handle(answers, spinner);

	if (answers?.deleteSpoke) {
		const deleteSpokeTasks = new Listr<Answers>([]);
		await DeleteSpokeTasksHandlerChain().handle(deleteSpokeTasks);
		await deleteSpokeTasks.run(answers);
	}

	if (answers?.deleteHub) {
		const deleteHubTasks = new Listr<Answers>([]);
		await DeleteHubTasksHandlerChain().handle(deleteHubTasks);
		await deleteHubTasks.run(answers);
	}

	if (answers?.deleteDemo) {
		const deleteDemoTasks = new Listr<Answers>([]);
		await DeleteDemoTasksHandlerChain().handle(deleteDemoTasks);
		await deleteDemoTasks.run(answers);
	}

	const postDeleteChain = postDeleteHandlerChain();
	answers = await postDeleteChain.handle(answers, spinner);
};

export { command, describe, handler };
