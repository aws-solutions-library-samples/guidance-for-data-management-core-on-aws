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

import { DescribeRouteTablesCommand, DescribeSubnetsCommand, DescribeVpcsCommand, type EC2Client, type Subnet, type Vpc } from '@aws-sdk/client-ec2';
import { input, select } from '@inquirer/prompts';
import interactiveList from 'inquirer-interactive-list-prompt';
import { select as multiselect } from 'inquirer-select-pro';
import type { Ora } from 'ora';
import type { BaseLogger } from 'pino';
import { bomb, validateStartsWith } from '../../../prompts/common.prompts.ts';
import type { Answers } from '../../answers.ts';
import { PromptHandler } from '../../../prompts/base.handler.ts';

export class VPCPromptHandler extends PromptHandler {
	constructor(private readonly logger: BaseLogger, private readonly ec2Client: EC2Client) {
		super();
	}
	public override async handle(answers: Answers, spinner: Ora): Promise<Answers> {
		await this.selectUseExistingVPC(answers);

		if (answers.useExistingVpc) {
			/**
			 * get vpc id
			 * */
			try {
				await this.selectExistingVPCID(answers, spinner);
			} catch (e) {
				spinner.fail((e as Error).message);
				await this.enterExistingVPCID(answers);
			}

			if (!answers.existingVpcId) {
				bomb('No VPC selected. Please create a new VPC if need be, then select an existing one by resuming the install.');
			}

			/**
			 *  list subnets for vpc
			 * */
			const subnets = await this.listSubnets(answers, spinner);

			/**
			 * figure out the types of subnets
			 */
			const publicSubnets: Subnet[] = [],
				privateSubnets: Subnet[] = [],
				isolatedSubnets: Subnet[] = [];
			try {
				for (let i = 0; i < subnets.length; i++) {
					spinner.start(`Analyzing subnets (${i + 1}/${subnets.length})`);
					await this.categorizeSubnets(subnets[i], publicSubnets, privateSubnets, isolatedSubnets);
				}
				spinner.succeed('Subnets analyzed');

				const subnetVerification = (subnetsOfSameType: Subnet[], type: string) => {
					if (subnetsOfSameType.length === 0) {
						bomb(`No ${type} subnets found for the selected VPC. Please create new subnets, or resume the installer and select a different VPC.`);
					}
				};
				subnetVerification(publicSubnets, 'PUBLIC');
				subnetVerification(privateSubnets, 'PRIVATE');
				subnetVerification(isolatedSubnets, 'ISOLATED');
			} catch (e) {
				spinner.fail((e as Error).message);
			}

			answers.existingVpcPublicSubnetIds = await this.promptForSubnets(publicSubnets, 'PUBLIC');
			answers.existingVpcPrivateSubnetIds = await this.promptForSubnets(privateSubnets, 'PRIVATE');
			answers.existingVpcIsolatedSubnetIds = await this.promptForSubnets(isolatedSubnets, 'ISOLATED');
		}
		return super.handle(answers, spinner);
	}

	private async promptForSubnets(subnetsOfSameType: Subnet[], type: string): Promise<string[]> {
		if (subnetsOfSameType.length > 0) {
			return (await multiselect({
				message: `Select the ${type} subnet IDs`,
				options: subnetsOfSameType.map((s) => ({
					name: `${s.SubnetId} (${s.AvailabilityZone})`,
					value: s.SubnetId,
				})),
			})) as string[];
		} else {
			return (
				await input({
					message: `Enter the ${type} subnet IDs separated with a comma (unable to retrieve automatically)`,
					validate: (value) => validateStartsWith(value, 'subnet-'),
				})
			).split(',');
		}
	}

	private async categorizeSubnets(subnet: Subnet, publicSubnets: Subnet[], privateSubnets: Subnet[], isolatedSubnets: Subnet[]) {
		const routeTables = await this.ec2Client.send(
			new DescribeRouteTablesCommand({
				Filters: [
					{
						Name: 'association.subnet-id',
						Values: [subnet.SubnetId!],
					},
				],
			})
		);
		if (routeTables.RouteTables?.some((rt) => rt.Routes?.some((r) => r.GatewayId?.startsWith('igw-')))) {
			publicSubnets.push(subnet);
		} else if (routeTables.RouteTables?.some((rt) => rt.Routes?.some((r) => r.NatGatewayId))) {
			privateSubnets.push(subnet);
		} else {
			isolatedSubnets.push(subnet);
		}
	}

	private async listSubnets(answers: Answers, spinner: Ora): Promise<Subnet[]> {
		const subnets: Subnet[] = [];
		try {
			spinner.start('Retrieving subnets');
			let nextToken: string | undefined;
			do {
				const response = await this.ec2Client.send(
					new DescribeSubnetsCommand({
						Filters: [
							{
								Name: 'vpc-id',
								Values: [answers.existingVpcId!],
							},
						],
					})
				);
				subnets.push(...response.Subnets!);
				nextToken = response.NextToken;
			} while (nextToken);

			spinner.succeed(`Retrieving subnets (${subnets.length} found)`);
		} catch (e) {
			spinner.fail((e as Error).message);
		}
		return subnets;
	}

	private async enterExistingVPCID(answers: Answers) {
		answers.existingVpcId = await input({
			message: 'Enter the existing VPC ID (unable to retrieve automatically)',
			validate: (value) => validateStartsWith(value, 'vpc-'),
		});
	}

	private async selectExistingVPCID(answers: Answers, spinner: Ora) {
		spinner.start('Retrieving VPCs');
		const vpcs: Vpc[] = [];
		let nextToken: string | undefined;
		do {
			const response = await this.ec2Client.send(new DescribeVpcsCommand());
			vpcs.push(...response.Vpcs!);
			nextToken = response.NextToken;
		} while (nextToken);

		spinner.succeed(`Found ${vpcs.length} VPCs`);
		answers.existingVpcId = await select({
			message: 'Select the VPC',
			choices: vpcs.map((v) => ({
				name: `${v.VpcId} (${v.Tags?.filter((t) => t.Key === 'Name')?.[0].Value ?? 'No name'})`,
				value: v.VpcId,
			})),
		});
	}

	private async selectUseExistingVPC(answers: Answers) {
		answers.useExistingVpc =
			(await interactiveList({
				message: 'Deploy into an existing VPC, or create a new one?',
				default: 'n',
				choices: [
					{
						key: 'e',
						name: 'Existing',
						value: 'existing',
					},
					{
						key: 'n',
						name: 'New',
						value: 'new',
					},
				],
			})) === 'existing';
	}
}
