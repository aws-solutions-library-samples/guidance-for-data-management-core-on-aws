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
import { preDeployPromptHandlerChain, deployPromptHandlerChain, postDeploymentPromptHandlerChain } from './prompt-chain/handler.chain.ts';
import { preDeployTasksHandlerChain, deployTasksHandlerChain, PostDeployTasksHandlerChain } from './tasks-chain/handler.chain.ts';

const command = 'install';

const describe = 'Installs Data Fabric for evaluation within a single AWS Account.';

const handler = async () => {
	const spinner = ora({ discardStdin: false });

	// collect the answers we need
	let answers: Answers = {};
	const preDeployPromptChain = preDeployPromptHandlerChain();
	answers = await preDeployPromptChain.handle(answers, spinner);

	/**
	 * Run the pre deployment step which includes:
	 * 1- installing demo stack which installs  the resources needed for the management,hub and spoke accounts
	 * 2- installing permissions on the management account
	 * 3- creating a dataZone domain and environment in the hub account
	 * 4- creating lakeformation permissions in the spoke account
	 * 5- installing hub shared stack
	 */

	const preDeployTasks = new Listr<Answers>([]);
	await preDeployTasksHandlerChain().handle(preDeployTasks);
	await preDeployTasks.run(answers);

	// Get the hub configuration needed

	const deployPromptChain = deployPromptHandlerChain();
	answers = await deployPromptChain.handle(answers, spinner);

	/**
	 * 1- Redeploy the hub stack
	 * 2- Deploy the spoke stack
	 */

	const deployTasks = new Listr<Answers>([]);
	await deployTasksHandlerChain().handle(deployTasks);
	await deployTasks.run(answers);

	/**
	 * Post deployment
	 * 1- Setup Lake Formation permissions
	 * 2- login user to datazone portal
	 */

	const postDeployPromptChain = postDeploymentPromptHandlerChain();
	answers = await postDeployPromptChain.handle(answers, spinner);

	const postDeploymentTask = new Listr<Answers>([]);
	await PostDeployTasksHandlerChain().handle(postDeploymentTask);
	await postDeploymentTask.run(answers);
};

export { command, describe, handler };
