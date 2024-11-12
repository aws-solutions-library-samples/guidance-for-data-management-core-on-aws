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
import { TasksHandler } from '../../../tasks/base.handler.ts';
import { bomb } from '../../../prompts/common.prompts.js';

export class NodeTasksHandler extends TasksHandler {
	protected override getLinuxTasks(): ListrTask[] {
		return [
			{
				title: 'Installing nvm.',
				task: async (): Promise<void> => {
					try {
						await $`nvm -v | grep -q "0.3"`.quiet();
					} catch (error) {
						await $`curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh" | bash`.quiet();
					}
				},
			},
			{
				title: 'Installing node v20.',
				task: async (): Promise<void> => {
					try {
						await $`node --version | grep -q "v20."`.quiet();
					} catch (error) {
						await $`chmod 777 ~/.nvm/nvm.sh`.quiet();
						await $`~/.nvm/nvm.sh && nvm install 20`.quiet();
					}
				},
			},
		];
	}

	protected override getMacTasks(): ListrTask[] {
		return [
			{
				title: 'Installing nvm.',
				task: async (): Promise<void> => {
					try {
						await $`nvm -v | grep -q "0.3"`.quiet();
					} catch (error) {
						await $`curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh" | bash`.quiet();
					}
				},
			},
			{
				title: 'Installing node v20.',
				task: async (): Promise<void> => {
					try {
						await $`node --version | grep -q "v20."`.quiet();
					} catch (error) {
						await $`. ~/.nvm/nvm.sh && nvm install 20`.quiet();
					}
				},
			},
		];
	}

	protected override getWindowsTasks(): ListrTask[] {
		return [
			{
				title: 'Checking for nvm-windows',
				task: async (): Promise<void> => {
					try {
						await $`nvm version`.quiet();
					} catch (error) {
						bomb(`Install nvm-windows https://github.com/coreybutler/nvm-windows before proceeding`);
					}
				},
			},
			{
				title: 'Installing node v20.',
				task: async (): Promise<void> => {
					try {
						await $`for /f "tokens=*" %i in ('node --version') do @echo %i | findstr /r "v20\."`.quiet();
					} catch (error) {
						await $`nvm install 20`.quiet();
						await $`nvm use 20`.quiet();
					}
				},
			},
		];
	}
}
