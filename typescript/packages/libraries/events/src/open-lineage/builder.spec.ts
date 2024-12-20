import { beforeEach, describe, expect, it } from 'vitest';
import { OpenLineageBuilder, QualityResult } from "./builder.js";
import type { RunEvent } from './model.js';

describe('OpenLineageBuilder', () => {
    let builder: OpenLineageBuilder;

    beforeEach(() => {
        builder = new OpenLineageBuilder();

        builder.setContext('12345',
            'sample_domain',
            'arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline'
        )
    })

    describe('Derived data asset with custom transformation applied outside DM', () => {
        const expectedStartEvent: Partial<RunEvent> = {
            "producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
            "schemaURL": "https://openlineage.io/spec/1-0-5/OpenLineage.json#/definitions/RunEvent",
            "job": {
                "namespace": "sample_domain - dm.12345",
                "name": "dm_create_dataset - SampleCsvAsset",
                "facets": {
                    "documentation": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://github.com/OpenLineage/OpenLineage/blob/main/spec/facets/DocumentationJobFacet.json",
                        "description": "Catalogs the SampleCsvAsset within the DataZone catalog for domain sample_domain - dm.12345"
                    },
                    "ownership": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/OwnershipJobFacet.json",
                        "owners": [{"name": "user:testuser@admin.com"}, {"name": "application:dm.DataAssetModule"}]
                    },
                    "sourceCodeLocation": {
                        "_producer": "external_bash_script",
                        "_schemaURL": "https://github.com/OpenLineage/OpenLineage/blob/main/spec/facets/SourceCodeLocationJobFacet.json",
                        "type": "git",
                        "url": "some_git_url",
                    }
                }
            },
            "inputs": [{
                "name": "sampleAssetName",
                "namespace": "asset.namespace.other",
                "facets": {}, "inputFacets": {}
            }],
            "outputs": [],
            "eventTime": "2024-03-08T04:46:23.275Z",
            "eventType": "START",
            "run": {
                "runId": "8948dm56-2116-401f-9349-95c42b646047",
                "facets": {
                    "nominalTime": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/NominalTimeRunFacet.json",
                        "nominalStartTime": "2024-03-08T04:46:23.275Z"
                    }
                }
            }
        }

        const expectedCompleteEvent = {
            "producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
            "schemaURL": "https://openlineage.io/spec/1-0-5/OpenLineage.json#/definitions/RunEvent",
            "job": {
                "namespace": "sample_domain - dm.12345",
                "name": "dm_create_dataset - SampleCsvAsset",
                "facets": {
                    "documentation": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://github.com/OpenLineage/OpenLineage/blob/main/spec/facets/DocumentationJobFacet.json",
                        "description": "Catalogs the SampleCsvAsset within the DataZone catalog for domain sample_domain - dm.12345"
                    },
                    "ownership": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/OwnershipJobFacet.json",
                        "owners": [{"name": "user:testuser@admin.com"}, {"name": "application:dm.DataAssetModule"}]
                    },
                    "sourceCodeLocation": {"_producer": "external_bash_script", "_schemaURL": "https://github.com/OpenLineage/OpenLineage/blob/main/spec/facets/SourceCodeLocationJobFacet.json", "type": "git", "url": "some_git_url"}
                }
            },
            "inputs": [{
                "name": "sampleAssetName",
                "namespace": "asset.namespace.other",
                "facets": {},
                "inputFacets": {}
            }],
            "outputs": [{
                "namespace": "sample_domain - dm.12345", "name": "dm.stationary-combustion.77777",
                "outputFacets": {},
                "facets": {
                    "lifecycleStateChange": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/LifecycleStateChangeDatasetFacet.json",
                        "lifecycleStateChange": "CREATE"
                    },
                    "ownership": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/OwnershipDatasetFacet.json",
                        "owners": [{"name": "user:testuser@admin.com"}, {"name": "application:dm.DataAssetModule"}]
                    },
                    "storage": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/StorageDatasetFacet.json",
                        "fileFormat": "csv",
                        "storageLayer": "s3"
                    },
                    "version": {"_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline", "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/DatasetVersionDatasetFacet.json", "datasetVersion": "1.2"},
                    "columnLineage": {
                        "_producer": "externalProducer",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-1/ColumnLineageDatasetFacet.json",
                        "fields": {
                            "category": {"inputFields": [{"namespace": "external_domain - dm.00000", "name": "usepa.ghg-emission-factors-hub-2023", "field": "Fuel Category"}]},
                            "fuelType": {"inputFields": [{"namespace": "external_domain - dm.00000", "name": "usepa.ghg-emission-factors-hub-2023", "field": "Fuel Type"}]}
                        }
                    }
                }
            }],
            "eventTime": "2024-03-08T04:46:23.275Z",
            "eventType": "COMPLETE",
            "run": {
                "runId": "8948dm56-2116-401f-9349-95c42b646047",
                "facets": {
                    "nominalTime": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/NominalTimeRunFacet.json",
                        "nominalStartTime": "2024-03-08T04:46:23.275Z",
                        "nominalEndTime": "2024-03-08T06:46:23.275Z"
                    }
                }
            }
        }

        it('Happy Path > Scenario 1.2.1 and Scenario 1.2.2', () => {
            const actualStartEvent = builder
                .setJob(
                    {
                        // Supplied by StateMachine task
                        jobName: "dm_create_dataset",
                        // Supplied by user
                        assetName: "SampleCsvAsset",
                        // TODO: JR & PB - Provided by user when transformation is carried outside of DM
                        sourceCodeLocation: {
                            _producer: 'external_bash_script',
                            type: 'git',
                            url: 'some_git_url'
                        },
                        usernames: ['testuser@admin.com']
                    })
                .setStartJob(
                    {
                        executionId: "8948dm56-2116-401f-9349-95c42b646047",
                        startTime: "2024-03-08T04:46:23.275Z"
                    })

                .setDatasetInput({
                    // TODO: JR & PB - Provided by user when the specify input from Data Management
                    assetName: "sampleAssetName",
                    assetNamespace: "asset.namespace.other",
                    type: 'DataManagement',
                }).build();

            expect(actualStartEvent).toEqual(expectedStartEvent);

            builder.setOpenLineageEvent(actualStartEvent);

            // this will be called at the end of the step function
            const actualCompleteEvent = builder
                .setEndJob(
                    {
                        endTime: "2024-03-08T06:46:23.275Z",
                        eventType: 'COMPLETE'
                    })
                .setDatasetOutput({
                    storage: {
                        fileFormat: "csv",
                        storageLayer: "s3",
                    },
                    name: "dm.stationary-combustion.77777",
                    version: "1.2",
                    usernames: ['testuser@admin.com'],
                    // TODO: JR & PB - Column Lineage information provided by user when transformation is performed outside of DM.
                    customTransformerMetadata: {
                        _producer: 'externalProducer',
                        fields: {
                            "category": {
                                "inputFields": [
                                    {
                                        "namespace": "external_domain - dm.00000",
                                        "name": "usepa.ghg-emission-factors-hub-2023",
                                        "field": "Fuel Category"
                                    }
                                ]
                            },
                            "fuelType": {
                                "inputFields": [
                                    {
                                        "namespace": "external_domain - dm.00000",
                                        "name": "usepa.ghg-emission-factors-hub-2023",
                                        "field": "Fuel Type"
                                    }
                                ]
                            },
                        }
                    }
                })
                .build();
            expect(actualCompleteEvent).toEqual(expectedCompleteEvent);
        })
    })

    describe('Derived data asset with data profiling metrics', () => {
        const expectedCompleteEvent = {

            "producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
            "schemaURL": "https://openlineage.io/spec/1-0-5/OpenLineage.json#/definitions/RunEvent",
            "job": {
                "namespace": "sample_domain - dm.12345",
                "name": "dm_data_quality_metrics - SampleCsvAsset",
                "facets": {
                    "documentation": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://github.com/OpenLineage/OpenLineage/blob/main/spec/facets/DocumentationJobFacet.json",
                        "description": "Catalogs the SampleCsvAsset within the DataZone catalog for domain sample_domain - dm.12345"
                    },
                    "ownership": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/OwnershipJobFacet.json",
                        "owners": [{"name": "user:testuser@admin.com"}, {"name": "application:dm.DataAssetModule"}]
                    }
                }
            },
            "inputs": [{
                "name": "sampleAssetName",
                "namespace": "asset.namespace.other",
                "inputFacets": {
                    "dataQualityMetrics": {
                        "_producer": "8948dm56-2116-401f-9349-95c42b646047",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/DataQualityMetricsInputDatasetFacet.json",
                        "rowCount": 20000,
                        "columnMetrics": {
                            "age": {"min": 18, "max": 99, "sum": 1173386, "count": 0, "nullCount": 0, "distinctCount": 82, "quantiles": {"0.05": 22, "0.25": 38, "0.75": 79, "0.95": 95}},
                            "city": {"min": 6, "max": 15, "count": 0, "nullCount": 0, "distinctCount": 25, "quantiles": {}}
                        }
                    }
                },
                "facets": {}
            }],
            "outputs": [],
            "eventTime": "2024-03-08T04:46:23.275Z",
            "eventType": "COMPLETE",
            "run": {
                "runId": "8948dm56-2116-401f-9349-95c42b646047",
                "facets": {
                    "nominalTime": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/NominalTimeRunFacet.json",
                        "nominalStartTime": "2024-03-08T04:46:23.275Z",
                        "nominalEndTime": "2024-03-08T06:46:23.275Z"
                    },
                    "parent": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/ParentRunFacet.json",
                        "job": {"name": "dm_create_dataset - SampleCsvAsset", "namespace": "sample_domain - dm.12345"},
                        "run": {"runId": "284ae082-8385-4de5-9ec6-87d6ed65b113"}
                    }
                }
            }
        };

        const expectedStartEvent = {
            "producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
            "schemaURL": "https://openlineage.io/spec/1-0-5/OpenLineage.json#/definitions/RunEvent",
            "job": {
                "namespace": "sample_domain - dm.12345",
                "name": "dm_data_quality_metrics - SampleCsvAsset",
                "facets": {
                    "documentation": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://github.com/OpenLineage/OpenLineage/blob/main/spec/facets/DocumentationJobFacet.json",
                        "description": "Catalogs the SampleCsvAsset within the DataZone catalog for domain sample_domain - dm.12345"
                    },
                    "ownership": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/OwnershipJobFacet.json",
                        "owners": [
                            {
                                "name": "user:testuser@admin.com"
                            },
                            {
                                "name": "application:dm.DataAssetModule"
                            }
                        ]
                    }
                }
            },
            "inputs": [
                {
                    "name": "sampleAssetName",
                    "namespace": "asset.namespace.other",
                    inputFacets: {},
                    facets: {}
                }
            ],
            "outputs": [],
            "eventTime": "2024-03-08T04:46:23.275Z",
            "eventType": "START",
            "run": {
                "runId": "8948dm56-2116-401f-9349-95c42b646047",
                "facets": {
                    "nominalTime": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/NominalTimeRunFacet.json",
                        "nominalStartTime": "2024-03-08T04:46:23.275Z"
                    },
                    "parent": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/ParentRunFacet.json",
                        "job": {
                            "name": "dm_create_dataset - SampleCsvAsset",
                            "namespace": "sample_domain - dm.12345"
                        },
                        "run": {
                            "runId": "284ae082-8385-4de5-9ec6-87d6ed65b113"
                        }
                    }
                }
            }
        }

        const profilingResult = {
            "sampleSize": 20000,
            "duplicateRowsCount": 0,
            columns: [{
                "name": "age",
                "type": "bigint",
                "distinctValuesCount": 82,
                "uniqueValuesCount": 0,
                "missingValuesCount": 0,
                "max": 99,
                "min": 18,
                "sum": 1173386,
                "zerosCount": 0,
                "percentile5": 22.0,
                "percentile25": 38.0,
                "percentile75": 79.0,
                "percentile95": 95.0,
                "median": 59.0,
            },
                {
                    "name": "city",
                    "type": "string",
                    "distinctValuesCount": 25,
                    "uniqueValuesCount": 0,
                    "missingValuesCount": 0,
                    "max": 15,
                    "min": 6,
                    "median": 9.0,
                    "mode": 7,
                }]
        };

        it('Happy Path > Scenario 1.2.3 and Scenario 1.2.4', () => {
            const actualStartEvent = builder
                .setJob(
                    {
                        // Provided by StateMachine task.
                        jobName: "dm_data_quality_metrics",
                        // Provided by user.
                        assetName: "SampleCsvAsset",
                        usernames: ['testuser@admin.com']
                    })
                .setStartJob(
                    {
                        // This will be the Glue DataBrew Profiling Run Id
                        executionId: "8948dm56-2116-401f-9349-95c42b646047",
                        startTime: "2024-03-08T04:46:23.275Z",
                        parent: {
                            // TODO: WS - Need to create lineage between StepFunction in Hub and Spoke account
                            // This will be the StateMachine execution id in the spoke account.
                            runId: '284ae082-8385-4de5-9ec6-87d6ed65b113',
                            producer: 'parent_step_machine',
                            name: "dm_create_dataset",
                            assetName: "SampleCsvAsset"
                        }
                    })
                .setDatasetInput({
                    assetName: "sampleAssetName",
                    assetNamespace: "asset.namespace.other",
                    type: 'DataManagement',
                }).build();

            expect(actualStartEvent).toEqual(expectedStartEvent);

            builder.setOpenLineageEvent(actualStartEvent);

            const actualCompleteEvent = builder
                .setEndJob({
                    endTime: "2024-03-08T06:46:23.275Z",
                    eventType: 'COMPLETE'
                })
                .setProfilingResult({
                    result: profilingResult,
                    producer: 'dataBrewJobArn'
                }).build();
            expect(actualCompleteEvent).toEqual(expectedCompleteEvent);
        });
    });

    describe('Derived data asset with data quality assertions', () => {

        const expectedStartEvent = {
            "producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
            "schemaURL": "https://openlineage.io/spec/1-0-5/OpenLineage.json#/definitions/RunEvent",
            "job": {
                "namespace": "sample_domain - dm.12345",
                "name": "dm_data_quality_assertions - SampleCsvAsset",
                "facets": {
                    "documentation": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://github.com/OpenLineage/OpenLineage/blob/main/spec/facets/DocumentationJobFacet.json",
                        "description": "Catalogs the SampleCsvAsset within the DataZone catalog for domain sample_domain - dm.12345"
                    },
                    "ownership": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/OwnershipJobFacet.json",
                        "owners": [
                            {
                                "name": "user:testuser@admin.com"
                            },
                            {
                                "name": "application:dm.DataAssetModule"
                            }
                        ]
                    }
                }
            },
            "inputs": [
                {
                    name: "sampleAssetName",
                    namespace: "asset.namespace.other",
                    inputFacets: {},
                    facets: {}
                }
            ],
            "outputs": [],
            "eventTime": "2024-03-08T04:46:23.275Z",
            "eventType": "START",
            "run": {
                "runId": "8948dm56-2116-401f-9349-95c42b646047",
                "facets": {
                    "nominalTime": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/NominalTimeRunFacet.json",
                        "nominalStartTime": "2024-03-08T04:46:23.275Z"
                    },
                    "parent": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/ParentRunFacet.json",
                        "job": {
                            "name": "dm_create_dataset - SampleCsvAsset",
                            "namespace": "sample_domain - dm.12345"
                        },
                        "run": {
                            "runId": "284ae082-8385-4de5-9ec6-87d6ed65b113"
                        }
                    }
                }
            }
        }

        const qualityResult: QualityResult = {
            ruleResults: [
                {
                    "Name": "Rule_1",
                    "Description": "ColumnCount = 10",
                    "EvaluationMessage": "Dataset has 7.0 columns and failed to satisfy constraint",
                    "Result": "FAIL"
                },
                {
                    "Name": "Rule_2",
                    "Description": "ColumnValues \"zipcode\" matches \"[1-9]*\" with threshold > 0.1",
                    "EvaluationMessage": "Expected type of column zipcode to be StringType, but found DoubleType instead!",
                    "Result": "FAIL"
                },
                {
                    "Name": "Rule_3",
                    "Description": "ColumnValues \"zipcode\" in [1,2,3]",
                    "EvaluationMessage": "Value: 0.0 does not meet the constraint requirement!",
                    "Result": "FAIL"
                },
                {
                    "Name": "Rule_4",
                    "Description": "ColumnExists \"zipcode\"",
                    "Result": "PASS"
                },
                {
                    "Name": "Rule_5",
                    "Description": "ColumnValues \"kwh\" < 10",
                    "EvaluationMessage": "Value: 500.0 does not meet the constraint requirement!",
                    "Result": "FAIL"
                }
            ]
        }

        const expectedCompleteEvent = {

            "producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
            "schemaURL": "https://openlineage.io/spec/1-0-5/OpenLineage.json#/definitions/RunEvent",
            "job": {
                "namespace": "sample_domain - dm.12345",
                "name": "dm_data_quality_assertions - SampleCsvAsset",
                "facets": {
                    "documentation": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://github.com/OpenLineage/OpenLineage/blob/main/spec/facets/DocumentationJobFacet.json",
                        "description": "Catalogs the SampleCsvAsset within the DataZone catalog for domain sample_domain - dm.12345"
                    },
                    "ownership": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/OwnershipJobFacet.json",
                        "owners": [{"name": "user:testuser@admin.com"}, {"name": "application:dm.DataAssetModule"}]
                    }
                }
            },
            "inputs": [{
                name: "sampleAssetName",
                namespace: "asset.namespace.other",
                "inputFacets": {},
                "facets": {
                    "dataQualityAssertions": {
                        "_producer": "8948dm56-2116-401f-9349-95c42b646047",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/DataQualityAssertionsDatasetFacet.json",
                        "assertions":
                            [
                                {"assertion": "ColumnCount = 10", "success": false},
                                {"assertion": "ColumnValues \"zipcode\" matches \"[1-9]*\" with threshold > 0.1", "success": false},
                                {"assertion": "ColumnValues \"zipcode\" in [1,2,3]", "success": false},
                                {"assertion": "ColumnExists \"zipcode\"", "success": true},
                                {"assertion": "ColumnValues \"kwh\" < 10", "success": false}
                            ]
                    }
                }
            }],
            "outputs": [],
            "eventTime": "2024-03-08T04:46:23.275Z",
            "eventType": "COMPLETE",
            "run": {
                "runId": "8948dm56-2116-401f-9349-95c42b646047",
                "facets": {
                    "nominalTime": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/NominalTimeRunFacet.json",
                        "nominalStartTime": "2024-03-08T04:46:23.275Z",
                        "nominalEndTime": "2024-03-08T06:46:23.275Z"
                    },
                    "parent": {
                        "_producer": "arn:aws:states:ap-southeast-2:111111111:stateMachine:createDataSetPipeline",
                        "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/ParentRunFacet.json",
                        "job": {"name": "dm_create_dataset - SampleCsvAsset", "namespace": "sample_domain - dm.12345"},
                        "run": {"runId": "284ae082-8385-4de5-9ec6-87d6ed65b113"}
                    }
                }
            }
        }

        it('Happy Path > Scenario 7.1.1 and Scenario 7.1.2', () => {
            const actualStartEvent = builder
                .setJob(
                    {
                        jobName: "dm_data_quality_assertions",
                        assetName: "SampleCsvAsset",
                        usernames: ['testuser@admin.com']
                    })
                .setStartJob(
                    {
                        // This will be the GlueData Quality Profile execution id
                        executionId: "8948dm56-2116-401f-9349-95c42b646047",
                        startTime: "2024-03-08T04:46:23.275Z",
                        parent: {
                            // TODO: WS - Need to create lineage between StepFunction in Hub and Spoke account
                            // This will be the execution id of the step function in spoke account
                            runId: '284ae082-8385-4de5-9ec6-87d6ed65b113',
                            name: "dm_create_dataset",
                            assetName: 'SampleCsvAsset',
                            producer: 'sample parent producer'
                        }
                    })
                .setDatasetInput({
                    assetName: "sampleAssetName",
                    assetNamespace: "asset.namespace.other",
                    type: 'DataManagement',
                }).build();

            expect(actualStartEvent).toEqual(expectedStartEvent);

            builder.setOpenLineageEvent(actualStartEvent);

            const actualCompleteEvent = builder
                .setEndJob({
                    endTime: "2024-03-08T06:46:23.275Z",
                    eventType: 'COMPLETE'
                })
                .setQualityResult({
                    result: qualityResult,
                    producer: "sampleRulesetName",
                }).build();

            expect(actualCompleteEvent).toEqual(expectedCompleteEvent);
        })

    });


});
