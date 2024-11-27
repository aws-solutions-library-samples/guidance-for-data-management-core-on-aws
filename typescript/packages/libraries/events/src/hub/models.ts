/*
 * A place holder for outgoing events sent by the Hub
*/
type EventType = 'COMPLETE' | 'ABORT' | 'FAIL';

export interface DomainEvent<T> {
	resourceType: string;
	eventType: EventType;
	id: string;
	old?: T;
	new?: T;
	error?: Error;
}

export const ACCESS_CONTROL_HUB_EVENT_SOURCE: string = 'com.aws.dm.hub.accessControl';
export const DATA_LINEAGE_HUB_EVENT_SOURCE: string = 'com.aws.dm.hub.dataLineage';
export const DATA_ASSET_HUB_EVENT_SOURCE: string = 'com.aws.dm.hub.dataAsset';

export const DATA_ASSET_HUB_CREATE_REQUEST_EVENT =  `DM>${DATA_ASSET_HUB_EVENT_SOURCE}>create>request`

export const DATA_ZONE_EVENT_SOURCE: string = 'aws.datazone';
export const STEP_FUNCTION_EVENT_SOURCE: string = 'aws.states';

export const DATA_ZONE_DATA_SOURCE_RUN_SUCCEEDED: string = 'Data Source Run Succeeded';
export const DATA_ZONE_DATA_SOURCE_RUN_FAILED: string = 'Data Source Run Failed';

export const STEP_FUNCTION_STATUS_CHANGE: string = 'Step Functions Execution Status Change';

export interface DataAssetStepFunctionInput {
	id: string
}

export interface StepFunctionStateChangeDetail {
	executionArn: string,
	stateMachineArn: string,
    status: string,
	input: string
};

export interface StepFunctionStateChangeEvent {
    id: string,
    account: string,
    region: string,
    source: string,
    'detail-type': string,
    time: string,
    detail: StepFunctionStateChangeDetail,
};
