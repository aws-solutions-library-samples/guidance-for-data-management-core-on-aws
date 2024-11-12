import type { BaseLogger } from 'pino';
import { TaskType, type DataAssetTask } from '../../models.js';
import { CreateRecipeJobCommand, type DataBrewClient, StartJobRunCommand } from '@aws-sdk/client-databrew';
import { S3Utils } from '../../../../common/s3Utils.js';
import { SendTaskFailureCommand, SFNClient } from '@aws-sdk/client-sfn';

export class TransformJobTask {
	constructor(
		private log: BaseLogger,
		private dataBrewClient: DataBrewClient,
		private jobsBucket: string,
		private jobsBucketPrefix: string,
		private s3Utils: S3Utils,
		private sfnClient: SFNClient
	) {}

	public async process(event: DataAssetTask): Promise<any> {
		this.log.info(`TransformJobTask > process > in > event: ${JSON.stringify(event)}`);

		const id = event.dataAsset?.catalog?.assetId ? event.dataAsset.catalog.assetId : event.dataAsset.id;
		const recipeName = `df-${id}`;

		const jobName = `${event.dataAsset.workflow.name}-${id}-profile`;
		const outputKey = `${this.jobsBucketPrefix}/${event.dataAsset.catalog.domainId}/${event.dataAsset.catalog.projectId}/${id}`;

		try {
			// Create the Transform Job
			const res = await this.dataBrewClient.send(
				new CreateRecipeJobCommand({
					Name: jobName,
					DatasetName: id,
					RoleArn: event.dataAsset.workflow.roleArn,
					RecipeReference: {
						Name: recipeName,
					},
					Outputs: [
						{
							Location: {
								Bucket: this.jobsBucket,
								Key: outputKey,
							},
						},
					],
					Tags: {
						...event.dataAsset.workflow?.tags,
						// Default tags that are added for lineage and enrichment purposes
						domainId: event.dataAsset.catalog.domainId,
						projectId: event.dataAsset.catalog.projectId,
						assetName: event.dataAsset.catalog.assetName,
						assetId: event.dataAsset.catalog.assetId,
						executionId: event.execution.executionId,
						executionToken: event.execution.taskToken,
					},
				})
			);

			// Run the Job if the job is on Demand
			await this.dataBrewClient.send(new StartJobRunCommand({ Name: res.Name }));
		} catch (error) {
			// We fail the task if any errors are encountered at this stage
			this.log.error(`TransformJobTask > process  > encountered unrecoverable error transitioning to a failed state: ${JSON.stringify(error)}`);

			const asset: DataAssetTask = {
				dataAsset: event.dataAsset,
			};
			await this.s3Utils.putTaskData(TaskType.TransformJobTask, id, asset);
			const signedUrl = await this.s3Utils.getTaskDataSignedUrl(TaskType.TransformJobTask, id, 3600);
			await this.sfnClient.send(new SendTaskFailureCommand({ error: error.name, cause: JSON.stringify({ signedUrl, error }), taskToken: event.execution.taskToken }));
		}

		this.log.info(`TransformJobTask > process > exit:`);
	}
}
