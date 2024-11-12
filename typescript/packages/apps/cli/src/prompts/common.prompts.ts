import { ListRegionsCommand } from '@aws-sdk/client-account';
import { confirm, input, select } from '@inquirer/prompts';
import { diContainer } from '../di';
import { asValue } from 'awilix';
import axios from 'axios';

export type AWSServicePrice = {
	id: string;
	attributes: {
		'aws:region': string;
		'aws:serviceName': string;
	};
};

export type AWSServiceList = {
	prices: AWSServicePrice[];
};

export const bomb = (message?: string): void => {
	console.log(`\n${message ?? 'Aborted.'}\n`);
	process.exit(1);
};

export const continueOrAbortConfirm = async (message: string, abortMessage?: string): Promise<void> => {
	const continueWithInstall = await confirm({ message });
	if (!continueWithInstall) {
		bomb(abortMessage);
	}
};

// export const awsProfileSelect = async () => {
//     const getProfileData =  async (init: SourceProfileInit = {}):Promise<ParsedIniData> => await parseKnownFiles(init);
//     const profiles = Object.keys(await getProfileData());

//     const profile = await select({
//         message: 'Select an AWS profile',
//         choices: profiles.map((profile) => ({
//           name: profile,
//           value: profile,
//         })),
//       });

//       diContainer.register({
//         profile: asValue(profile!),
//       });
//       return profile!;

// };

// const getAccountId = async (): Promise<string> => {
// 	const response = await cradle.stsClient.send(new GetCallerIdentityCommand());
// 	return response.Account!;
// };

export const awsRegionSelect = async (): Promise<string> => {
	const response = await axios.get('https://api.regional-table.region-services.aws.a2z.com/index.json');
	const serviceList: AWSServiceList = response.data;

	// We only get regions that have AWS IAM Identity Center
	const region = await select({
		message: 'Select an AWS region',
		choices: serviceList.prices
			.filter((i) => i.attributes['aws:serviceName'] === 'AWS IAM Identity Center')
			.map((i) => ({
				name: i.attributes['aws:region'] as string,
				value: i.attributes['aws:region'] as string,
			})),
	});

	diContainer.register({
		region: asValue(region!),
	});

	return region!;
};

export const enterEmail = async (message: string): Promise<string> => {
	const adminEmail = await input({
		message,
		validate: (value) => validateContains(value, '@'),
	});
	return adminEmail;
};

// export const accountAndRegionConfirm = async (answers: Answers): Promise<void> => {
// 	let accountId: string | undefined;
// 	try {
// 		accountId = await getAccountId();
// 	} catch (e) {
// 		const err = e as Error;
// 		bomb(`Error retrieving account ID - ${err.message}.`);
// 	}
// 	const region = diContainer.cradle.region;
// 	await continueOrAbortConfirm(`Confirm AWS Account Id '${accountId}', region '${region}'?`);
// 	answers.accountId = accountId;
// 	answers.region = region;
// };

export const validateStartsWith = (value: string, startsWith: string): boolean | string => {
	if (!value.startsWith(startsWith)) {
		return `Must start with '${startsWith}'`;
	}
	return true;
};

export const validateContains = (value: string, contains: string): boolean | string => {
	if (value.indexOf(contains) == -1) {
		return `Must contain '${contains}'`;
	}
	return true;
};
