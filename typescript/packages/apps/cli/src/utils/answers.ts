/*
 *    Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
 *
 *    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *    with the License. A copy of the License is located at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *    or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *    OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *    and limitations under the License.
 */

import fs from 'fs';
import { GetParameterCommand, PutParameterCommand, DeleteParameterCommand } from '@aws-sdk/client-ssm';
import type { Answers } from '../commands/answers.ts';
import { diContainer } from '../di';
import { switchToICli } from './shell.ts';

const prefix = `/dm/cli/shared/`;
const answersPath = `answers.json`;

const getAnswers = async (): Promise<Record<string, never>> => {
	let answers;
	if (!fs.existsSync(answersPath)) {
		throw new Error('Configuration file does not exists');
	} else {
		answers = JSON.parse(fs.readFileSync(answersPath, { encoding: 'utf8' }));
	}
	return answers;
};

const saveAnswers = async (answers: Answers): Promise<void> => {
	const cradle = diContainer.cradle;
	await switchToICli();

	// Remove the restricted section from the to be saved answers
	delete answers?.restricted;

	// save answers to local cdk folder, this will be used on deployment
	fs.writeFileSync(`${answersPath}`, JSON.stringify(answers));

	// save answers remotely on ssm
	await cradle.ssmClient.send(new PutParameterCommand({ Name: `${prefix}config`, Value: JSON.stringify(answers), Type: 'String', Overwrite: true }));
};

const getSavedAnswers = async (overwriteAnswers?: Answers): Promise<Answers | undefined> => {
	const cradle = diContainer.cradle;

	let response: Answers;
	try {
		const answers = await cradle.ssmClient.send(new GetParameterCommand({ Name: `${prefix}config` }));
		response = JSON.parse(answers.Parameter?.Value!);

		// overwrite saved answers
		if (overwriteAnswers && response) {
			Object.entries(overwriteAnswers).forEach(([key, value]) => {
				(response as any)[key] = value as string | string[] | boolean;
			});
		}
	} catch (error) {
		return undefined;
	}
	return response;
};

const deleteAnswers = async (): Promise<void> => {
	const cradle = diContainer.cradle;

	try {
		await cradle.ssmClient.send(new DeleteParameterCommand({ Name: `${prefix}config` }));
	} catch (error) {
		console.log(JSON.stringify(error));
		return undefined;
	}
};

export { getAnswers, saveAnswers, getSavedAnswers, deleteAnswers };
