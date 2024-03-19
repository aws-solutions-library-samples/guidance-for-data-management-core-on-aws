import type { BaseLogger } from 'pino';
import { type DataAssetTask, TaskType } from '../../models.js';
import { CrawlerTargets, CreateCrawlerCommand, CreateCrawlerCommandInput, GetCrawlerCommand, GlueClient, StartCrawlerCommand, UpdateCrawlerCommand } from '@aws-sdk/client-glue';
import { ulid } from 'ulid';
import { ConnectionTask } from './connectionTask.js';
import type { S3Utils } from '../../../../common/s3Utils.js';

export class GlueCrawlerTask {
    constructor(private log: BaseLogger,
                private glueClient: GlueClient,
                private glueDatabaseName: string,
                private s3Utils: S3Utils
    ) {
    }


    public async process(event: DataAssetTask): Promise<any> {
        this.log.debug(`GlueCrawlerTask > process > in > event: ${JSON.stringify(event)}`);

        // Use assetId if it exists else no asset exists so use the id
        const id = (event.dataAsset.catalog?.assetId) ? event.dataAsset.catalog.assetId : event.dataAsset.id;
        const crawlerName = `${event.dataAsset.workflow.name}-${id}-crawler`;

        const command = await this.createCrawlerCommandInput(event);

        try {
            // Update the crawler if it exists
            await this.glueClient.send(new GetCrawlerCommand({Name: crawlerName}));
            await this.glueClient.send(new UpdateCrawlerCommand(command));
        } catch (error) {
            this.log.debug(`GlueCrawlerTask > process  > error: ${JSON.stringify(error)}`);
            // Create the Crawler if no crawler exists
            if ((error as Error).name === 'EntityNotFoundException') {
                await this.glueClient.send(new CreateCrawlerCommand(command));
            }
        }

        await this.glueClient.send(new StartCrawlerCommand({
            Name: crawlerName
        }));

        // We store the task input in s3 for later use

        await this.s3Utils.putTaskData(TaskType.GlueCrawlerTask, id, event);

        this.log.debug(`GlueCrawlerTask > process > exit`);
    }

    private async createCrawlerCommandInput(event: DataAssetTask): Promise<CreateCrawlerCommandInput> {
        this.log.debug(`GlueCrawlerTask > createCrawlerCommandInput > in`);

        const asset = event.dataAsset;
        // Use assetId if it exists else no asset exists so use the id
        const id = (asset.catalog?.assetId) ? asset.catalog.assetId : asset.id

        const crawlerName = `${asset.workflow.name}-${id}-crawler`;

        // Create Lineage event
        const lineageRunId = ulid().toLowerCase();

        // Create default profile job
        const command: CreateCrawlerCommandInput = {
            Name: crawlerName,
            Role: asset.workflow.roleArn,
            DatabaseName: this.glueDatabaseName,
            Targets: this.getCrawlerTargets(event),
            TablePrefix: `df-${event.dataAsset.catalog.assetName}-${id}-`,
            LakeFormationConfiguration: {
                UseLakeFormationCredentials: false
            },
            Tags: {
                ...asset.workflow?.tags,
                // Default tags that are added for lineage and enrichment purposes
                domainId: event.dataAsset.catalog.domainId,
                projectId: event.dataAsset.catalog.projectId,
                assetName: event.dataAsset.catalog.assetName,
                assetId: event.dataAsset.catalog.assetId,
                id: event.dataAsset.id,
                LineageRunId: lineageRunId,
                executionArn: event.execution.executionId
            }
        }

        this.log.debug(`GlueCrawlerTask > createCrawlerCommandInput >exit  command:${JSON.stringify(command)}`);

        return command;

    }

	private getCrawlerTargets(event: DataAssetTask): CrawlerTargets {
		const connection = event.dataAsset.workflow.dataset.connection;
		this.log.debug(`GlueCrawlerTask > getCrawlerTargets > in`);

		let targets: CrawlerTargets = {};
		// Get the connection key
		// We only support a single target for now
        if (event.dataAsset.execution.recipeJob) {
            const id = (event.dataAsset.catalog?.assetId) ? event.dataAsset.catalog.assetId : event.dataAsset.id;
            targets = {
                S3Targets: [
                    {
                        Path: this.s3Utils.getRecipeJobOutputLocationPath(id, event.dataAsset.catalog.domainId, event.dataAsset.catalog.projectId)
                    }
                ]
            }
        } else {
            switch (Object.keys(connection)[0]) {
                case 'dataLake':
                    targets = {
                        S3Targets: [
                            {
                                Path: event.dataAsset.workflow.dataset.connection.dataLake.s3.path
                            }
                        ]
                    }
                    break;
                case 'glue':
                    // TODO, NOT needed for demo
                    break;
                case 'redshift':
                    targets = {
                        JdbcTargets: [
                            {
                                ConnectionName: ConnectionTask.getConnectionName(event),
                                Path: event.dataAsset.workflow.dataset.connection.redshift.path
                            }
                        ]
                    }
                    break;
                default:
                    break;
            }
        }
		this.log.debug(`GlueCrawlerTask > getCrawlerTargets > out: ${JSON.stringify(targets)}`);

        return targets;
    }

}
