import type { BaseLogger } from 'pino';
import { SFNClient, SendTaskSuccessCommand } from '@aws-sdk/client-sfn';
import { TaskType, type DataAssetTask } from '../../models.js';
import { CreateDatasetCommand, CreateDatasetCommandInput, DescribeDatasetCommand, type DataBrewClient } from '@aws-sdk/client-databrew';
import type { S3Utils } from '../../../../common/s3Utils.js';
import { SendTaskFailureCommand } from '@aws-sdk/client-sfn';

export class ProfileDataSetTask {
	constructor(private log: BaseLogger, private sfnClient: SFNClient, private dataBrewClient: DataBrewClient, private GlueDbName: string, private s3Utils: S3Utils) {}

	public async process(event: DataAssetTask): Promise<any> {
		this.log.debug(`ProfileDataSetTask > process > in > event: ${JSON.stringify(event)}`);

		const id = event.dataAsset?.catalog?.assetId ? event.dataAsset.catalog.assetId : event.dataAsset.id;

		try {
			// Check if DataSet has been created for this asset before
			try {
				this.log.debug(`ProfileDataSetTask > process > before DescribeDatasetCommand`);
				await this.dataBrewClient.send(
					new DescribeDatasetCommand({
						Name: `${id}-profileDataSet`,
					})
				);
			} catch (error) {
				this.log.debug(`ProfileDataSetTask > process > in > event: ${JSON.stringify(error)}`);
				// Create the data set if none is found
				if ((error as Error).name === 'ResourceNotFoundException') {
					const input = this.constructInputCommand(event);
					this.log.debug(`ProfileDataSetTask > process > before CreateDatasetCommand`);
					await this.dataBrewClient.send(new CreateDatasetCommand(input));
				}
			}

			await this.sfnClient.send(new SendTaskSuccessCommand({ output: JSON.stringify(event), taskToken: event.execution.taskToken }));
		} catch (error) {
			// We fail the task if any errors are encountered at this stage
			this.log.error(`ProfileDataSetTask > process  > encountered unrecoverable error transitioning to a failed state: ${JSON.stringify(error)}`);
			const asset: DataAssetTask = {
				dataAsset: event.dataAsset,
			};
			await this.s3Utils.putTaskData(TaskType.DataProfileTask, id, asset);
			const signedUrl = await this.s3Utils.getTaskDataSignedUrl(TaskType.DataProfileTask, id, 3600);
			await this.sfnClient.send(new SendTaskFailureCommand({ error: error.name, cause: JSON.stringify({ signedUrl, error }), taskToken: event.execution.taskToken }));
		}

		this.log.debug(`ProfileDataSetTask > process > exit:`);
	}

	private constructInputCommand(event: DataAssetTask): CreateDatasetCommandInput {
		this.log.debug(`ProfileDataSetTask > constructInputCommand > in > event: ${JSON.stringify(event)}`);

		// use asset id as the id if available
		const id = event.dataAsset?.catalog?.assetId ? event.dataAsset.catalog.assetId : event.dataAsset.id;
		const dataSetTempDirectory = this.s3Utils.getProfileDataSetTempLocation(id, event.dataAsset.catalog.domainId, event.dataAsset.catalog.projectId);
		let input: CreateDatasetCommandInput = {
			Name: `${id}-profileDataSet`,
			Tags: {
				domainId: event.dataAsset.catalog.domainId,
				projectId: event.dataAsset.catalog.projectId,
				assetName: event.dataAsset.catalog.assetName,
				assetId: event.dataAsset.catalog.assetId,
				id: event.dataAsset.id,
			},
			Input: {
				DataCatalogInputDefinition: {
					// CatalogId: event.dataAsset.catalog.accountId,
					DatabaseName: this.GlueDbName, // Check if in execution
					TableName: event.dataAsset.execution.glueTableName,
					TempDirectory: dataSetTempDirectory,
				},
			},
		};

		this.log.debug(`ProfileDataSetTask > constructInputCommand > exit`);
		return input;
	}
}
