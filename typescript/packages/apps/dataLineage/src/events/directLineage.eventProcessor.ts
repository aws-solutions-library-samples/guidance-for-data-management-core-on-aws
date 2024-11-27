import { validateNotEmpty } from '@dm/validators';
import type { MarquezClient } from '@dm/clients';
import type { BaseLogger } from 'pino';
import type { RunEvent } from '@dm/events';

export class DirectLineageEventProcessor {
	constructor(
		private log: BaseLogger,
		private marquezClient: MarquezClient,
	) {
	}

	public async processDirectLineageIngestionEvent(lineage: RunEvent): Promise<void> {
		this.log.info(`EventProcessor > DirectLineageIngestion > lineage: ${JSON.stringify(lineage)}`);

		validateNotEmpty(lineage, 'lineage');
		await this.marquezClient.recordLineage(lineage);

        return;
    }
		
	

}
