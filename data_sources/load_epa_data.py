"""
Load EPA Non-Attainment Areas data (see
https://www.epa.gov/green-book/green-book-gis-download) into a BigQuery table.
Loads the data into a BigQuery table called `epa_non_attainment_areas`.
"""
import os
import json
import logging
import tempfile

import geopandas as gpd
from shapely.geometry import LinearRing, LineString, Point, Polygon, MultiPolygon, mapping

from google.cloud import bigquery, exceptions

NAA_DOWNLOAD_URL = 'https://www3.epa.gov/airquality/greenbook/shapefile/ozone_8hr_2015std_naa_shapefile.zip'
PROJECT_ID = os.environ['PROJECT_ID']
DATASET_ID = os.environ['DATASET_ID']


def geom_3d_to_2d(geom):
    """
    Convert a 3D geometry to 2D.

    BigQuery will be very unhappy if you try to load a geometry with a Z
    coordinate into a GEOGRAPHY column. Unfortunately, the EPA Non-Attainment
    Areas data has a Z coordinate. This function converts a 3D geometry to 2D
    by dropping the Z coordinate.
    """
    if geom.has_z:
        if isinstance(geom, Point):
            return Point(geom.x, geom.y)
        elif isinstance(geom, LineString):
            return LineString([(x, y) for x, y, z in geom.coords])
        elif isinstance(geom, LinearRing):
            return LinearRing([(x, y) for x, y, z in geom.coords])
        elif isinstance(geom, Polygon):
            exterior = geom.exterior
            new_exterior = geom_3d_to_2d(exterior)
            interiors = geom.interiors
            new_interiors = [geom_3d_to_2d(interior) for interior in interiors]
            return Polygon(new_exterior, new_interiors)
        elif isinstance(geom, MultiPolygon):
            polygons = geom.geoms
            new_polygons = [geom_3d_to_2d(polygon) for polygon in polygons]
            return MultiPolygon(new_polygons)
        else:
            raise ValueError(f'Unsupported geometry type: {geom.type}')


def load_epa_data():
    """Load EPA Non-Attainment Areas data into a BigQuery table."""
    logging.info('Loading EPA Non-Attainment Areas data into BigQuery...')

    with tempfile.TemporaryDirectory() as tmpdir:
        # Download the data
        logging.info('Downloading EPA Non-Attainment Areas data...')
        os.system(f'wget -P {tmpdir} {NAA_DOWNLOAD_URL}')

        # Unzip the data
        logging.info('Unzipping EPA Non-Attainment Areas data...')
        os.system(f'unzip -o {tmpdir}/*.zip -d {tmpdir}')

        # Load the data into a GeoDataFrame
        logging.info('Loading EPA Non-Attainment Areas data into a GeoDataFrame...')
        gdf = gpd.read_file(f'{tmpdir}/ozone_8hr_2015std_naa.shp')
        # gdf = gpd.read_file(f'../data/epa_naa/ozone_8hr_2015std_naa.shp')
        gdf['geometry'] = gdf['geometry'].apply(geom_3d_to_2d).make_valid()

        # Convert the geometry to GeoJSON, since it's planar and less likely to
        # have polygon nesting issues than WKT.
        gdf['geometry_json'] = gdf['geometry'].apply(lambda geom: json.dumps(mapping(geom)))
        gdf = gdf.drop(columns=['geometry']).rename(columns={'geometry_json': 'geometry'})

        # Initialise the BigQuery dataset
        logging.info('Initializing the US federal data dataset in BigQuery...')
        client = bigquery.Client(project=PROJECT_ID)
        dataset = bigquery.Dataset(f'{PROJECT_ID}.{DATASET_ID}')
        dataset.location = 'us-west2'

        try:  # Create the dataset if it doesn't already exist
            client.create_dataset(dataset)
        except exceptions.Conflict:
            pass

        # Load the data into BigQuery
        logging.info('Loading EPA Non-Attainment Areas data into BigQuery...')
        job_config = bigquery.LoadJobConfig(
            schema=[
                bigquery.SchemaField('geometry', bigquery.enums.SqlTypeNames.GEOGRAPHY),
            ],
            write_disposition='WRITE_TRUNCATE',
        )
        job = client.load_table_from_dataframe(
            gdf,
            f'{PROJECT_ID}.{DATASET_ID}.epa_non_attainment_areas',
            job_config=job_config,
        )
        job.result()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    load_epa_data()
