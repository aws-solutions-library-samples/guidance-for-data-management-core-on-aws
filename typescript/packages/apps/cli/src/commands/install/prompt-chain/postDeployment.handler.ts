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

import type { Ora } from 'ora';
import type { BaseLogger } from 'pino';
import { bomb } from '../../../prompts/common.prompts.ts';
import type { Answers } from '../../answers.ts';
import { PromptHandler } from '../../../prompts/base.handler.ts';
import { saveAnswers } from '../../../utils/answers.ts';
import { getParameterValue } from '../../../utils/ssm.ts';
import { getRoleByTag } from '../../../utils/iam.ts';

export class PostDeploymentPromptHandler extends PromptHandler {
	constructor(private readonly logger: BaseLogger) {
		super();
	}
	public override async handle(answers: Answers, spinner: Ora): Promise<Answers> {
		try {
			spinner.start('Retrieving post deployment configuration');
			await this.postDeployment(answers, spinner);
			spinner.succeed();
		} catch (e) {
			spinner.fail();
			bomb('Please resolve any underlying issue, then resume the install.');
		}
		await saveAnswers(answers);
		return super.handle(answers, spinner);
	}

	private async postDeployment(answers: Answers, spinner: Ora) {
		// Get LakeFormation GlueDatabase name
		answers.spokeGlueDatabaseName = await getParameterValue('spoke', 'shared/glue/databaseName');

		// Det dataZone glue Access Role ARN
		answers.dataZoneGlueAccessRoleArn = await getParameterValue('hub', 'datazone/glueRoleArn', 'df-demo');

		// Get demo role created for Glue access
		('/df/spoke/shared/glueRoleArn');
		answers.spokeGlueRoleArn = await getParameterValue('spoke', 'shared/glueRoleArn');

		//Get spoke info
		answers.spokeBucketArn = await getParameterValue('spoke', 'shared/bucketArn');
		answers.spokeBucketName = await getParameterValue('spoke', 'shared/bucketName');

		answers.dataZoneDataLakeEnvironmentId = await getParameterValue('hub', 'datazone/dataLakeEnvironmentId', 'df-demo');

		answers.dataZoneDataLakeEnvironmentName = await getParameterValue('hub', 'datazone/dataLakeEnvironmentName', 'df-demo');
		if (!answers?.dataZoneDataLakeEnvironmentId) {
			spinner.fail();
			bomb('No DataLake environment found in the DataZone domain.');
		}
		answers.dataZoneDataLakeEnvironmentRoleArn = await getRoleByTag('datazone_usr_', 'AmazonDataZoneEnvironment', answers?.dataZoneDataLakeEnvironmentId as string);
	}
}
