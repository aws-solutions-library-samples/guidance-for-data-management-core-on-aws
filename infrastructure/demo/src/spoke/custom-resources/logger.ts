import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'dm-demo-custom-resource' });

export { logger };
