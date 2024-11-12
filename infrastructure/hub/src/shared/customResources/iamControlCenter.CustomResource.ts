import { CreateGroupCommand, CreateGroupMembershipCommand, CreateUserCommand, GetGroupIdCommand, GetUserIdCommand, IdentitystoreClient } from '@aws-sdk/client-identitystore';
import { DescribeInstanceCommand, SSOAdminClient } from '@aws-sdk/client-sso-admin';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

const { SSO_INSTANCE_ARN, SSO_REGION, ADMIN_EMAIL } = process.env;

export const adminUserIdParameter = `/df/shared/adminUserIdentifierParameter`;

const ssoClient = new SSOAdminClient({ region: SSO_REGION });
const identityStoreClient = new IdentitystoreClient({ region: SSO_REGION });

const seedSso = async (): Promise<void> => {
	const instance = await ssoClient.send(
		new DescribeInstanceCommand({
			InstanceArn: SSO_INSTANCE_ARN,
		})
	);

	const identityStoreId = instance.IdentityStoreId;

	let groupId: string;
	// Create Admin group
	try {
		const group = await identityStoreClient.send(
			new CreateGroupCommand({
				IdentityStoreId: identityStoreId,
				DisplayName: 'admin',
				Description: 'default admin group created for testing purposes',
			})
		);
		groupId = group.GroupId as string;
	} catch (e) {
		if (e.name === 'ConflictException') {
			//Groups already created get the id instead
			const group = await identityStoreClient.send(
				new GetGroupIdCommand({
					IdentityStoreId: identityStoreId,
					AlternateIdentifier: {
						UniqueAttribute: {
							AttributePath: 'DisplayName',
							AttributeValue: 'admin',
						},
					},
				})
			);
			groupId = group.GroupId as string;
		} else {
			throw e;
		}
	}

	// Create Admin User
	let userId: string;
	try {
		const user = await identityStoreClient.send(
			new CreateUserCommand({
				IdentityStoreId: identityStoreId,
				UserName: ADMIN_EMAIL,
				DisplayName: ADMIN_EMAIL,
				Emails: [
					{
						Value: ADMIN_EMAIL,
						Primary: true,
						Type: 'work',
					},
				],
				Name: {
					GivenName: 'admin',
					FamilyName: 'admin',
				},
			})
		);
		userId = user.UserId as string;
	} catch (e) {
		if (e.name === 'ConflictException') {
			//Users already created get the id instead
			const user = await identityStoreClient.send(
				new GetUserIdCommand({
					IdentityStoreId: identityStoreId,
					AlternateIdentifier: {
						UniqueAttribute: {
							AttributePath: 'UserName',
							AttributeValue: ADMIN_EMAIL,
						},
					},
				})
			);
			userId = user.UserId as string;
		} else {
			throw e;
		}
	}

	new StringParameter(this, 'adminUserIdParameter', {
		parameterName: adminUserIdParameter,
		stringValue: userId,
	});

	// Create Group membership
	await identityStoreClient.send(
		new CreateGroupMembershipCommand({
			IdentityStoreId: identityStoreId,
			GroupId: groupId,
			MemberId: {
				UserId: userId,
			},
		})
	);
};

export const handler = async (event: any): Promise<any> => {
	console.log(`iam_control_center.customResource > handler > in : ${JSON.stringify(event)}`);
	try {
		switch (event.RequestType) {
			case 'Create': {
				return await seedSso();
			}
			case 'Update': {
				return await seedSso();
			}
			case 'Delete': {
				// TODO: should delete group and user
				console.log(`nothing to do on delete`);
				return;
			}
			default: {
				console.log(`iam_control_center.customResource > unknown request type`);
			}
		}
	} catch (Exception) {
		console.log(`iam_control_center.customResource > error : ${Exception}`);
	}
	console.log(`iam_control_center.customResource > exit`);
};
