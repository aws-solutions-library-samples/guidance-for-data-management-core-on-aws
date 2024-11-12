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

import { $ } from 'bun';
import type { ListrTask } from 'listr2';
import type { Answers } from '../../answers.js';
import { TasksHandler } from '../../../tasks/base.handler.ts';
import { bomb } from '../../../prompts/common.prompts.js';
import { switchToICli } from '../../../utils/shell.js';

export const loadBalancerCertificateArnParameter = `/df/datazone/loadBalancerCertificateArn`;

export class CertTasksHandler extends TasksHandler {
	protected override getLinuxTasks(): ListrTask[] {
		return this.getMacTasks();
	}

	protected override getMacTasks(): ListrTask[] {
		return [
			{
				title: 'Generating load balancer certificate.',
				task: async (): Promise<void> => {
					try {
						await switchToICli();
						await $`openssl genrsa 2048 > data-fabric.private.key`.quiet();
						await $`openssl req -new -x509 -nodes -sha1 -days 3650 -extensions v3_ca -subj '/CN=df.amazonaws.com' -key data-fabric.private.key > data-fabric.public.crt`.quiet();
					} catch (e) {
						this.logger.error(e);
					}
				},
			},
			{
				title: 'Uploading load balancer certificate.',
				task: async (ctx: Answers): Promise<void> => {
					try {
						const response =
							await $`aws acm import-certificate --certificate fileb://data-fabric.public.crt --private-key fileb://data-fabric.private.key --region ${ctx.region}`.quiet();
						const loadBalancerCertificateArnStr = Buffer.from(response.stdout).toString('utf-8');
						const loadBalancerCertificateArn = JSON.parse(loadBalancerCertificateArnStr)?.['CertificateArn'] as string;

						await $`aws ssm put-parameter --name ${loadBalancerCertificateArnParameter} --value ${loadBalancerCertificateArn} --type String --overwrite`.quiet();
						ctx.loadBalancerCertificateArn = loadBalancerCertificateArn;
					} catch (e) {
						this.logger.error(e);
						bomb('Failed to upload the certificate !!!');
					}
				},
			},
		];
	}

	protected override getWindowsTasks(): ListrTask[] {
		return [
			{
				title: 'Generating load balancer certificate.',
				task: async (): Promise<void> => {
					try {
						await switchToICli();
						await $`openssl genrsa -out data-fabric.private.key 2048`.quiet();
						await $`openssl req -new -x509 -nodes -sha1 -days 3650 -extensions v3_ca -subj "/CN=df.amazonaws.com" -key data-fabric.private.key -out data-fabric.public.crt`.quiet();
					} catch (e) {
						this.logger.error(e);
					}
				},
			},
			{
				title: 'Uploading load balancer certificate.',
				task: async (ctx: Answers): Promise<void> => {
					try {
						const response =
							await $`aws acm import-certificate --certificate fileb://data-fabric.public.crt --private-key fileb://data-fabric.private.key --region ${ctx.region}`.quiet();
						const loadBalancerCertificateArnStr = Buffer.from(response.stdout).toString('utf-8');
						const loadBalancerCertificateArn = JSON.parse(loadBalancerCertificateArnStr)?.['CertificateArn'] as string;

						await $`aws ssm put-parameter --name ${loadBalancerCertificateArnParameter} --value ${loadBalancerCertificateArn} --type String --overwrite`.quiet();
						ctx.loadBalancerCertificateArn = loadBalancerCertificateArn;
					} catch (e) {
						this.logger.error(e);
						bomb('Failed to upload the certificate !!!');
					}
				},
			},
		];
	}
}
