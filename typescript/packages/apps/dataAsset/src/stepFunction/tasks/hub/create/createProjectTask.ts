import type { BaseLogger } from 'pino';
import type { DataAssetTask } from '../../models.js';
import { CreateProjectCommand, ListProjectsCommand, CreateFormTypeCommand , GetFormTypeCommand, DataZoneClient  } from '@aws-sdk/client-datazone';
import { SendTaskSuccessCommand, type SFNClient } from '@aws-sdk/client-sfn';

export class CreateProjectTask {

	constructor(
		private log: BaseLogger,
		private dataZoneClient: DataZoneClient,
		private readonly sfnClient: SFNClient
	) {
	}

	public async process(event: DataAssetTask): Promise<any> {
		this.log.info(`CreateProjectsTask > process > in > event: ${JSON.stringify(event)}`);
		const projectName = 'dm-project';

		let projectId = undefined;

		// Check to see if project exists
		const projects = await this.dataZoneClient.send(new ListProjectsCommand({
			domainIdentifier: event.dataAsset.catalog.domainId,
			name: projectName
		}));

		const existingProject = projects.items.find(o => o.name === projectName);

		this.log.info(`CreateProjectsTask > process > in > existingProject: ${JSON.stringify(existingProject)}`);

		// Create project if it does not exists
		if (!existingProject) {
			this.log.info(`CreateProjectsTask > process > creating project ${projectName} !!!`);
			const project = await this.dataZoneClient.send(new CreateProjectCommand({
				domainIdentifier: event.dataAsset.catalog.domainId,
				name: projectName,
				description: "default project created to store metadata forms"
			}));
			projectId = project.id;
		} else {
			projectId = existingProject.id;
			this.log.info(`CreateProjectsTask > process > project: ${projectName} exists, skipping creation !!!`);
		}


		// We set create the meta data forms if they dont exist 
		try {
			await this.dataZoneClient.send(new GetFormTypeCommand({
				domainIdentifier: event.dataAsset.catalog.domainId,
				formTypeIdentifier: `dm_profile_form`
			}))
		} catch( error) {
			this.log.info(`CreateProjectsTask > process >error ${JSON.stringify(error)} !!!`);
			//if for type not found then create it
			await this.dataZoneClient.send(new CreateFormTypeCommand({
				domainIdentifier: event.dataAsset.catalog.domainId,
				name: 'dm_profile_form',
				owningProjectIdentifier: projectId,
				model: {
					smithy: "@amazon.datazone#displayname(defaultName: \"DM_Profile_Form\")\n structure dm_profile_form\n  {\n @amazon.datazone#displayname(defaultName: \"Asset namespace\")\nlineage_asset_namespace: String\n @documentation(\"The name of the data asset in OpenLineage\")\n@amazon.datazone#displayname(defaultName: \"Asset Name\")\nlineage_asset_name: String\n @amazon.datazone#displayname(defaultName: \"Data Quality Profile Location\")\ndata_quality_profile_location: String\n @required\n@amazon.datazone#displayname(defaultName: \"Task Id\")\n @amazon.datazone#searchable\ntask_id: String\n @amazon.datazone#displayname(defaultName: \"Data Profile Location\")\ndata_profile_location: String\n  } "
				},
				status: "ENABLED",
		}));

		}

		await this.sfnClient.send(new SendTaskSuccessCommand({ output: JSON.stringify(event), taskToken: event.execution.taskToken }));

		this.log.info(`CreateProjectsTask > process > exit`);
	}


}
