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
import { confirm, input } from '@inquirer/prompts';
import type { Ora } from 'ora';
import type { BaseLogger } from 'pino';
import { bomb, validateStartsWith } from '../../../prompts/common.prompts.ts';
import type { Answers } from '../../answers.ts';
import { PromptHandler } from '../../../prompts/base.handler.ts';
import { saveAnswers } from '../../../utils/answers.ts';
import { getParameterValue } from '../../../utils/ssm.ts';
import { LakeFormationClient, GetDataLakeSettingsCommand } from '@aws-sdk/client-lakeformation';
import { DescribeStackResourceCommand, type CloudFormationClient } from '@aws-sdk/client-cloudformation';

export class ConfigureHubPromptHandler extends PromptHandler {
	constructor(private readonly logger: BaseLogger, private readonly lakeFormationClient: LakeFormationClient, private readonly cloudFormationClient: CloudFormationClient) {
		super();
	}
	public override async handle(answers: Answers, spinner: Ora): Promise<Answers> {
		try {
			await this.retrievingHubConfiguration(answers, spinner);

			// DataZone domain is deployed at this stage and we need to collect the project details
			answers.dataZoneDomainIsDeployed = true;
		} catch (e) {
			bomb('Please provide the correct configuration, then resume the install.');
		}
		await saveAnswers(answers);
		return super.handle(answers, spinner);
	}

	private async retrievingHubConfiguration(answers: Answers, spinner: Ora) {
		// Get Identity store role from management account
		answers.identityStoreRoleArn = await getParameterValue('management', 'identityStoreRole', 'df-demo');

		// Get cdk execution role from spoke account
		await this.getCDKExecutionRole(answers, spinner);

		// Validate cdk execution role is a lakeFormation admin
		await this.validateLakeFormationAdmin(answers, spinner);

		let shouldContinue = await confirm({
			message: 'Have you setup your IAM Identity Center application?',
		});
		if (!shouldContinue) {
			const userPoolDomain = await getParameterValue('shared', 'cognito/userPoolDomain');
			const userPoolId = await getParameterValue('shared', 'cognito/userPoolId');
			bomb(
				`Please setup your IAM Identity Center application\n You will need the following information to set it up:\n Cognito UserPoolDomain: ${userPoolDomain} \n Cognito User Pool Id: ${userPoolId}\n Setup instruction can be found here: \n https://github.com/aws-solutions-library-samples/guidance-for-data-fabric-on-aws/tree/main?tab=readme-ov-file#step-2-configure-iam-identity-center `
			);
		}

		if (answers?.identityStoreApplicationArn) {
			shouldContinue = await confirm({
				message: `Confirm Identity Store application Arn  '${answers.identityStoreApplicationArn}' ?`,
			});
			if (!shouldContinue) {
				await this.enterApplicationArn(answers);
			}
		} else {
			await this.enterApplicationArn(answers);
		}

		if (answers?.samlMetaDataUrl) {
			shouldContinue = await confirm({
				message: `Confirm SAML metadata URL '${answers.samlMetaDataUrl}' ?`,
			});
			if (!shouldContinue) {
				await this.enterSamlMetadataFileUrl(answers);
			}
		} else {
			await this.enterSamlMetadataFileUrl(answers);
		}

		if (answers?.callbackUrls) {
			shouldContinue = await confirm({
				message: `Confirm the callback URL '${answers.callbackUrls}' ?`,
			});
			if (!shouldContinue) {
				await this.enterCallbackUrls(answers);
			}
		} else {
			await this.enterCallbackUrls(answers);
		}
	}

	private async enterApplicationArn(answers: Answers) {
		answers.identityStoreApplicationArn = await input({
			message: 'Enter the IAM Identity Center Application ARN.',
			validate: (value) => validateStartsWith(value, `arn:aws:sso::${answers.hubAccountId}:application/`),
		});
	}

	private async enterSamlMetadataFileUrl(answers: Answers) {
		answers.samlMetaDataUrl = await input({
			message: 'Enter the IAM Identity Center SAML metadata file Url ',
			validate: (value) => validateStartsWith(value, `https://portal.sso.${answers.region}.amazonaws.com/saml/metadata/`),
		});
	}

	private async enterCallbackUrls(answers: Answers) {
		answers.callbackUrls = await input({
			message: 'Enter a comma separated list of allowed redirect (callback) URLs for the Cognito IdP ',
			validate: (value) => validateStartsWith(value, `http`),
		});
	}

	private async getCDKExecutionRole(answers: Answers, spinner: Ora) {
		spinner.start(`Retrieving CDK execution role`);
		const response = await this.cloudFormationClient.send(new DescribeStackResourceCommand({ StackName: 'CDKToolkit', LogicalResourceId: 'CloudFormationExecutionRole' }));
		answers.spokeCdkExecutionRole = response.StackResourceDetail?.PhysicalResourceId;
		spinner.succeed();
	}

	private async validateLakeFormationAdmin(answers: Answers, spinner: Ora) {
		spinner.start(`Validating if Role:${answers.spokeCdkExecutionRole} is a LakeFormation Admin`);

		const response = await this.lakeFormationClient.send(new GetDataLakeSettingsCommand({ CatalogId: answers.spokeAccountId }));

		const admins = response.DataLakeSettings?.DataLakeAdmins;

		let adminFound = false;
		admins?.map((i) => {
			if (i.DataLakePrincipalIdentifier?.endsWith(answers?.spokeCdkExecutionRole as string)) {
				adminFound = true;
				spinner.succeed(`${answers.spokeCdkExecutionRole} is a LakeFormation Admin`);
			}
		});
		if (!adminFound) {
			spinner.fail();
			bomb(`${answers.spokeCdkExecutionRole} is not a LakeFormation Admin, Please grant it LakeFormation admin privileges before re installing`);
		}
	}
}
