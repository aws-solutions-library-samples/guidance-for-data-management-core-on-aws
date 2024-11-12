import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'df-demo-custom-resource' });

export { logger };
