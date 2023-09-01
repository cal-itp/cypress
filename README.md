# Caltrans Grants Modernization Project -- Cypress

This repository contains a proof of concept implementation of an automated grant eligibility calculator for the California Department of Transportation (Caltrans) Grants Modernization Project. We've named this calculator _Cypress_.

The calculator builds on the transit agency data, maintained in Airtable and syned into the BigQuery data warehouse.

## Creating a new eligibility criteria

This is a three-step process:
1. Add an entry to the `eligibility_criteria` table.
2. Add a record to the `grant_eligibility_criteria` table for each grant that uses the new eligibility criteria.
3. Update the _utils.js_ and _customer_grant_eligibility.sql_ files implement the new eligibility criteria. The SQL only needs to be updated for eligibility criteria that are not specific to a project.

## Loading Source Data

The source data is loaded into BigQuery using the Python scripts in the `data_sources` directory. To run the scripts you will need a _.env_ file in the `data_sources` directory with the following variables:
```
GOOGLE_APPLICATION_CREDENTIALS=<path to service account key file>
PROJECT_ID=<GCP project ID>
DATASET_ID=<BigQuery dataset ID>
```

You can copy the _.env.example_ file to _.env_ and fill in the values (note that instead of using the `GOOGLE_APPLICATION_CREDENTIALS` variable with a service account, you can provide application default credentials using `gcloud auth application-default login`).

The scripts can be run in the following order:
1. `load_epa_data.py` - Loads EPA data into BigQuery.
2. `load_census_data.py` - Loads Census data into BigQuery.

## Calculating Grant Eligibility

The grant eligibility calculations are performed using SQL scripts in the `sql` directory. These scripts would eventually become DBT models.

Tables:
- `cypress.customer_grant_eligibility` - Contains the grant eligibility calculations for each customer.
