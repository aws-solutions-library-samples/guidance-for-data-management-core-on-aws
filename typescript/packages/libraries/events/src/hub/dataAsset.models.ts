import type { DataAsset } from "../common/dataAsset.models.js";

export interface dataAssetHubCreateRequestEvent {
    EventBusName: string,
    Source: string,
    DetailType: string,
    Detail: DataAsset,
};

export type {dataAssetHubCreateRequestEvent as DataAssetHubCreateRequestEvent};