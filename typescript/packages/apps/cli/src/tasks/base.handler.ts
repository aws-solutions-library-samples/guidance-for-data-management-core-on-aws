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

import { Listr, type ListrTask } from 'listr2';
import * as os from 'os';
import type { Logger } from 'pino';
import type { Answers } from '../commands/answers';

const { SILENT_COMMAND_EXECUTION: isSilentStr } = process.env;

export abstract class TasksHandler {
	protected isSilent = isSilentStr ? isSilentStr === 'true' : true;
	protected execSyncArgs = { silent: this.isSilent };

	protected nextHandler: TasksHandler | undefined;

	public constructor(protected logger: Logger) {}

	setNext(handler: TasksHandler): TasksHandler {
		this.nextHandler = handler;
		return handler;
	}
	public async handle(tasks: Listr<Answers>): Promise<Listr<Answers>> {
		tasks.add(this.getTasks());

		if (this.nextHandler) {
			return this.nextHandler.handle(tasks);
		}
		return tasks;
	}

	protected abstract getMacTasks(): ListrTask[];

	protected abstract getLinuxTasks(): ListrTask[];

	protected abstract getWindowsTasks(): ListrTask[];

	protected getTasks(): ListrTask[] {
		switch (os.platform()) {
			case 'darwin':
				return this.getMacTasks();
			case 'linux':
				return this.getLinuxTasks();
			case 'win32':
				return this.getWindowsTasks();
			default:
				this.logger.error('the platform is not supported');
				return [];
		}
	}
}
