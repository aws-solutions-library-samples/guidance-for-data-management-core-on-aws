import { CompositePrincipal, ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface IAMConstructProperties {}

export class IAMConstruct extends Construct {
	public readonly glueRoleArn: string;
	public readonly glueRoleName: string;

	constructor(scope: Construct, id: string, props: IAMConstructProperties) {
		super(scope, id);

		/*
		 * Create the role that will be provided to DM when creating assets. DM will pass this role to Glue and Glue DataBrew as needed.
		 * */

		const glueRole = new Role(this, 'GlueRole', {
			assumedBy: new CompositePrincipal(new ServicePrincipal('databrew.amazonaws.com'), new ServicePrincipal('glue.amazonaws.com')),
		});
		['AmazonS3FullAccess'].forEach((policyName) => glueRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(policyName)));

		// Have to add this policy seperately since ManagedPolicy resolves to an incorrect ARN
		glueRole.addManagedPolicy({ managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSGlueDataBrewServiceRole' });
		glueRole.addManagedPolicy({ managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole' });

		this.glueRoleArn = glueRole.roleArn;
		this.glueRoleName = glueRole.roleName;

		NagSuppressions.addResourceSuppressions(
			[glueRole],
			[
				{
					id: 'AwsSolutions-IAM4',
					appliesTo: [
						'Policy::arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole',
						'Policy::arn:aws:iam::aws:policy/service-role/AWSGlueDataBrewServiceRole',
						'Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonS3FullAccess',
					],
					reason: 'The resource condition in the IAM policy is generated by CDK, this only applies to xray:PutTelemetryRecords and xray:PutTraceSegments actions.',
				},
			],
			true
		);
	}
}
