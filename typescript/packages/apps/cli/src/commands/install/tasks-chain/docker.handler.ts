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
import type { ListrTask } from 'listr2';
import { TasksHandler } from '../../../tasks/base.handler.ts';
import { bomb } from '../../../prompts/common.prompts.js';

export class DockerTasksHandler extends TasksHandler {
	protected override getLinuxTasks(): ListrTask[] {
		return [
			{
				title: 'Installing Brew.',
				task: async (): Promise<void> => {
					try {
						await $`brew --version`.quiet();
					} catch (error) {
						await $`curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | bash`.quiet();
					}
				},
			},
			{
				title: 'Installing Docker.',
				task: async (): Promise<void> => {
					try {
						await $`docker --version`.quiet();
					} catch (error) {
						await $`/home/linuxbrew/.linuxbrew/bin/brew install gcc`.quiet();
						await $`/home/linuxbrew/.linuxbrew/bin/brew install docker`.quiet();
					}
				},
			},
		];
	}

	protected override getMacTasks(): ListrTask[] {
		return [
			{
				title: 'Installing Brew.',
				task: async (): Promise<void> => {
					try {
						await $`brew --version`.quiet();
					} catch (error) {
						await $`curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | bash`.quiet();
					}
				},
			},
			{
				title: 'Installing Docker.',
				task: async (): Promise<void> => {
					try {
						await $`docker --version`.quiet();
					} catch (error) {
						await $`/usr/local/bin/brew install docker`.quiet();
						await $`open /Applications/Docker.app`.quiet();
					}
				},
			},
		];
	}

	protected override getWindowsTasks(): ListrTask[] {
		return [
			{
				title: 'Validating Docker.',
				task: async (): Promise<void> => {
					try {
						await $`docker version`.quiet();
					} catch (error) {
						bomb(`Install Docker https://docs.docker.com/desktop/release-notes/ before proceeding`);
					}
				},
			},
		];
	}
}
