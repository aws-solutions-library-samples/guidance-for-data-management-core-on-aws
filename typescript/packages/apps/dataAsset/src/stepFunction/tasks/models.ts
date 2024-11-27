import type { Handler } from 'aws-lambda';
import type { DataAssetCatalog, RunEvent } from '@dm/events';
import type { Workflow } from '../../api/dataAssetTask/schemas.js';

export enum TaskType {
	Root = 'dm_data_asset',
	DataProfileTask = 'dm_data_profile',
	DataQualityProfileTask = 'dm_data_quality_profile',
	RecipeTask = 'dm_recipe',
	GlueCrawlerTask = 'dm_glue_crawler',
	LineageTask = 'dm_data_lineage',
	FailureTask = 'dm_failure',
	CreateDataSourceTask = 'dm_create_data_source',
	RunDataSourceTask = 'dm_run_data_source',
	DataSetTask = 'dm_data_set',
	TransformJobTask = 'dm_transform_job',
	SpokeEventProcessor = 'dm_spoke_event_processor',
}

export type DataAssetJob = {
	id: string;
	startTime?: string;
	stopTime?: string;
	status?: string;
	message?: string;
	outputPath?: string;
};

export type DataAssetExecution = {
	// Hub State Machine
	hubExecutionId: string;
	hubStartTime: string;
	hubStateMachineArn: string;
	hubTaskToken: string;
	// Spoke State Machine
	spokeExecutionId?: string;
	dataProfileJob?: DataAssetJob;
	dataQualityProfileJob?: DataAssetJob;
	recipeJob?: DataAssetJob;
	dataSourceCreation?: DataAssetJob;
	dataSourceRun?: DataAssetJob;
	crawlerRun?: DataAssetJob;
	glueDeltaDetected?: boolean;
	glueTableName?: string;
	glueDatabaseName?: string;
};

export type DataAssetDetails = {
	id: string;
	idcUserId: string;
	catalog: DataAssetCatalog;
	workflow: Workflow;
	execution?: DataAssetExecution;
	lineage: {
		root?: Partial<RunEvent>;
		dataProfile?: Partial<RunEvent>;
		dataQualityProfile?: Partial<RunEvent>;
	};
};

export type DataAssetTaskExecutionDetails = {
	executionId: string;
	executionStartTime: string;
	stateMachineArn: string;
	taskToken?: string;
};

export type DataAssetEventBridgeEvent = {
	'detail-type': string;
	source: string;
	account: string;
	region: string;
	detail: DataAssetDetails;
};

export type DataAssetEvent = {
	dataAssetEvent: DataAssetDetails;
	execution?: DataAssetTaskExecutionDetails;
};

export type DataAssetTask = {
	dataAsset: DataAssetDetails;
	execution?: DataAssetTaskExecutionDetails;
};

export type DataAssetTasks = {
	dataAssets: DataAssetDetails[];
	execution?: DataAssetTaskExecutionDetails;
};

export type TaskFailureEvent = {
	errorName: string;
	errorCause: string;
	execution?: DataAssetTaskExecutionDetails;
};

export type DataAssetEventHandler = Handler<DataAssetEvent>;
export type DataAssetTaskHandler = Handler<DataAssetTask>;
export type DataAssetTasksHandler = Handler<DataAssetTasks>;
export type FailureTaskHandler = Handler<TaskFailureEvent>;
