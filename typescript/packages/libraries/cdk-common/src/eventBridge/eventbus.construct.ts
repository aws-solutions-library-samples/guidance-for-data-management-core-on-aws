import { EventBus } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import { dmEventBusName, dmSpokeEventBusName } from './util.js';

export interface EventBusConstructProperties {
}

export class Bus extends Construct {
	public readonly eventBusName: string;
	public readonly eventBus: EventBus

	constructor(scope: Construct, id: string, isSpoke:boolean) {
		super(scope, id);

		const bus = new EventBus(this, 'EventBus', {
			eventBusName: (isSpoke)? dmSpokeEventBusName : dmEventBusName,
		});

		this.eventBus = bus;
	}
}
