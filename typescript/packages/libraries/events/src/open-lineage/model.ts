import type { ACCESS_CONTROL_HUB_EVENT_SOURCE } from "../hub/models.js";
import { DATA_LINEAGE_SPOKE_EVENT_SOURCE } from "../spoke/models.js";
import { DATA_LINEAGE_HUB_EVENT_SOURCE } from "../hub/models.js";

export type EventSource = typeof ACCESS_CONTROL_HUB_EVENT_SOURCE;


export type ColumnMetric = {
    /**
     * The number of null values in this column for the rows evaluated
     */
    nullCount?: number
    /**
     * The number of distinct values in this column for the rows evaluated
     */
    distinctCount?: number
    /**
     * The total sum of values in this column for the rows evaluated
     */
    sum?: number
    /**
     * The number of values in this column
     */
    count?: number
    min?: number
    max?: number
    /**
     * The property key is the quantile. Examples: 0.1 0.25 0.5 0.75 1
     */
    quantiles?: {
        [k: string]: number
    }
    [k: string]: unknown
}

/**
 * Input Dataset Facet.
 */

export type OutputStatisticsOutputDatasetFacet = OutputDatasetFacet & {
    /**
     * The number of rows written to the dataset
     */
    rowCount: number
    /**
     * The size in bytes written to the dataset
     */
    size?: number
    [k: string]: unknown
}

/**
 * Output Dataset Facet.
 */

export type DataQualityMetricsInputDatasetFacet = InputDatasetFacet & {
    /**
     * The number of rows evaluated
     */
    rowCount?: number
    /**
     * The size in bytes
     */
    bytes?: number
    /**
     * The property key is the column name
     */
    columnMetrics: {
        [k: string]: ColumnMetric
    }
    [k: string]: unknown
}


/**
 * Job Facet.
 */

export type JobTypeJobFacet = JobFacet & {
    /**
     * Job processing type like: BATCH or STREAMING
     */
    processingType: string
    /**
     * OpenLineage integration type of this job: SPARK|DBT|AIRFLOW|FLINK
     */
    integration: string
    /**
     * Run type like: QUERY|COMMAND|DAG|TASK|JOB|MODEL
     */
    jobType?: string
    [k: string]: unknown
}

export type SQLJobFacet = JobFacet & {
    query: string
    [k: string]: unknown
}

export type SourceCodeLocationJobFacet = JobFacet & {
    /**
     * the source control system
     */
    type: string
    /**
     * the full http URL to locate the file
     */
    url: string
    /**
     * the URL to the repository
     */
    repoUrl?: string
    /**
     * the path in the repo containing the source files
     */
    path?: string
    /**
     * the current version deployed (not a branch name, the actual unique version)
     */
    version?: string
    /**
     * optional tag name
     */
    tag?: string
    /**
     * optional branch name
     */
    branch?: string
    [k: string]: unknown
}

export type SourceCodeJobFacet = JobFacet & {
    /**
     * Language in which source code of this job was written.
     */
    language: string
    /**
     * Source code of this job.
     */
    sourceCode: string
    [k: string]: unknown
}


export type OwnershipJobFacet = JobFacet & {
    /**
     * The owners of the job.
     */
    owners?: {
        /**
         * the identifier of the owner of the Job. It is recommended to define this as a URN. For example application:foo, user:jdoe, team:data
         */
        name: string
        /**
         * The type of ownership (optional)
         */
        type?: string
        [k: string]: unknown
    }[]
    [k: string]: unknown
}

export type DocumentationJobFacet = JobFacet & {
    /**
     * The description of the job.
     */
    description: string
    [k: string]: unknown
}

/**
 * Run Facet.
 */

/**
 * the id of the parent run and job, if this run was spawn from an other run (for example, the Dag run scheduling its tasks)
 */
export type ParentRunFacet = RunFacet & {
    run: {
        /**
         * The globally unique ID of the run associated with the job.
         */
        runId: string
        [k: string]: unknown
    }
    job: {
        /**
         * The namespace containing that job
         */
        namespace: string
        /**
         * The unique name for that job within that namespace
         */
        name: string
        [k: string]: unknown
    }
    [k: string]: unknown
}

export type NominalTimeRunFacet = RunFacet & {
    /**
     * An [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601) timestamp representing the nominal start time (included) of the run. AKA the schedule time
     */
    nominalStartTime: string
    /**
     * An [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601) timestamp representing the nominal end time (excluded) of the run. (Should be the nominal start time of the next run)
     */
    nominalEndTime?: string
    [k: string]: unknown
}

export type ExternalQueryRunFacet = RunFacet & {
    /**
     * Identifier for the external system
     */
    externalQueryId: string
    /**
     * source of the external query
     */
    source: string
    [k: string]: unknown
}

