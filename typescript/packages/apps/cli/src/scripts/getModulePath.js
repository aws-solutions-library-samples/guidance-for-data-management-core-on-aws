#!/usr/bin/env node

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

import rushlib from '@microsoft/rush-lib';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// Function to get module path by name
function getModulePathByName(projectName, workspaceLocation) {
	// Load the rush configuration
	const rushConfig = rushlib.RushConfiguration.loadFromDefaultLocation({ startingFolder: workspaceLocation });

	const project = rushConfig.findProjectByShorthandName(projectName);

	if (!project) {
		console.error(`Package with name '${projectName}' not found.`);
		process.exit(1);
	}

	// Resolve the absolute path to the module
	const projectPath = path.resolve(rushConfig.rushJsonFolder, project.projectFolder);
	return projectPath;
}

// Get the project name from CLI arguments
const projectName = process.argv[2];
const workspaceLocation = process.argv[3];

if (!workspaceLocation) {
	console.error('Please provide a workspace location as an argument.');
	process.exit(1);
}

if (!projectName) {
	console.error('Please provide a package name as an argument.');
	process.exit(1);
}

const modulePath = getModulePathByName(projectName, workspaceLocation);
console.log(modulePath);
