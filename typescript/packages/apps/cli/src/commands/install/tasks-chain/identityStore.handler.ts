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

import { type ListrTask } from 'listr2';
import { SimpleTasksHandler } from '../../../tasks/simple.handler.ts';
import type { Answers } from '../../answers.js';
import type { Logger } from 'pino';
import { IdentitystoreClient, CreateUserCommand, GetUserIdCommand } from '@aws-sdk/client-identitystore';
import { SSOAdminClient, CreateApplicationAssignmentCommand } from '@aws-sdk/client-sso-admin';
import { saveAnswers } from '../../../utils/answers.ts';

export class IdentityStoreTasksHandler extends SimpleTasksHandler {
	constructor(public readonly logger: Logger, private readonly identitystoreClient: IdentitystoreClient, private readonly ssoAdminClient: SSOAdminClient) {
		super(logger);
	}
	protected installTasks = (): ListrTask[] => [
		{
			title: 'Creating Identity Store user',
			task: async (answers: Answers): Promise<void> => {
				let userId;
				if (answers?.restricted?.user) {
					try {
						const resp = await this.identitystoreClient.send(
							new CreateUserCommand({
								IdentityStoreId: answers.identityStoreId,
								Emails: [{ Value: answers.restricted.user.email }],
								UserName: answers.restricted.user.userName,
								DisplayName: answers.restricted.user.displayName,
								Name: {
									FamilyName: answers.restricted.user.lastName,
									GivenName: answers.restricted.user.firstName,
								},
							})
						);
						userId = resp.UserId;
					} catch (error) {
						if ((error as Error).name === 'ConflictException') {
							const resp = await this.identitystoreClient.send(
								new GetUserIdCommand({
									IdentityStoreId: answers.identityStoreId,
									AlternateIdentifier: {
										UniqueAttribute: {
											AttributePath: 'emails.value',
											AttributeValue: answers.restricted.user.email,
										},
									},
								})
							);
							userId = resp.UserId;
						} else {
							throw error;
						}
					}
				}

				await this.ssoAdminClient.send(
					new CreateApplicationAssignmentCommand({
						ApplicationArn: answers.identityStoreApplicationArn,
						PrincipalType: 'USER',
						PrincipalId: userId,
					})
				);
				answers.IdentityStoreAdminUserId = userId;
				await saveAnswers(answers);
			},
		},
	];
}
