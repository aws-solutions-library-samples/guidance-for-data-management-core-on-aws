import { Bus, OrganizationUnitPath } from "@dm/cdk-common";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

export interface EventBusSpokeConstructProps {
  hubAccountId: string;
  orgPath: OrganizationUnitPath;
}

export class EventBusSpoke extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: EventBusSpokeConstructProps
  ) {
    super(scope, id);

    // DM Spoke Event Bus
    const dmSpokeEventBus = new Bus(this, "SpokeEventBus", true);

    // Allow hub account to put events to this event bus
    dmSpokeEventBus.eventBus.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowHubAccountToPutEvents",
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal(props.hubAccountId)],
        actions: ["events:PutEvents"],
        resources: [dmSpokeEventBus.eventBus.eventBusArn],
        conditions: {
          "ForAnyValue:StringEquals": {
            "aws:PrincipalOrgPaths": `${props.orgPath.orgId}/${props.orgPath.rootId}/${props.orgPath.ouId}/`,
          },
        },
      })
    );
  }
}
