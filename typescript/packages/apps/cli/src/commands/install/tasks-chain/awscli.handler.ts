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

export class AwsCliTasksHandler extends TasksHandler {
	protected override getLinuxTasks(): ListrTask[] {
		return [
			{
				title: 'Installing AWS CLI.',
				task: async (): Promise<void> => {
					try {
						await $`aws --version | grep -q "aws-cli/2."`.quiet();
					} catch (error) {
						await $`curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"`.quiet();
						await $`unzip -o awscliv2.zip`.quiet();
						await $`sudo ./aws/install --update`.quiet();
					}
				},
			},
		];
	}

	protected override getMacTasks(): ListrTask[] {
		return [
			{
				title: 'Installing AWS CLI.',
				task: async (): Promise<void> => {
					try {
						await $`aws --version | grep -q "aws-cli/2."`.quiet();
					} catch (error) {
						await $`curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"`.quiet();
						await $`installer -pkg ./AWSCLIV2.pkg -target /`.quiet();
					}
				},
			},
		];
	}

	protected override getWindowsTasks(): ListrTask[] {
		return [
			{
				title: 'Installing AWS CLI',

				task: async (): Promise<void> => {
					try {
						await $`aws --version`.quiet();
					} catch (error) {
						await $`msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi`.quiet();
					}
				},
			},
		];
	}
}
