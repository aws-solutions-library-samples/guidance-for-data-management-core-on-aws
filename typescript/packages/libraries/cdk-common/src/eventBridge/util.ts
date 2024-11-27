export const dmEventBusName = `dm-Shared-Bus`;
export const dmEventBusArn = (accountId: string, region: string) => `arn:aws:events:${region}:${accountId}:event-bus/${dmEventBusName}`;
export const dmSpokeEventBusName = `dm-Spoke-Shared-Bus`;
export const dmSpokeEventBusArn = (accountId: string, region: string) => `arn:aws:events:${region}:${accountId}:event-bus/${dmSpokeEventBusName}`;
