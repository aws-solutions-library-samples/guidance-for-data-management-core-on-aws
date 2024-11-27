import { Stack } from 'aws-cdk-lib';
import { CfnDomain, CfnEnvironment, CfnEnvironmentBlueprintConfiguration, CfnEnvironmentProfile, CfnProject, CfnProjectMembership, CfnUserProfile } from 'aws-cdk-lib/aws-datazone';
import { CompositePrincipal, Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface DatazoneConstructProperties {
	bucketName: string;
	userIdentifier?: string;
	dataZoneAdminRoleArn?: string;
	deployRedshift?: boolean;
}

export const domainIdParameter = `/dm-demo/hub/datazone/domainId`;
export const projectIdParameter = `/dm-demo/hub/datazone/projectId`;
export const dataLakeBluePrintIdParameter = `/dm-demo/hub/datazone/dataLakeBluePrintId`;
export const dataLakeEnvironmentIdParameter = `/dm-demo/hub/datazone/dataLakeEnvironmentId`;
export const dataLakeEnvironmentNameParameter = `/dm-demo/hub/datazone/dataLakeEnvironmentName`;
export const glueAccessRoleArnParameter = `/dm-demo/hub/datazone/glueRoleArn`;
export const redshiftAccessRoleArnParameter = `/dm-demo/hub/datazone/redshiftRoleArn`;
export const redshiftBluePrintIdParameter = `/dm-demo/hub/datazone/redshiftBluePrintId`;

export class DatazoneConstruct extends Construct {
	constructor(scope: Construct, id: string, props: DatazoneConstructProperties) {
		super(scope, id);

		const accountId = Stack.of(this).account;
		const region = Stack.of(this).region;

		/**
		 * Create the role for data zone account
		 * In a production setup, this role would need to be created in the hub account (where datazone exists)
		 */
		const dataZoneExecutionRole = new Role(this, 'dataManagementDomainExecutionRole', {
			roleName: 'dataManagementDomainExecutionRole',
			assumedBy: new ServicePrincipal('datazone.amazonaws.com', {
				conditions: {
					StringEquals: {
						'aws:SourceAccount': accountId,
					},
					'ForAllValues:StringLike': {
						'aws:TagKeys': 'datazone*',
					},
				},
			}).withSessionTags(),
			managedPolicies: [
				{
					managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonDataZoneDomainExecutionRolePolicy',
				},
				{
					managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole',
				},
			],
		});
		const getUserPolicy = new PolicyStatement({
			actions: ['iam:GetRole', 'iam:GetUser'],
			effect: Effect.ALLOW,
			resources: ['*'],
		});

		dataZoneExecutionRole.addToPolicy(getUserPolicy);

		const dataZoneProvisioningRole = new Role(this, 'dataZoneProvisioningRole', {
			roleName: 'dataManagementDomainProvisioningRole',
			assumedBy: new ServicePrincipal('datazone.amazonaws.com', {
				conditions: {
					StringEquals: {
						'aws:SourceAccount': accountId,
					},
				},
			}),
			managedPolicies: [
				{
					managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonAthenaFullAccess',
				},
				{
					managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonDataZoneRedshiftGlueProvisioningPolicy',
				},
				{
					managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess',
				},
			],
		});

		const dataLakeDeletePolicy = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: [
				'lakeformation:ListPermissions',
				'lakeformation:GrantPermissions',
				'lakeformation:BatchGrantPermissions',
				'lakeformation:RevokePermissions',
				'lakeformation:BatchRevokePermissions',
				'lakeformation:CreateLakeFormationOptIn',
				'glue:GetDatabases',
				'glue:SearchTables',
				'glue:GetTables',
				'glue:GetDatabase',
				'glue:GetTable',
				'glue:TagResource',
				'iam:ListUsers',
				'iam:ListRoles',
				'sso-directory:DescribeUser',
				'sso-directory:DescribeGroup',
				'sso:DescribeInstance',
			],
			resources: ['*'],
		});

		dataZoneExecutionRole.addToPolicy(dataLakeDeletePolicy);

		dataZoneProvisioningRole.addToPolicy(dataLakeDeletePolicy);

		const domain = new CfnDomain(this, 'DatazoneDomain', {
			domainExecutionRole: dataZoneExecutionRole.roleArn,
			name: 'Data Management',
			description: 'dm-demo:Data Management',
			singleSignOn: {
				type: 'IAM_IDC',
				userAssignment: 'AUTOMATIC',
			},
		});

		domain.node.addDependency(dataZoneExecutionRole);

		new StringParameter(this, 'domainIdParameter', {
			parameterName: domainIdParameter,
			stringValue: domain.attrId,
		});

		const dataZoneGlueAccessRole = new Role(this, 'dataZoneGlueAccessRole', {
			roleName: `AmazonDataZoneGlueAccess-${region}-${domain.attrId}`,
			assumedBy: new CompositePrincipal(
				new ServicePrincipal('datazone.amazonaws.com', {
					conditions: {
						StringEquals: {
							'aws:SourceAccount': accountId,
						},
						ArnEquals: {
							'aws:SourceArn': `arn:aws:datazone:${region}:${accountId}:domain/${domain.attrId}`,
						},
					},
				}),
				new ServicePrincipal('lakeformation.amazonaws.com', {
					conditions: {
						StringEquals: {
							'aws:SourceAccount': accountId,
						},
					},
				})
			),
			managedPolicies: [
				{
					managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonDataZoneGlueManageAccessRolePolicy',
				},
				{
					managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess',
				},
			],
		});

		dataZoneGlueAccessRole.node.addDependency(domain);

		new StringParameter(this, 'glueAccessRoleArnParameter', {
			parameterName: glueAccessRoleArnParameter,
			stringValue: dataZoneGlueAccessRole.roleArn,
		});

		// TODO enable for future Redshift access
		// const dataZoneRedshiftAccessRole = new Role(this, 'dataZoneRedshiftAccessRole', {
		// 	roleName: `AmazonDataZoneRedshiftAccess-${region}-${domain.attrId}`,
		// 	assumedBy: new ServicePrincipal('datazone.amazonaws.com', {
		// 		conditions: {
		// 			StringEquals: {
		// 				'aws:SourceAccount': accountId,
		// 			},
		// 			ArnEquals: {
		// 				'aws:SourceArn': `arn:aws:datazone:${region}:${accountId}:domain/${domain.attrId}`,
		// 			},
		// 		},
		// 	}),
		// });

		// const redshiftPolicy = new PolicyStatement({
		// 	effect: Effect.ALLOW,
		// 	actions: ['secretsmanager:GetSecretValue'],
		// 	conditions: {
		// 		stringEquals: {
		// 			'secretsmanager:ResourceTag/AmazonDataZoneDomain': domain.attrId,
		// 		},
		// 	},
		// 	resources: ['*'],
		// });

		// dataZoneRedshiftAccessRole.addToPolicy(redshiftPolicy);
		// dataZoneRedshiftAccessRole.node.addDependency(domain);

		// new StringParameter(this, 'redshiftAccessRoleArnParameter', {
		// 	parameterName: redshiftAccessRoleArnParameter,
		// 	stringValue: dataZoneRedshiftAccessRole.roleArn,
		// });

		const project = new CfnProject(this, 'DatazoneProject', {
			name: 'Data Management',
			description: 'Data Management',
			domainIdentifier: domain.attrId,
		});

		project.addDependency(domain);

		new StringParameter(this, 'projectIdParameter', {
			parameterName: projectIdParameter,
			stringValue: project.attrId,
		});

		const envBlueprintDataLake = new CfnEnvironmentBlueprintConfiguration(this, 'DatazoneEnvironmentBlueprintDataLake', {
			domainIdentifier: domain.attrId,
			enabledRegions: [region],
			environmentBlueprintIdentifier: 'DefaultDataLake',
			manageAccessRoleArn: dataZoneExecutionRole.roleArn,
			provisioningRoleArn: dataZoneProvisioningRole.roleArn,
			regionalParameters: [
				{
					parameters: {
						S3Location: `s3://${props.bucketName}`,
					},
					region,
				},
			],
		});

		envBlueprintDataLake.addDependency(domain);

		new StringParameter(this, 'dataLakeBluePrintIdParameter', {
			parameterName: dataLakeBluePrintIdParameter,
			stringValue: envBlueprintDataLake.attrEnvironmentBlueprintId,
		});

		const envBlueprintRedshift = new CfnEnvironmentBlueprintConfiguration(this, 'DatazoneEnvironmentBlueprintRedshift', {
			domainIdentifier: domain.attrId,
			enabledRegions: [region],
			environmentBlueprintIdentifier: 'DefaultDataWarehouse',
			manageAccessRoleArn: dataZoneExecutionRole.roleArn,
			provisioningRoleArn: dataZoneProvisioningRole.roleArn,
			regionalParameters: [
				{
					parameters: {
						S3Location: `s3://${props.bucketName}`,
					},
					region,
				},
			],
		});
		envBlueprintRedshift.addDependency(domain);

		new StringParameter(this, 'redshiftBluePrintIdParameter', {
			parameterName: redshiftBluePrintIdParameter,
			stringValue: envBlueprintRedshift.attrEnvironmentBlueprintId,
		});

		const envProfileDataLake = new CfnEnvironmentProfile(this, 'DatazoneEnvironmentProfileDataLake', {
			name: 'Data Management DataLake Environment Profile',
			description: 'Data Management DataLake Environment Profile',
			domainIdentifier: domain.attrId,
			projectIdentifier: project.attrId,
			awsAccountId: accountId,
			awsAccountRegion: region,
			environmentBlueprintIdentifier: envBlueprintDataLake.attrEnvironmentBlueprintId,
		});

		envProfileDataLake.addDependency(envBlueprintDataLake);

		const envProfileRedshift = new CfnEnvironmentProfile(this, 'DatazoneEnvironmentProfileRedshift', {
			name: 'Data Management Redshift Environment Profile',
			description: 'Data Management Redshift Environment Profile',
			domainIdentifier: domain.attrId,
			projectIdentifier: project.attrId,
			awsAccountId: accountId,
			awsAccountRegion: region,
			environmentBlueprintIdentifier: envBlueprintRedshift.attrEnvironmentBlueprintId,
		});

		envProfileRedshift.addDependency(envBlueprintRedshift);

		const envDataLake = new CfnEnvironment(this, 'DatazoneEnvironmentDataLake', {
			name: 'Data Management dataLake Environment',
			description: 'Data Management dataLake Environment',
			domainIdentifier: domain.attrId,
			projectIdentifier: project.attrId,
			environmentAccountIdentifier: accountId,
			environmentAccountRegion: region,
			environmentProfileIdentifier: envProfileDataLake.attrId,
		});
		envDataLake.addDependency(envProfileDataLake);

		new StringParameter(this, 'dataLakeEnvironmentIdParameter', {
			parameterName: dataLakeEnvironmentIdParameter,
			stringValue: envDataLake.attrId,
		});
		new StringParameter(this, 'dataLakeEnvironmentNameParameter', {
			parameterName: dataLakeEnvironmentNameParameter,
			stringValue: envDataLake.name,
		});

		if (props?.deployRedshift) {
			const envDataRedshift = new CfnEnvironment(this, 'DatazoneEnvironmentRedshift', {
				name: 'Data Management Redshift Environment',
				description: 'Data Management Redshift Environment',
				domainIdentifier: domain.attrId,
				projectIdentifier: project.attrId,
				environmentAccountIdentifier: accountId,
				environmentAccountRegion: region,
				environmentProfileIdentifier: envProfileDataLake.attrId,
			});
			envDataRedshift.addDependency(envProfileRedshift);
		}

		if (props?.userIdentifier) {
			new CfnProjectMembership(this, 'DatazoneProjectMembershipUser', {
				designation: 'PROJECT_OWNER',
				domainIdentifier: domain.attrId,
				member: {
					userIdentifier: props.userIdentifier,
				},
				projectIdentifier: project.attrId,
			});
		}

		if (props?.dataZoneAdminRoleArn) {
			new CfnProjectMembership(this, 'DatazoneProjectMembershipRole', {
				designation: 'PROJECT_OWNER',
				domainIdentifier: domain.attrId,
				member: {
					userIdentifier: props.dataZoneAdminRoleArn,
				},
				projectIdentifier: project.attrId,
			});
		}

		NagSuppressions.addResourceSuppressions(
			[dataZoneExecutionRole],
			[
				{
					id: 'AwsSolutions-IAM4',
					appliesTo: [
						'Policy::arn:aws:iam::aws:policy/service-role/AmazonDataZoneDomainExecutionRolePolicy',
						'Policy::arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole',
					],
					reason: 'Service level policy.',
				},
				{
					id: 'AwsSolutions-IAM5',
					appliesTo: ['Resource::*'],
					reason: 'The resource condition in the IAM policy is generated by CDK, this only applies to xray:PutTelemetryRecords and xray:PutTraceSegments actions.',
				},
			],
			true
		);

		NagSuppressions.addResourceSuppressions(
			[dataZoneProvisioningRole],
			[
				{
					id: 'AwsSolutions-IAM4',
					appliesTo: [
						'Policy::arn:aws:iam::aws:policy/AmazonAthenaFullAccess',
						'Policy::arn:aws:iam::aws:policy/AmazonDataZoneRedshiftGlueProvisioningPolicy',
						'Policy::arn:aws:iam::aws:policy/AmazonS3FullAccess',
					],
					reason: 'Service level policy.',
				},
				{
					id: 'AwsSolutions-IAM5',
					appliesTo: ['Resource::*'],
					reason: 'The resource condition in the IAM policy is generated by CDK, this only applies to xray:PutTelemetryRecords and xray:PutTraceSegments actions.',
				},
			],
			true
		);

		NagSuppressions.addResourceSuppressions(
			[dataZoneGlueAccessRole],
			[
				{
					id: 'AwsSolutions-IAM4',
					appliesTo: ['Policy::arn:aws:iam::aws:policy/service-role/AmazonDataZoneGlueManageAccessRolePolicy', 'Policy::arn:aws:iam::aws:policy/AmazonS3FullAccess'],
					reason: 'Service level policy.',
				},
				{
					id: 'AwsSolutions-IAM5',
					appliesTo: ['Resource::*'],
					reason: 'The resource condition in the IAM policy is generated by CDK, this only applies to xray:PutTelemetryRecords and xray:PutTraceSegments actions.',
				},
			],
			true
		);
	}
}
