"""
Load stub CSV data about grants from the stub_data folder into BigQuery tables.
"""
import os
import logging
import pathlib

import pandas as pd

from google.cloud import bigquery, exceptions

STUB_DATA_DIR = pathlib.Path(__file__).parent.parent / 'app' / 'stub_data'
PROJECT_ID = os.environ['PROJECT_ID']
GRANTS_DATASET_ID = os.environ['GRANTS_DATASET_ID']


def load_grants_stub_data():
    """Load stub CSV data about grants into BigQuery tables."""

    # Initialise the BigQuery dataset
    logging.info('Initializing the grants dataset in BigQuery...')
    client = bigquery.Client(project=PROJECT_ID)
    dataset = bigquery.Dataset(f'{PROJECT_ID}.{GRANTS_DATASET_ID}')
    dataset.location = 'us-west2'

    try:  # Create the dataset if it doesn't already exist
        client.create_dataset(dataset)
    except exceptions.Conflict:
        pass

    # Load grants.csv into the grants table
    logging.info('Loading grants.csv into the grants table...')
    df = pd.read_csv(STUB_DATA_DIR / 'grants.csv')
    df.to_gbq(f'{GRANTS_DATASET_ID}.grants', PROJECT_ID, if_exists='replace')

    # Load eligibility_critiera.csv into the eligibility_criteria table
    logging.info('Loading eligibility_criteria.csv into the eligibility_criteria table...')
    df = pd.read_csv(STUB_DATA_DIR / 'eligibility_criteria.csv')
    df.to_gbq(f'{GRANTS_DATASET_ID}.eligibility_criteria', PROJECT_ID, if_exists='replace')

    # Load grant_eligibility_criteria.csv into the grant_eligibility_criteria table
    logging.info('Loading grant_eligibility_criteria.csv into the grant_eligibility_criteria table...')
    df = pd.read_csv(STUB_DATA_DIR / 'grant_eligibility_criteria.csv')
    df.to_gbq(f'{GRANTS_DATASET_ID}.grant_eligibility_criteria', PROJECT_ID, if_exists='replace')

    # Load grant_eligible_applicant_types.csv into the grant_eligible_applicant_types table
    logging.info('Loading grant_eligible_applicant_types.csv into the grant_eligible_applicant_types table...')
    df = pd.read_csv(STUB_DATA_DIR / 'grant_eligible_applicant_types.csv')
    df.to_gbq(f'{GRANTS_DATASET_ID}.grant_eligible_applicant_types', PROJECT_ID, if_exists='replace')

    # Load grant_eligible_subapplicant_types.csv into the grant_eligible_subapplicant_types table
    logging.info('Loading grant_eligible_subapplicant_types.csv into the grant_eligible_subapplicant_types table...')
    df = pd.read_csv(STUB_DATA_DIR / 'grant_eligible_subapplicant_types.csv')
    df.to_gbq(f'{GRANTS_DATASET_ID}.grant_eligible_subapplicant_types', PROJECT_ID, if_exists='replace')

    # Load grant_eligible_project_types.csv into the grant_eligible_project_types table
    logging.info('Loading grant_eligible_project_types.csv into the grant_eligible_project_types table...')
    df = pd.read_csv(STUB_DATA_DIR / 'grant_eligible_project_types.csv')
    df.to_gbq(f'{GRANTS_DATASET_ID}.grant_eligible_project_types', PROJECT_ID, if_exists='replace')

    # Load grant_eligible_applicant_beneficiaries.csv into the grant_eligible_applicant_beneficiaries table
    logging.info('Loading grant_eligible_applicant_beneficiaries.csv into the grant_eligible_applicant_beneficiaries table...')
    df = pd.read_csv(STUB_DATA_DIR / 'grant_eligible_applicant_beneficiaries.csv')
    df.to_gbq(f'{GRANTS_DATASET_ID}.grant_eligible_applicant_beneficiaries', PROJECT_ID, if_exists='replace')


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    load_grants_stub_data()
