import { validateNotEmpty } from '@df/validators';
import type { BaseLogger } from 'pino';
import type { DataAssetTaskStatusRepository } from './taskRepository.js';
import type { StepFunctionStateChangeEvent, DataAssetStepFunctionInput } from '@df/events';

export class StepFunctionsEventProcessor {
    constructor(
        private log: BaseLogger,
        private readonly dataAssetTaskStatusRepository: DataAssetTaskStatusRepository
    ) {
    }

    public async processStepFunctionStatusChangeEvent(event: StepFunctionStateChangeEvent): Promise<void> {
        this.log.info(`StepFunctionsEventProcessor > processStepFunctionStatusChangeEvent >in  event: ${JSON.stringify(event)}`);

        validateNotEmpty(event.detail, 'event.detail');

        const stepFunctionStateInput: DataAssetStepFunctionInput = JSON.parse(event.detail.input);
        await this.dataAssetTaskStatusRepository.updateTaskStatus(stepFunctionStateInput.id, event.detail.status);
        this.log.info(`StepFunctionsEventProcessor > processStepFunctionStatusChangeEvent >exit`);
    }
}
