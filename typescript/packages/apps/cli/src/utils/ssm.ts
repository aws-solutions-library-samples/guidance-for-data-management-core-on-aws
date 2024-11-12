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

import { GetParameterCommand } from '@aws-sdk/client-ssm';
import { diContainer } from '../di.ts';

const getParameterValue = async (module: string, name: string, project?: string): Promise<string | undefined> => {
	const key = `/${project ? project : 'df'}/${module}/${name}`;

	const cradle = diContainer.cradle;

	let response: string;
	try {
		const answers = await cradle.ssmClient.send(new GetParameterCommand({ Name: key }));
		response = answers.Parameter?.Value!;
	} catch (error) {
		console.log(`getParameterValue error: ${JSON.stringify(error)}`);
		return undefined;
	}
	return response;
};

export { getParameterValue };
