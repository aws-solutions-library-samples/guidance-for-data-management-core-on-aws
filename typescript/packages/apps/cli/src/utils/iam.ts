/*
 *    Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
 *
 *    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *    with the License. A copy of the License is located at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *    or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *    OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *    and limitations under the License.
 */

import { ListRoleTagsCommand, ListRolesCommand, type ListRolesCommandOutput, type Role } from '@aws-sdk/client-iam';
import { diContainer } from '../di.ts';

const getRoleByTag = async (namePrefix: string, key: string, value: string): Promise<string | undefined> => {
	const cradle = diContainer.cradle;

	let matchingRole = undefined;
	try {
		// Step 1: List all IAM roles
		let roles: Role[] = [];
		let marker;
		do {
			const response: ListRolesCommandOutput = await cradle.iamClient.send(new ListRolesCommand({ Marker: marker }));
			if (response?.Roles) {
				roles = roles.concat(response.Roles);
			}
			marker = response.Marker;
			await Bun.sleep(3000);
		} while (marker);

		// Step 2: Filter roles by prefix and tag

		for (const role of roles) {
			if (role.RoleName?.startsWith(namePrefix)) {
				const tagsResponse = await cradle.iamClient.send(new ListRoleTagsCommand({ RoleName: role.RoleName }));
				const tags = tagsResponse.Tags;
				if (tags) {
					const matchingTag = tags.find((tag) => tag.Key === key && tag.Value === value);
					if (matchingTag) {
						matchingRole = role.Arn;
						return matchingRole;
					}
				}
			}
		}
	} catch (error) {
		console.log(`getRoleByTag error: ${JSON.stringify(error)}`);
		return undefined;
	}
	return matchingRole;
};

export { getRoleByTag };
