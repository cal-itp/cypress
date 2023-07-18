with

customer_grant_eligibility_attrs as (
    select
        key,
        name,
        -- The following should all be determined for real, but for now we'll
        -- just randomly assign them (the fingerprint will be effectively
        -- random, but stable).
        mod(farm_fingerprint(name || 'a'), 2) = 0 as has_service_to_non_urbanized_area,  -- Check against Census UAC data?
        case when mod(farm_fingerprint(name || 'b'), 3) = 0 then true
             when mod(farm_fingerprint(name || 'b'), 3) = 1 then false
             else null end as has_service_connecting_urban_areas,
        mod(farm_fingerprint(name || 'c'), 2) = 0 as has_service_in_non_attainment_area,  -- Check against EPA NAAQS data?
        mod(farm_fingerprint(name || 'd'), 2) = 0 as can_receive_state_transit_assistance,
        mod(farm_fingerprint(name || 'e'), 2) = 0 as has_service_along_freight_corridors,
    from staging_mart_transit_database.dim_organizations
    where _valid_to > current_timestamp
),

customers as (
    select *
    from staging_mart_transit_database.dim_organizations
    left join customer_grant_eligibility_attrs using (key, name)
    where _valid_to > current_timestamp
),

grants as (
    select *
    from mjumbe_grants.grants
),

grant_eligibility_criteria as (
    select *
    from mjumbe_grants.grant_eligibility_criteria
),

grant_eligible_grantee_types as (
    select *
    from mjumbe_grants.grant_eligible_grantee_types
),