export type ErrorMessageRunFacet = RunFacet & {
    /**
     * A human-readable string representing error message generated by observed system
     */
    message: string
    /**
     * Programming language the observed system uses.
     */
    programmingLanguage: string
    /**
     * A language-specific stack trace generated by observed system
     */
    stackTrace?: string
    [k: string]: unknown
}

/**
 * Dataset Facet.
 */

export type DatasetVersionDatasetFacet = DatasetFacet & {
    /**
     * The version of the dataset.
     */
    datasetVersion: string
    [k: string]: unknown
}

export type SymlinksDatasetFacet = DatasetFacet & {
    identifiers?: {
        /**
         * The dataset namespace
         */
        namespace: string
        /**
         * The dataset name
         */
        name: string
        /**
         * Identifier type
         */
        type: string
        [k: string]: unknown
    }[]
    [k: string]: unknown
}


export type StorageDatasetFacet = DatasetFacet & {
    /**
     * Storage layer provider with allowed values: iceberg, delta.
     */
    storageLayer: string
    /**
     * File format with allowed values: parquet, orc, avro, json, csv, text, xml.
     */
    fileFormat?: string
    [k: string]: unknown
}

export type SchemaDatasetFacet = DatasetFacet & {
    /**
     * The fields of the table.
     */
    fields?: {
        /**
         * The name of the field.
         */
        name: string
        /**
         * The type of the field.
         */
        type?: string
        /**
         * The description of the field.
         */
        description?: string
        [k: string]: unknown
    }[]
    [k: string]: unknown
}

export type OwnershipDatasetFacet = DatasetFacet & {
    /**
     * The owners of the dataset.
     */
    owners?: {
        /**
         * the identifier of the owner of the Dataset. It is recommended to define this as a URN. For example application:foo, user:jdoe, team:data
         */
        name: string
        /**
         * The type of ownership (optional)
         */
        type?: string
        [k: string]: unknown
    }[]
    [k: string]: unknown
}

export type LifecycleStateChangeDatasetFacet = DatasetFacet & {
    /**
     * The lifecycle state change.
     */
    lifecycleStateChange:
        | 'ALTER'
        | 'CREATE'
        | 'DROP'
        | 'OVERWRITE'
        | 'RENAME'
        | 'TRUNCATE'
    /**
     * Previous name of the dataset in case of renaming it.
     */
    previousIdentifier?: {
        name: string
        namespace: string
        [k: string]: unknown
    }
    [k: string]: unknown
}

export type DataQualityAssertionsDatasetFacet = DatasetFacet & {
    assertions: {
        /**
         * Type of expectation test that dataset is subjected to
         */
        assertion: string
        success: boolean
        /**
         * Column that expectation is testing. It should match the name provided in SchemaDatasetFacet. If column field is empty, then expectation refers to whole dataset.
         */
        column?: string
        [k: string]: unknown
    }[]
    [k: string]: unknown
}

export type DatasourceDatasetFacet = DatasetFacet & {
    name?: string
    uri?: string
    [k: string]: unknown
}

export type ColumnLineageDatasetFacet = DatasetFacet & {
    /**
     * Column level lineage that maps output fields into input fields used to evaluate them.
     */
    fields: {
        [k: string]: {
            inputFields: {
                /**
                 * The input dataset namespace
                 */
                namespace: string
                /**
                 * The input dataset name
                 */
                name: string
                /**
                 * The input field
                 */
                field: string
                [k: string]: unknown
            }[]
            /**
             * a string representation of the transformation applied
             */
            transformationDescription?: string
            /**
             * IDENTITY|MASKED reflects a clearly defined behavior. IDENTITY: exact same as input; MASKED: no original data available (like a hash of PII for example)
             */
            transformationType?: string
            [k: string]: unknown
        }
    }
    [k: string]: unknown
}

export type EventType = 'START' | 'RUNNING' | 'COMPLETE' | 'ABORT' | 'FAIL' | 'OTHER';

export type RunEvent = BaseEvent & {
    /**
     * the current transition of the run state. It is required to issue 1 START event and 1 of [ COMPLETE, ABORT, FAIL ] event per run. Additional events with OTHER eventType can be added to the same run. For example to send additional metadata after the run is complete
     */
    eventType?: EventType
    run: Run
    job: Job
    /**
     * The set of **input** datasets.
     */
    inputs?: InputDataset[]
    /**
     * The set of **output** datasets.
     */
    outputs?: OutputDataset[]
    [k: string]: unknown
}
/**
 * A Run Facet
 */
export type RunFacet = BaseFacet
/**
 * A Job Facet
 */
export type JobFacet = BaseFacet & {
    /**
     * set to true to delete a facet
     */
    _deleted?: boolean
    [k: string]: unknown
}
/**
 * An input dataset
 */
