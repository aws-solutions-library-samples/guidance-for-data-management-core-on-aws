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

type RestrictedAnswers = {
	user: {
		userName?: string;
		email?: string;
		displayName?: string;
		firstName?: string;
		lastName?: string;
	};
};

export type Answers = {
	accountId?: string;
	IamIdentityCenterAccountId?: string;
	hubAccountId?: string;
	spokeAccountId?: string;
	region?: string;

	/**
	 * Parameters for infrastructure-demo
	 */
	IdentityStoreAdminUserId?: string;
	deployDemoHub?: boolean;
	deployDemoSpoke?: boolean;
	deployDemoManagement?: boolean;
	identityStoreId?: string;
	identityStoreRoleArn?: string;
	identityStoreRegion?: string;
	ssoRegion?: string;
	adminEmail?: string;
	identityStoreApplicationArn?: string;
	samlMetaDataUrl?: string;

	/**
	 * required for infrastructure-hub
	 */
	orgId?: string;
	orgRootId?: string;
	orgOuId?: string;
	createOrgOu?: boolean;
	useExistingVpc?: boolean;
	existingVpcId?: string;
	existingVpcPublicSubnetIds?: string[];
	existingVpcPrivateSubnetIds?: string[];
	existingVpcIsolatedSubnetIds?: string[];

	callbackUrls?: string;
	loadBalancerCertificateArn?: string;
	/**
	 * DataZone parameters
	 */
	dataZoneDomainName?: string;
	dataZoneDomainId?: string;
	dataZoneDomainDescription?: string;
	dataZoneDomainExecutionRoleArn?: string;
	dataZonePortalUrl?: string;
	dataZoneProjectId?: string;
	dataZoneDomainIsDeployed?: boolean;
	dataZoneGlueAccessRoleArn?: string;
	dataZoneRedshiftAccessRoleArn?: string;
	dataZoneDataLakeEnvironmentId?: string;
	dataZoneDataLakeEnvironmentName?: string;
	dataZoneDataLakeEnvironmentRoleArn?: string;
	dataLakeS3Location?: string;
	dataZoneRedshiftEnvironmentId?: string;
	dataZoneRedshiftEnvironmentName?: string;

	/**
	 * Spoke Parameters
	 */
	spokeCdkExecutionRole?: string;
	spokeGlueDatabaseName?: string;
	spokeBucketArn?: string;
	spokeBucketName?: string;
	spokeGlueRoleArn?: string;
	spokeGlueRoleName?: string;

	/**
	 * Delete Parameters
	 */

	deleteDemo?: boolean;
	deleteSpoke?: boolean;
	deleteHub?: boolean;

	/**
	 * Restricted Answers section that will removed from the SSM parameter
	 */

	restricted?: RestrictedAnswers;
};
