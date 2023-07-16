# Caltrans Grants Modernization Project -- Cypress

This repository contains a proof of concept implementation of an automated grant eligibility calculator for the California Department of Transportation (Caltrans) Grants Modernization Project. We've named this calculator _Cypress_.

The calculator builds on the transit agency data, maintained in Airtable and syned into the BigQuery data warehouse.

The repository consists of three main components:
1. A set of Python scripts to load EPA and Census data into BigQuery. The EPA is used as the source for air quality non-attainment area data, and the Census is used as the source for urbanized area data. These scripts are located in the `data_sources` directory.
2. A set of SQL scripts to calculate grant eligibility for each transit agency in the data warehouse. These scripts are located in the `sql` directory.
3. A simple web application to display the results of the grant eligibility calculations with respect to a project with specific criteria. This application is located in the `app` directory.

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
