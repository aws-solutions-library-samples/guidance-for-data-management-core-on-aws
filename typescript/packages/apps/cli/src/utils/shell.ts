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

import path from 'path';
import shell from 'shelljs';
import { fileURLToPath } from 'url';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type Folder = string;

const switchTo = async (packageName: string, isWindows?: boolean): Promise<Folder> => {
	let workspaceLocation = config.get('path') as string;
	if (!workspaceLocation) {
		workspaceLocation = path.join(__dirname, '../../../../../../');
	}

	// Due to an issue in rushlib where it mistakenly uses the env variables of bun We have to use a node script to run rush-lib commands
	let result;
	let pwd;
	if (!isWindows) {
		result = await shell.exec(`./src/scripts/getModulePath.js ${packageName} ${workspaceLocation}`);
	} else {
		//Remove the last '\' from workSpace location
		pwd = await shell.pwd();
		workspaceLocation = `"${workspaceLocation.replace(/\\(?=[^\\]*$)/, '')}"`;
		result = await shell.exec(`node ./src/scripts/getModulePath.js ${packageName} ${workspaceLocation}`);
	}

	if (result?.code && result.code == 1 && !isWindows) {
		throw new Error(`Module ${packageName} does not exist in workspace: ${workspaceLocation}`);
	}

	let projectFolder;
	if (!isWindows) {
		projectFolder = result.stdout;
	} else {
		projectFolder = result;
	}

	await shell.cd(projectFolder);
	return projectFolder;
};

const switchToInfrastructureHub = async (isWindows?: boolean): Promise<Folder> => {
	return switchTo('@df/infrastructure-hub', isWindows);
};

const switchToInfrastructureSpoke = async (isWindows?: boolean): Promise<Folder> => {
	return switchTo('@df/infrastructure-spoke', isWindows);
};

const switchToInfrastructureDemo = async (isWindows?: boolean): Promise<Folder> => {
	return switchTo('@df/infrastructure-demo', isWindows);
};

const switchToICli = async (): Promise<Folder> => {
	const cliFolder = path.join(__dirname, '../../');
	await shell.cd(cliFolder);
	return cliFolder;
};

export { switchToInfrastructureDemo, switchToInfrastructureHub, switchToInfrastructureSpoke, switchToICli };
