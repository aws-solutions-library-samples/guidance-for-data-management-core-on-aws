
import { Aspects, Duration, RemovalPolicy, } from 'aws-cdk-lib';
import { InstanceType, IVpc, Port, SecurityGroup, SubnetFilter } from 'aws-cdk-lib/aws-ec2';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DatabaseClusterEngine, SubnetGroup, DatabaseCluster, ParameterGroup, CfnDBCluster, AuroraPostgresEngineVersion } from 'aws-cdk-lib/aws-rds';
import { Secret, HostedRotation } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { NagSuppressions } from 'cdk-nag';
import { Effect, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';



export interface AuroraDatabaseConstructProperties {
	vpc: IVpc;
	isolatedSubnetIds: string[]
	domain: string;
	minClusterCapacity: number;
	maxClusterCapacity: number;
	clusterDeletionProtection: boolean;
}



export class AuroraDatabase extends Construct {
	instanceName: string;
	auroraSecurityGroup: SecurityGroup;
	clusterIdentifier: string;
	rdsClusterWriterEndpoint:string;
	rdsSecretName:string;
	platformUsername:string;
	auroraClusterStatus:string;

	constructor(scope: Construct, id: string, props: AuroraDatabaseConstructProperties) {
		super(scope, id);

		this.instanceName = `sdf-${props.domain}`;
		const databaseUsername = 'clusteradmin';
		const clusterName = `sdf-${props.domain}-cluster`;

		const iamPolicy = new Policy(this, 'iam-policy', {
			statements: [
				new PolicyStatement({
					sid: 'CreateRDSSLR',
					actions: ['iam:CreateServiceLinkedRole'],
					resources: [
						`arn:aws:iam::*:role/aws-service-role/rds.amazonaws.com/AWSServiceRoleForRDS*`,
					],
					conditions: {
						'StringLike': {
							'iam:AWSServiceName': 'rds.amazonaws.com'
						}
					}
				}),
				new PolicyStatement({
					sid: 'CreateECSSLR',
					actions: ['iam:CreateServiceLinkedRole'],
					resources: [
						'arn:aws:iam::*:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS*'
					],
					conditions: {
						'StringLike': {
							'iam:AWSServiceName': 'ecs.amazonaws.com'
						}
					}
				})
				, new PolicyStatement({
					sid: 'AttachPolicy',
					actions: [
						'iam:AttachRolePolicy',
						'iam:PutRolePolicy'
					],
					resources: [
						`arn:aws:iam::*:role/aws-service-role/rds.amazonaws.com/AWSServiceRoleForRDS*`,
						`arn:aws:iam::*:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS*`,
					]
				})
			]
		});

		NagSuppressions.addResourceSuppressions(iamPolicy, [
			{
				id: 'AwsSolutions-IAM5',
				reason: 'This policy only allow the lambda to create RDS service linked role.'
			}
		]);


		const s3ExportPolicy = new Policy(this, 's3-export-policy', {
			statements: [
				new PolicyStatement({
					sid: 'S3Export',
					actions: [
						's3:PutObject',
						's3:AbortMultipartUpload'
					],
					effect: Effect.ALLOW,
					resources: [`arn:aws:s3:::sdf-*/*`]
				})
			]
		});

		const s3ExportRole = new Role(this, 's3-export-role', {
			assumedBy: new ServicePrincipal('rds.amazonaws.com')
		});

		s3ExportRole.attachInlinePolicy(s3ExportPolicy);

		NagSuppressions.addResourceSuppressions(s3ExportPolicy, [
			{
				id: 'AwsSolutions-IAM5',
				appliesTo: [
					'Resource::arn:aws:s3:::sdf-*/*'
				],
				reason: 'This policy is only for our RDS cluster to perform S3 exports to any bucket with a sdf prefix',
			},
		]);

		this.auroraSecurityGroup = new SecurityGroup(this, id.concat(`${this.instanceName}-sg`), {
			vpc: props.vpc,
			description: `${this.instanceName}-instance-sg`,
			securityGroupName: `${this.instanceName}-instance-sg`,
			allowAllOutbound: true
		});

		const databaseCredentialsSecret = new Secret(this, 'DBCredentialsSecret', {
			secretName: `${this.instanceName}-credentials`,
			generateSecretString: {
				secretStringTemplate: JSON.stringify({
					username: databaseUsername
				}),
				excludePunctuation: true,
				includeSpace: false,
				generateStringKey: 'password'
			}
		});

		databaseCredentialsSecret.addRotationSchedule('RotationSchedule', {
			hostedRotation: HostedRotation.postgreSqlSingleUser({
				functionName: `sdf-${props.domain}-dataLineage-secret-rotation`
			})
		});

		this.rdsSecretName = databaseCredentialsSecret.secretName;

		/** Version "8.0.postgresql_aurora.3.01.0". */
		const dbEngine = DatabaseClusterEngine.auroraPostgres({ version: AuroraPostgresEngineVersion.VER_14_4 });

		/**
		 let's suppose you need to create a trigger on your database,
		 this custom parameter group it's responsible to perform this with the following parameter log_bin_trust_function_creators,
		 because the default parameter group is not editable
		 */
		const parameterGroupForInstance = new ParameterGroup(this, `${this.instanceName}-${dbEngine.engineVersion?.fullVersion}`, {
			engine: dbEngine,
			description: `Aurora RDS Instance Parameter Group for database ${this.instanceName}`,
			parameters: {}
		});

		const subnetGroup = new SubnetGroup(this, 'aurora-rds-subnet-group', {
			description: `Aurora RDS Subnet Group for database ${this.instanceName}`,
			subnetGroupName: `sdf-${props.domain}-aurora-rds-subnet-group`,
			vpc: props.vpc,
			removalPolicy: RemovalPolicy.DESTROY,
			vpcSubnets: {
				subnetFilters: [SubnetFilter.byIds(props.isolatedSubnetIds)]
			},
		});

		const databaseCluster = new DatabaseCluster(this, clusterName, {
			engine: dbEngine,
			storageEncrypted: true,
			// This is the only valid option for postgresql
			cloudwatchLogsExports: ['postgresql'],
			instanceProps: {
				instanceType: new InstanceType('serverless'),
				vpc: props.vpc,
				vpcSubnets: {
					subnetFilters: [SubnetFilter.byIds(props.isolatedSubnetIds)]
				},
				securityGroups: [this.auroraSecurityGroup],
				parameterGroup: parameterGroupForInstance
			},
			backup: {
				retention: Duration.days(RetentionDays.ONE_WEEK),
				preferredWindow: '03:00-04:00'
			},
			credentials: {
				username: databaseUsername,
				password: databaseCredentialsSecret.secretValueFromJson('password')
			},
			// something wrong with the construct where it always accepts parameter as string
			deletionProtection: props.clusterDeletionProtection,
			instances: 1,
			cloudwatchLogsRetention: RetentionDays.ONE_WEEK,
			iamAuthentication: false,
			clusterIdentifier: `sdf-${props.domain}-aurora-cluster`,
			subnetGroup: subnetGroup,
			s3ExportRole
		});

		this.clusterIdentifier = databaseCluster.clusterIdentifier;

		// databaseCluster.node.addDependency(customResource);
		databaseCluster.node.addDependency(s3ExportRole);

		if (!props.clusterDeletionProtection) {
			NagSuppressions.addResourceSuppressions(databaseCluster, [
				{
					id: 'AwsSolutions-RDS10',
					reason: 'Cluster deletion protection is a configurable value (it\'s set to true by default).'
				}
			], true);
		}

		this.rdsClusterWriterEndpoint = databaseCluster.clusterEndpoint.hostname;

		// this is temporary workaround cause cdk does not have support for
		// serverlessV2ScalingConfiguration yet
		Aspects.of(databaseCluster).add({
			visit(node) {
				if (node instanceof CfnDBCluster) {
					node.serverlessV2ScalingConfiguration = {
						minCapacity: props.minClusterCapacity,
						maxCapacity: props.maxClusterCapacity
					};
				}
			}
		});

		NagSuppressions.addResourceSuppressions(databaseCluster, [
			{
				id: 'AwsSolutions-RDS6',
				reason: 'All connection to RDS is through the RDS proxy (IAM database authentication is enabled for this), RDS proxy needs to connect to RDS using database auth.'
			}
		]);

		this.auroraSecurityGroup.addIngressRule(this.auroraSecurityGroup, Port.tcp(5432), 'allow db connection');

		this.platformUsername = databaseUsername;
	}
}
