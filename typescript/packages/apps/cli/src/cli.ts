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

import figlet from 'figlet';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as installCommand from './commands/install/install.command';
import * as deleteCommand from './commands/delete/delete.command';

console.log(
	figlet.textSync('Data Management', {
		// font: 'Poison',
		width: 120,
		whitespaceBreak: true,
	})
);

const yargsInstance = yargs(hideBin(process.argv));

await yargsInstance.wrap(yargsInstance.terminalWidth()).scriptName('data-management').command([installCommand, deleteCommand]).demandCommand(1).strict().help().parse();