export type InputDataset = Dataset & {
    /**
     * The input facets for this dataset.
     */
    inputFacets?: {
        dataQualityMetrics?: DataQualityMetricsInputDatasetFacet,
        [k: string]: InputDatasetFacet
    }
    [k: string]: unknown
}
/**
 * A Dataset Facet
 */
export type DatasetFacet = BaseFacet & {
    /**
     * set to true to delete a facet
     */
    _deleted?: boolean
    [k: string]: unknown
}
/**
 * An Input Dataset Facet
 */
export type InputDatasetFacet = BaseFacet
/**
 * An output dataset
 */
export type OutputDataset = Dataset & {
    /**
     * The output facets for this dataset
     */
    outputFacets?: {
        outputStatistics?: OutputStatisticsOutputDatasetFacet,
        [k: string]: OutputDatasetFacet
    }
    [k: string]: unknown
}
/**
 * An Output Dataset Facet
 */
export type OutputDatasetFacet = BaseFacet
export type DatasetEvent = BaseEvent & {
    dataset: StaticDataset
    [k: string]: unknown
}
/**
 * A Dataset sent within static metadata events
 */
export type StaticDataset = Dataset
export type JobEvent = BaseEvent & {
    job: Job
    /**
     * The set of **input** datasets.
     */
    inputs?: InputDataset[]
    /**
     * The set of **output** datasets.
     */
    outputs?: OutputDataset[]
    [k: string]: unknown
}

export interface BaseEvent {
    /**
     * the time the event occurred at
     */
    eventTime: string;
    /**
     * URI identifying the producer of this metadata. For example this could be a git url with a given tag or sha
     */
    producer: string;
    /**
     * The JSON Pointer (https://tools.ietf.org/html/rfc6901) URL to the corresponding version of the schema definition for this RunEvent
     */
    schemaURL: string;

    [k: string]: unknown;
}

export interface Run {
    /**
     * The globally unique ID of the run associated with the job.
     */
    runId: string;
    /**
     * The run facets.
     */
    facets?: {
        errorMessage?: ErrorMessageRunFacet,
        nominalTime?: NominalTimeRunFacet,
        externalQuery?: ExternalQueryRunFacet,
        parent?: ParentRunFacet,
        [k: string]: RunFacet
    };

    [k: string]: unknown;
}

/**
 * all fields of the base facet are prefixed with _ to avoid name conflicts in facets
 */
export interface BaseFacet {
    /**
     * URI identifying the producer of this metadata. For example this could be a git url with a given tag or sha
     */
    _producer: string;
    /**
     * The JSON Pointer (https://tools.ietf.org/html/rfc6901) URL to the corresponding version of the schema definition for this facet
     */
    _schemaURL: string;

    [k: string]: unknown;
}

export interface Job {
    /**
     * The namespace containing that job
     */
    namespace: string;
    /**
     * The unique name for that job within that namespace
     */
    name: string;
    /**
     * The job facets.
     */
    facets?: {
        documentation?: DocumentationJobFacet,
        ownership?: OwnershipJobFacet,
        sourceCode?: SourceCodeJobFacet,
        sourceCodeLocation?: SourceCodeLocationJobFacet,
        sql?: SQLJobFacet,
        job?: JobTypeJobFacet,
        [k: string]: JobFacet
    };

    [k: string]: unknown;
}

export interface Dataset {
    /**
     * The namespace containing that dataset
     */
    namespace: string;
    /**
     * The unique name for that dataset within that namespace
     */
    name: string;
    /**
     * The facets for this dataset
     */
    facets?: {
        columnLineage?: ColumnLineageDatasetFacet,
        dataSource?: DatasourceDatasetFacet,
        dataQualityAssertions?: DataQualityAssertionsDatasetFacet,
        lifecycleStateChange?: LifecycleStateChangeDatasetFacet,
        ownership?: OwnershipDatasetFacet,
        schema?: SchemaDatasetFacet,
        storage?: StorageDatasetFacet,
        symlinks?: SymlinksDatasetFacet,
        version?: DatasetVersionDatasetFacet
        [k: string]: DatasetFacet
    };

    [k: string]: unknown;
}


export interface lineageIngestionEvent {
    EventBusName: string,
    Source: string,
    DetailType: string,
    Detail: RunEvent,
};

export const DATA_LINEAGE_DIRECT_SPOKE_INGESTION_REQUEST_EVENT = `DM>${DATA_LINEAGE_SPOKE_EVENT_SOURCE}>ingestion>request`;

export const DATA_LINEAGE_DIRECT_HUB_INGESTION_REQUEST_EVENT = `DM>${DATA_LINEAGE_HUB_EVENT_SOURCE}>ingestion>request`;

export type { lineageIngestionEvent as LineageIngestionEvent };