/*
    First, determine whether each customer meets the eligibility criteria for
    each grant. The relevant criteria for each grant are defined in the
    grant_eligibility_criteria table.
*/
customer_grant_eligibility_criteria as (
    -- E0001: Entity Type
    -- ~~~~~~~~~~~~~~~~~~
    --
    -- There are 12 types currently represented in the organizations table. We
    -- will map those to the following entity types:
    --   * Non-Profit Organization: private non-profit
    --   * Company: private for-profit
    --   * Independent Agency: transit agency
    --   * County: county
    --   * Tribe: indian tribal government
    --   * City/Town: city
    --   * Federal Government: (not eligible)
    --   * University - Public: school
    --   * University - Private: school
    --   * Community College: school
    --   * MPO/RTPA: mpo, rtpa
    --   * Joint Powers Agency: transit agency
    --   * Council of Governments: mpo
    select
        customers.name as customer_name,
        grants.name as grant_name,
        'e0001' as eligibility_code,
        case
            when customers.organization_type = 'Non-Profit Organization'
            then 'private non-profit' in (
                select entity_type
                from grant_eligible_grantee_types
                where grant_name = grants.name)
            when customers.organization_type = 'Company'
            then 'private for-profit' in (
                select entity_type
                from grant_eligible_grantee_types
                where grant_name = grants.name)
            when customers.organization_type = 'Independent Agency'
            then 'transit agency' in (
                select entity_type
                from grant_eligible_grantee_types
                where grant_name = grants.name)
            when customers.organization_type = 'County'
            then 'county' in (
                select entity_type
                from grant_eligible_grantee_types
                where grant_name = grants.name)
            when customers.organization_type = 'Tribe'
            then 'indian tribal government' in (
                select entity_type
                from grant_eligible_grantee_types
                where grant_name = grants.name)
            when customers.organization_type = 'City/Town'
            then 'city' in (
                select entity_type
                from grant_eligible_grantee_types
                where grant_name = grants.name)
            when customers.organization_type = 'University - Public'
                or customers.organization_type = 'University - Private'
                or customers.organization_type = 'Community College'
            then 'school' in (
                select entity_type
                from grant_eligible_grantee_types
                where grant_name = grants.name)
            when customers.organization_type = 'MPO/RTPA'
            then 'mpo' in (
                select entity_type
                from grant_eligible_grantee_types
                where grant_name = grants.name)
                or 'rtpa' in (
                select entity_type
                from grant_eligible_grantee_types
                where grant_name = grants.name)
            when customers.organization_type = 'Joint Powers Agency'
            then 'joint powers authority' in (
                select entity_type
                from grant_eligible_grantee_types
                where grant_name = grants.name)
            when customers.organization_type = 'Council of Governments'
            then 'mpo' in (
                select entity_type
                from grant_eligible_grantee_types
                where grant_name = grants.name)
            when customers.organization_type = 'Federal Government'
            then false
            else false
        end as is_eligible,
        ('Customer org type is ' || customers.organization_type || ' and grant eligible types are ' || (
            select string_agg(entity_type, ', ')
            from grant_eligible_grantee_types
            where grant_name = grants.name)) as reason
    from customers
    cross join grants

    union all

    -- e0003: Non-urbanized Service Area
    select
        customers.name as customer_name,
        grants.name as grant_name,
        'e0003' as eligibility_code,
        customers.has_service_to_non_urbanized_area as is_eligible,
        case when customers.has_service_to_non_urbanized_area
            then 'Customer has service to non-urbanized area'
            else 'Customer does not have service to non-urbanized area'
        end as reason
    from customers
    cross join grants
    left join grant_eligibility_criteria
        on grant_eligibility_criteria.grant_name = grants.name
    where grant_eligibility_criteria.eligibility_code = 'e0003'

    union all

    -- e0004: Regularly scheduled service connecting two or more urban areas
    select
        customers.name as customer_name,
        grants.name as grant_name,
        'e0004' as eligibility_code,
        customers.has_service_connecting_urban_areas as is_eligible,
        case when customers.has_service_connecting_urban_areas
            then 'Customer has service connecting urban areas'
            when not customers.has_service_connecting_urban_areas
            then 'Customer does not have service connecting urban areas'
            else 'Customer may or may not have service connecting urban areas'
        end as reason
    from customers
    cross join grants
    left join grant_eligibility_criteria
        on grant_eligibility_criteria.grant_name = grants.name
    where grant_eligibility_criteria.eligibility_code = 'e0004'

    union all

    -- e0005: Service area in an air quality non-attainment area
    select
        customers.name as customer_name,
        grants.name as grant_name,
        'e0005' as eligibility_code,
        customers.has_service_in_non_attainment_area as is_eligible,
        case when customers.has_service_in_non_attainment_area
            then 'Customer has service in air quality non-attainment area'
            else 'Customer does not have service in air quality non-attainment area'
        end as reason
    from customers
    cross join grants
    left join grant_eligibility_criteria
        on grant_eligibility_criteria.grant_name = grants.name
    where grant_eligibility_criteria.eligibility_code = 'e0005'

    union all

    -- e0006: Eligible for state transit assistance
    select
        customers.name as customer_name,
        grants.name as grant_name,
        'e0006' as eligibility_code,
        customers.can_receive_state_transit_assistance as is_eligible,
        case when customers.can_receive_state_transit_assistance
            then 'Customer is eligible for state transit assistance'
            else 'Customer is not eligible for state transit assistance'
        end as reason
    from customers
    cross join grants
    left join grant_eligibility_criteria
        on grant_eligibility_criteria.grant_name = grants.name
    where grant_eligibility_criteria.eligibility_code = 'e0006'

    union all

    -- e0007: Service area is in Federally designated Trade Corridors of
    --        National and Regional Significance on California's portion of the
    --        National Highway Freight Network as identified in the California
    --        Freight Mobility Plan and along other corridors with a high
    --        volume of freight movement
    select
        customers.name as customer_name,
        grants.name as grant_name,
        'e0007' as eligibility_code,
        customers.has_service_along_freight_corridors as is_eligible,
        case when customers.has_service_along_freight_corridors
            then 'Customer has service along trade and/or freight corridors'
            else 'Customer does not have service along trade and/or freight corridors'
        end as reason
    from customers
    cross join grants
    left join grant_eligibility_criteria
        on grant_eligibility_criteria.grant_name = grants.name
    where grant_eligibility_criteria.eligibility_code = 'e0007'
),

/*
    Next, aggregate the eligibility criteria for each customer and grant to
    determine whether the customer is eligible for the grant. If any of the
    criteria are null, the customer's eligibility for the grant is null, which
    means that their eligibility is gray. Otherwise, the customer's eligibility
    is the logical AND of all the individual criteria.
*/
customer_grant_eligibility as (
    select
        customer_name,
        grant_name,
        case
            when sum(case when is_eligible is null then 1 else 0 end) > 0 then null
            else logical_and(is_eligible)
        end as is_eligible,
        array_agg(
            (select as struct eligibility_code, is_eligible, reason)
            order by eligibility_code
        ) as criteria
    from customer_grant_eligibility_criteria
    group by customer_name, grant_name
)

select *
from customer_grant_eligibility
order by customer_name, grant_name
