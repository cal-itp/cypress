"""
Load Census Urban Areas data into a BigQuery table. The data will be loaded
into a BigQuery table named `census_urban_areas`.
"""
import os
import json
import logging
import tempfile

import geopandas as gpd
from shapely.geometry import mapping

from google.cloud import bigquery, exceptions

UAC_DOWNLOAD_URL = 'https://www2.census.gov/geo/tiger/TIGER2020/UAC/tl_2020_us_uac20.zip'
PROJECT_ID = os.environ['PROJECT_ID']
FEDERAL_DATASET_ID = os.environ['FEDERAL_DATASET_ID']


def load_census_data():
    """Load Census Urban Areas data into a BigQuery table."""
    logging.info('Loading Census Urban Areas data into BigQuery...')

    with tempfile.TemporaryDirectory() as tmpdir:
        # Download the data
        logging.info('Downloading Census Urban Areas data...')
        os.system(f'wget -P {tmpdir} {UAC_DOWNLOAD_URL}')

        # Unzip the data
        logging.info('Unzipping Census Urban Areas data...')
        os.system(f'unzip -o {tmpdir}/tl_2020_us_uac20.zip.zip -d {tmpdir}')

        # Load the data into a GeoDataFrame
        logging.info('Loading Census Urban Areas data into a GeoDataFrame...')
        gdf = gpd.read_file(f'{tmpdir}/tl_2020_us_uac20.shp').to_crs(4326)
        # gdf = gpd.read_file(f'../data/census_uac/tl_2020_us_uac20.shp').to_crs(4326)
        gdf['geometry'] = gdf['geometry'].make_valid()

        # Convert the geometry to GeoJSON, since it's planar and less likely to
        # have polygon nesting issues than WKT.
        gdf['geometry_json'] = gdf['geometry'].apply(lambda geom: json.dumps(mapping(geom)))
        gdf = gdf.drop(columns=['geometry']).rename(columns={'geometry_json': 'geometry'})

        # Initialise the BigQuery dataset
        logging.info('Initializing the US federal data dataset in BigQuery...')
        client = bigquery.Client(project=PROJECT_ID)
        dataset = bigquery.Dataset(f'{PROJECT_ID}.{FEDERAL_DATASET_ID}')
        dataset.location = 'us-west2'

        try:  # Create the dataset if it doesn't already exist
            client.create_dataset(dataset)
        except exceptions.Conflict:
            pass

        # Load the data into BigQuery
        logging.info('Loading Census Urban Areas data into BigQuery...')
        job_config = bigquery.LoadJobConfig(
            schema=[
                bigquery.SchemaField('geometry', bigquery.enums.SqlTypeNames.GEOGRAPHY),
            ],
            write_disposition='WRITE_TRUNCATE',
        )
        job = client.load_table_from_dataframe(
            gdf,
            f'{PROJECT_ID}.{FEDERAL_DATASET_ID}.census_urban_areas',
            job_config=job_config,
        )
        job.result()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    load_census_data()
