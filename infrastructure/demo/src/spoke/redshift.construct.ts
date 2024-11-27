import { Construct } from 'constructs';
import { CfnNamespace, CfnWorkgroup } from 'aws-cdk-lib/aws-redshiftserverless';
import { IVpc, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import path from 'path';
import { Stack } from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { fileURLToPath } from 'url';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { CustomResource, Duration, RemovalPolicy } from 'aws-cdk-lib/core';
import { CreateSchemaProperties } from './custom-resources/create-redshift-schema.js';
import { ulid } from 'ulid';
import { DATABASE_NAME } from './assets/tables.js';
import { commonLambdaOptions } from '../common/lambda.js';

export interface RedShiftConstructProperties {
	vpc: IVpc;
	deleteRedshift: boolean;
	dataZoneDomainId: string;
	dataZoneProjectId: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const redshiftSecretNameParameter = `/dm-demo/spoke/redshift/secretName`;

export const redshiftSecretArnParameter = `/dm-demo/spoke/redshift/secretArn`;

export const redshiftSecurityGroupIdParameter = `/dm-demo/spoke/redshift/securityGroupId`;

export const redshiftWorkgroupNameParameter = `/dm-demo/spoke/redshift/workgroupName`;

export const redshiftSchemaNameParameter = `/dm-demo/spoke/redshift/schemaName`;

export const redshiftDatabaseNameParameter = `/dm-demo/spoke/redshift/databaseName`;

export const redshiftNamespaceNameParameter = `/dm-demo/spoke/redshift/namespaceName`;
export const redshiftNamespaceArnParameter = `/dm-demo/spoke/redshift/namespaceArn`;

export class RedShiftConstruct extends Construct {
	readonly workgroupPort = '5439';

	constructor(scope: Construct, id: string, props: RedShiftConstructProperties) {
		super(scope, id);

		const namePrefix = `dm-demo-spoke`;
		const databaseName = DATABASE_NAME;

		const namespace = new CfnNamespace(this, 'DataStoreNamespace', {
			namespaceName: `${namePrefix}-namespace`,
			manageAdminPassword: true,
			dbName: databaseName,
		});

		// Retain Namespace on stack deletion
		namespace.applyRemovalPolicy(props.deleteRedshift ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN);

		const sg = new SecurityGroup(this, 'DataStoreSecurityGroup', {
			vpc: props.vpc,
			allowAllOutbound: true,
		});

		const workgroup = new CfnWorkgroup(this, 'DataStoreWorkgroup', {
			workgroupName: `${namePrefix}-workgroup`,
			baseCapacity: 8,
			enhancedVpcRouting: false,
			namespaceName: namespace.namespaceName,
			publiclyAccessible: false,
			port: Number(this.workgroupPort),
			securityGroupIds: [sg.securityGroupId],
			subnetIds: props.vpc.selectSubnets({ subnets: props.vpc.isolatedSubnets }).subnetIds,
		});

		workgroup.addDependency(namespace);

		new StringParameter(this, `DataStoreSecurityGroupIdParameter`, {
			parameterName: redshiftSecurityGroupIdParameter,
			description: `dm-demo redshift security group id )`,
			stringValue: sg.securityGroupId,
		});

		new StringParameter(this, `DataStoreWorkGroupNameParameter`, {
			parameterName: redshiftWorkgroupNameParameter,
			description: `dm-demo redshift workgroup name`,
			stringValue: workgroup.workgroupName,
		});

		new StringParameter(this, `DataStoreNamespaceNameParameter`, {
			parameterName: redshiftNamespaceNameParameter,
			description: `dm-demo redshift namespace `,
			stringValue: namespace.namespaceName,
		});

		new StringParameter(this, `DataStoreNamespaceArnParameter`, {
			parameterName: redshiftNamespaceArnParameter,
			description: `dm-demo redshift namespace `,
			stringValue: namespace.attrNamespaceNamespaceArn,
		});

		new StringParameter(this, `DataStoreDatabaseNameParameter`, {
			parameterName: redshiftDatabaseNameParameter,
			description: `dm-demo redshift database name `,
			stringValue: databaseName,
		});

		new StringParameter(this, `DataStoreSecretNameParameter`, {
			parameterName: redshiftSecretNameParameter,
			description: `dm-demo redshift secret name `,
			stringValue: `redshift!${namespace.namespaceName}-admin`,
		});

		/**
		 * Define the Get Secret Arn Custom Resource
		 */
		const getSecretArnCustomResource = new NodejsFunction(this, 'GetSecretArnCustomResource', {
			...commonLambdaOptions,
			functionName: `${namePrefix}-get-secret-arn-cr`,
			description: `dm-demo get secret arn custom resource`,
			entry: path.join(__dirname, 'custom-resources', 'get-secret-arn.ts'),
			handler: 'handler',
			memorySize: 256,
			timeout: Duration.minutes(5),
		});

		const accountId = Stack.of(this).account;
		const region = Stack.of(this).region;

		getSecretArnCustomResource.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['secretsmanager:GetSecretValue', 'secretsmanager:TagResource'],
				resources: [`arn:aws:secretsmanager:${region}:${accountId}:secret:redshift!${namespace.namespaceName}*`],
			})
		);

		getSecretArnCustomResource.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['redshift-serverless:GetNamespace'],
				resources: [namespace.attrNamespaceNamespaceArn],
			})
		);

		const getSecretArnProvider = new Provider(this, 'GetSecretArnCustomResourceProvider', {
			onEventHandler: getSecretArnCustomResource,
			logRetention: RetentionDays.ONE_WEEK,
		});

		// tag the secret with DataZone tags and get the secret arn
		const getSecretArnCr = new CustomResource(this, 'GetSecretArnSchemaCustomResource', {
			serviceToken: getSecretArnProvider.serviceToken,
			properties: {
				namespaceName: namespace.namespaceName,
				dataZoneDomainId: props.dataZoneDomainId,
				dataZoneProjectId: props.dataZoneProjectId,
				uniqueToken: new Date().toISOString(),
			},
		});

		const secretArn = getSecretArnCr.getAttString('AdminSecretArn');

		new StringParameter(this, `DataStoreSecretArnParameter`, {
			parameterName: redshiftSecretArnParameter,
			description: `dm-demo redshift secret arn `,
			stringValue: secretArn,
		});

		/**
		 * Define the Create Schema Custom Resource
		 */
		const createSchemaCustomResource = new NodejsFunction(this, 'CreateSchemaCustomResource', {
			...commonLambdaOptions,
			functionName: `${namePrefix}-create-schema-cr`,
			description: `dm-demo create schema custom resource`,
			entry: path.join(__dirname, 'custom-resources', 'create-redshift-schema.ts'),
			handler: 'handler',
			memorySize: 256,
			timeout: Duration.minutes(5),
		});

		createSchemaCustomResource.node.addDependency(workgroup);

		createSchemaCustomResource.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['redshift-data:ExecuteStatement', 'redshift-data:DescribeStatement', 'redshift-data:BatchExecuteStatement'],
				resources: ['*'],
			})
		);

		createSchemaCustomResource.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['secretsmanager:GetSecretValue'],
				resources: [`arn:aws:secretsmanager:${region}:${accountId}:secret:redshift!${namespace.namespaceName}*`],
			})
		);

		const provider = new Provider(this, 'CreateRedshiftSchemaCustomResourceProvider', {
			onEventHandler: createSchemaCustomResource,
			logRetention: RetentionDays.ONE_WEEK,
		});

		const customResourceProperties: CreateSchemaProperties = {
			secretArn,
			databaseName: databaseName,
			workgroupName: workgroup.workgroupName,
			schemaName: 'demo',
			id: ulid(), //additional field to have custom resource run on every deployment
		};

		const createRedshiftSchemaCr = new CustomResource(this, 'CreateRedshiftSchemaCustomResource', {
			serviceToken: provider.serviceToken,
			properties: {
				...customResourceProperties,
				uniqueToken: new Date().toISOString(),
			},
		});

		createRedshiftSchemaCr.node.addDependency(getSecretArnCr);

		new StringParameter(this, `RedshiftSchemaNameParameter`, {
			parameterName: redshiftSchemaNameParameter,
			description: `dm-demo redshift schema name `,
			stringValue: 'demo',
		});

		NagSuppressions.addResourceSuppressions(
			[provider, getSecretArnProvider],
			[
				{
					id: 'AwsSolutions-L1',
					reason: 'This policy is the one generated by CDK.',
				},
				{
					id: 'AwsSolutions-IAM5',
					appliesTo: ['Resource::<RedShiftConstructCreateSchemaCustomResource983E37FD.Arn>:*', 'Resource::<RedShiftConstructGetSecretArnCustomResource91F0D533.Arn>:*'],
					reason: 'The custom resource provided need to be able to invoke the lambda.',
				},
			],
			true
		);

		NagSuppressions.addResourceSuppressions(
			[createSchemaCustomResource, provider, getSecretArnCustomResource, getSecretArnProvider],
			[
				{
					id: 'AwsSolutions-IAM4',
					appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
					reason: 'This policy is the one generated by CDK.',
				},
				{
					id: 'AwsSolutions-IAM5',
					appliesTo: [
						'Resource::*',
						'Resource::<RedshiftConstructGetSecretArnCustomResource8F188461.Arn>:*',
						'Resource::<RedshiftConstructCreateSchemaCustomResource51D10E25.Arn>:*',
						`Resource::arn:aws:secretsmanager:${region}:${accountId}:secret:redshift!${namespace.namespaceName}*`,
						`Resource::arn:aws:states:${region}:${accountId}:stateMachine:dm-demo-*`,
					],
					reason: 'The resource condition in the IAM policy is generated by CDK, this only applies to xray:PutTelemetryRecords and xray:PutTraceSegments actions.',
				},
			],
			true
		);
	}
}
