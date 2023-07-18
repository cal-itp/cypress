import Papa from 'papaparse';

function papaParsePromise(fileOrUrl, config) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileOrUrl, {
      ...config,
      complete: resolve,
      error: reject,
    })
  })
}

async function fetchCustomers() {
  /* The customers dataset was generated by exporting the following query:

      select
        key,
        name,
        organization_type,
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

  */
  const results = await papaParsePromise('../stub_data/customers.csv', {
    header: true,
    download: true,
    skipEmptyLines: true,
  });

  const customers = results.data.map((row) => {
    const trinary = {
      'true': true,
      'false': false,
      'null': null,
      '': null,
    };

    return {
      ...row,
      has_service_to_non_urbanized_area: trinary[row.has_service_to_non_urbanized_area],
      has_service_connecting_urban_areas: trinary[row.has_service_connecting_urban_areas],
      has_service_in_non_attainment_area: trinary[row.has_service_in_non_attainment_area],
      can_receive_state_transit_assistance: trinary[row.can_receive_state_transit_assistance],
      has_service_along_freight_corridors: trinary[row.has_service_along_freight_corridors],
    }
  });

  return customers;
}

async function fetchGrants() {
  /*
    Each grant will have the following attributes from the table:
    - key
    - name
    - organization_type

    Additionally, each of the following attributes will be added to each
    grant by joining from additional tables:
    - eligiblePrimaryApplicantTypes (array of strings)
    - eligibleProjectBeneficiaries (array of strings)
    - eligibleProjectTypes (array of {type, needsAdditionalReview})
    - eligibilityCriteria (array of strings)
  */
  const grants = (await papaParsePromise('../stub_data/grants.csv', {
    header: true,
    download: true,
    skipEmptyLines: true,
  })).data;

  function groupBy(key) {
    return (acc, row) => {
      acc[row[key]] = acc[row[key]] || [];
      acc[row[key]].push(row);
      return acc;
    }
  }

  const grantEligiblePrimaryApplicantTypes = (await papaParsePromise('../stub_data/grant_eligible_applicant_types.csv', {
    header: true,
    download: true,
    skipEmptyLines: true,
  }))
  .data
  .reduce(groupBy('grant_name'), {});

  const grantEligibleSubApplicantTypes = (await papaParsePromise('../stub_data/grant_eligible_subapplicant_types.csv', {
    header: true,
    download: true,
    skipEmptyLines: true,
  }))
  .data
  .reduce(groupBy('grant_name'), {});

  const grantEligibleBeneficiaries = (await papaParsePromise('../stub_data/grant_eligible_project_beneficiaries.csv', {
    header: true,
    download: true,
    skipEmptyLines: true,
  }))
  .data
  .reduce(groupBy('grant_name'), {});

  const grantEligibleProjectTypes = (await papaParsePromise('../stub_data/grant_eligible_project_types.csv', {
    header: true,
    download: true,
    skipEmptyLines: true,
  }))
  .data
  .reduce(groupBy('grant_name'), {});

  const grantEligibilityCriteria = (await papaParsePromise('../stub_data/grant_eligibility_criteria.csv', {
    header: true,
    download: true,
    skipEmptyLines: true,
  }))
  .data
  .reduce(groupBy('grant_name'), {});

  for (const grant of grants) {
    grant.eligiblePrimaryApplicantTypes = (grantEligiblePrimaryApplicantTypes[grant.name] || []).map(row => row.entity_type);
    grant.eligibleSubApplicantTypes = (grantEligibleSubApplicantTypes[grant.name] || []).map(row => row.entity_type);
    grant.eligibleProjectBeneficiaries = (grantEligibleBeneficiaries[grant.name] || []).map(row => row.beneficiary);
    grant.eligibleProjectTypes = (grantEligibleProjectTypes[grant.name] || []).map(row => ({ type: row.project_type, needsAdditionalReview: ['true', 'yes', 'checked'].includes(row.needs_additional_review.toLowerCase()) }));
    grant.eligibilityCriteria = (grantEligibilityCriteria[grant.name] || []).map(row => row.eligibility_code);
  }

  return grants;
}

async function fetchCritieria() {
  const results = await papaParsePromise('../stub_data/eligibility_criteria.csv', {
    header: true,
    download: true,
    skipEmptyLines: true,
  });

  const criteria = results.data.map((row) => {
    const binary = {
      'checked': true,
      '': false,
    };

    return {
      ...row,
      is_project_specific: binary[row.is_project_specific.toLowerCase()],
    }
  });

  return criteria;
}

/*
  All eligibility functions should return an object with the following properties:
  - determination: true (eligible), false (ineligible), null (needs human review), or undefined (needs more information)
  - reason: a string explaining the determination
*/

function checkApplicantType(applicant, eligibleTypes) {
  /*
  We will use the same mapping of entity types as in the customer_grant_eligibility
  SQL query:
  - Non-Profit Organization: private non-profit
  - Company: private for-profit
  - Independent Agency: transit agency
  - County: county, local government
  - Tribe: indian tribal government
  - City/Town: city, local government
  - Federal Government: (not eligible)
  - University - Public: school
  - University - Private: school
  - Community College: school
  - MPO/RTPA: mpo, rtpa
  - Joint Powers Agency: joint powers authority
  - Council of Governments: mpo
  */

  applicant = applicant || {};
  eligibleTypes = eligibleTypes || [];

  let determination;
  switch (applicant.organization_type) {
    case 'Non-Profit Organization':
      determination = eligibleTypes.includes('private non-profit');
      break;

    case 'Company':
      determination = eligibleTypes.includes('private for-profit');
      break;

    case 'Independent Agency':
      determination = eligibleTypes.includes('transit agency');
      break;

    case 'County':
      determination = eligibleTypes.includes('county') || eligibleTypes.includes('local government');
      break;

    case 'Tribe':
      determination = eligibleTypes.includes('indian tribal government');
      break;

    case 'City/Town':
      determination = eligibleTypes.includes('city') || eligibleTypes.includes('local government');
      break;

    case 'Federal Government':
      determination = false;
      break;

    case 'University - Public':
    case 'University - Private':
    case 'Community College':
      determination = eligibleTypes.includes('school');
      break;

    case 'MPO/RTPA':
      determination = eligibleTypes.includes('mpo') || eligibleTypes.includes('rtpa');
      break;

    case 'Joint Powers Agency':
      determination = eligibleTypes.includes('joint powers authority');
      break;

    case 'Council of Governments':
      determination = eligibleTypes.includes('mpo');
      break;

    case undefined:
      determination = undefined;
      break;

    default:
      determination = null;
  }

  const reason = {
    true: `Applicant type "${applicant.organization_type}" corresponds to one of "${eligibleTypes.join('", "')}".`,
    false: `Applicant type "${applicant.organization_type}" does not correspond to any of "${eligibleTypes.join('", "')}".`,
    null: `Applicant type "${applicant.organization_type}" is not well understood.`,
    undefined: `Applicant type is not specified; only the following are elligible: "${eligibleTypes.join('", "')}".`,
  }[determination]

  return { determination, reason };
}

function e0001PrimaryApplicantTypeEligibility(applicant, eligibleTypes) {
  return checkApplicantType(applicant, eligibleTypes);
}

function e0002SubApplicantTypeEligibility(subapplicant, eligibleTypes) {
  let { determination, reason } = checkApplicantType(subapplicant, eligibleTypes);
  reason = reason.replace('Applicant', 'Subapplicant');
  return { determination, reason };
}

function e0003HasServiceToNonUrbanizedArea(applicant) {
  const determination = applicant.has_service_to_non_urbanized_area;
  const reason = {
    true: 'Applicant has service to non-urbanized areas.',
    false: 'Applicant does not have service to non-urbanized areas.',
    null: 'Applicant may not have service to non-urbanized areas.',
  }[determination];
  return { determination, reason };
}

function e0004HasServiceConnectingUrbanAreas(applicant) {
  const determination = applicant.has_service_connecting_urban_areas;
  const reason = {
    true: 'Applicant has service connecting urban areas.',
    false: 'Applicant does not have service connecting urban areas.',
    null: 'Applicant may not have service connecting urban areas.',
  }[determination];
  return { determination, reason };
}

function e0005HasServiceInNonAttainmentArea(applicant) {
  const determination = applicant.has_service_in_non_attainment_area;
  const reason = {
    true: 'Applicant has service in non-attainment area.',
    false: 'Applicant does not have service in non-attainment area.',
    null: 'Applicant may not have service in non-attainment area.',
  }[determination];
  return { determination, reason };
}

function e0006CanReceiveStateTransitAssistance(applicant) {
  const determination = applicant.can_receive_state_transit_assistance;
  const reason = {
    true: 'Applicant can receive state transit assistance.',
    false: 'Applicant cannot receive state transit assistance.',
    null: 'Applicant may not be able to receive state transit assistance.',
  }[determination];
  return { determination, reason };
}

function e0007HasServiceAlongFreightCorridors(applicant) {
  const determination = applicant.has_service_along_freight_corridors;
  const reason = {
    true: 'Applicant has service along trade and/or freight corridors.',
    false: 'Applicant does not have service along trade and/or freight corridors.',
    null: 'Applicant may not have service along trade and/or freight corridors.',
  }[determination];
  return { determination, reason };
}

function e0008ProjectBeneficiariesEligibility(beneficiaries, eligibleBeneficiaries) {
  // Is there overlap between the project beneficiaries and the eligible beneficiaries?
  const determination = beneficiaries.length > 0 ? beneficiaries.some(b => eligibleBeneficiaries.includes(b)) : undefined;
  const reason = {
    true: `Project beneficiaries "${beneficiaries.join('", "')}" are in the list of eligible beneficiaries "${eligibleBeneficiaries.join('", "')}".`,
    false: `Project beneficiaries "${beneficiaries.join('", "')}" are not in the list of eligible beneficiaries "${eligibleBeneficiaries.join('", "')}".`,
    undefined: `Project beneficiaries are not specified; only the following are eligible: "${eligibleBeneficiaries.join('", "')}".`,
  }[determination];
  return { determination, reason };
}

function e0009ProjectTypeEligibility(projectTypes, eligibleProjectTypes) {
  const unqualifiedEligibleProjectTypes = eligibleProjectTypes.filter(t => !t.needsAdditionalReview);
  const qualifiedEligibleProjectTypes = eligibleProjectTypes.filter(t => t.needsAdditionalReview);

  // Is there overlap between the project types and the eligible project types?
  const determination = projectTypes.length <= 0 ? undefined :
                        projectTypes.some(t => unqualifiedEligibleProjectTypes.map(e => e.type).includes(t)) ? true :
                        projectTypes.some(t => qualifiedEligibleProjectTypes.map(e => e.type).includes(t)) ? null :
                        false;
  const reason = {
    true: `Project types "${projectTypes.join('", "')}" are in the list of eligible project types "${unqualifiedEligibleProjectTypes.map(t => t.type).join('", "')}".`,
    false: `Project types "${projectTypes.join('", "')}" are not in the list of eligible project types "${eligibleProjectTypes.map(t => t.type).join('", "')}".`,
    null: `Project types "${projectTypes.join('", "')}" require additional review and are not in the list of eligible project types "${qualifiedEligibleProjectTypes.map(t => t.type).join('", "')}".`,
    undefined: `Project types are not specified; only the following are eligible: "${eligibleProjectTypes.map(t => t.type).join('", "')}".`,
  }[determination];
  return { determination, reason };
}

function e0010BenefitsUnderservedCommunities(benefitsUnderservedCommunities) {
  const determination = benefitsUnderservedCommunities;
  const reason = {
    true: 'At least 50% of project benefits underserved communities.',
    false: 'Less than 50% of project benefits underserved communities.',
    null: 'Project may not benefit underserved communities.',
    undefined: 'Need to know whether project will benefit underserved communities.'
  }[determination];
  return { determination, reason };
}

function isCustomerEligible(customer, grant) {
  /*
  A customer is eligible if:
  - The customer's entity type is in the grant's eligible entity types
  - Any additional general criteria are met.
  */
  const criteriaCodes = grant.eligibilityCriteria;
  const criteria = [];
  if (criteriaCodes.includes('e0001')) {
    criteria.push(e0001PrimaryApplicantTypeEligibility(customer, grant.eligiblePrimaryApplicantTypes));
  }
  if (criteriaCodes.includes('e0003')) {
    criteria.push(e0003HasServiceToNonUrbanizedArea(customer));
  }
  if (criteriaCodes.includes('e0004')) {
    criteria.push(e0004HasServiceConnectingUrbanAreas(customer));
  }
  if (criteriaCodes.includes('e0005')) {
    criteria.push(e0005HasServiceInNonAttainmentArea(customer));
  }
  if (criteriaCodes.includes('e0006')) {
    criteria.push(e0006CanReceiveStateTransitAssistance(customer));
  }
  if (criteriaCodes.includes('e0007')) {
    criteria.push(e0007HasServiceAlongFreightCorridors(customer));
  }

  // If any criterion is false, the customer is not eligible.
  if (criteria.some(c => c.determination === false)) {
    return { determination: false, criteria };
  }

  // If any criterion is undefined, we're missing some information to make a
  // determination.
  if (criteria.some(c => c.determination === undefined)) {
    return { determination: undefined, criteria };
  }

  // If any criterion is null, we've gathered all the information we can but
  // the application will need a human review.
  if (criteria.some(c => c.determination === null)) {
    return { determination: null, criteria };
  }

  // If all criteria are true, the customer is eligible.
  return { determination: true, criteria };
}

function isProjectEligible(applicantInfo, grant) {
  /*
  A project is eligible if:
  - The customer's entity type is in the grant's eligible entity types
  - The sub applicant's entity type is in the grant's eligible entity types
  - The project type is in the grant's eligible project types
  - The beneficiaries are in the grant's eligible beneficiaries
  - Any additional project-specific criteria are met.
  */
  const criteriaCodes = grant.eligibilityCriteria;
  const criteria = [];
  if (criteriaCodes.includes('e0001')) {
    criteria.push(e0001PrimaryApplicantTypeEligibility(applicantInfo.primaryApplicant, grant.eligiblePrimaryApplicantTypes));
  }
  if (criteriaCodes.includes('e0002')) {
    criteria.push(e0002SubApplicantTypeEligibility(applicantInfo.subApplicant, grant.eligibleSubApplicantTypes));
  }
  if (criteriaCodes.includes('e0003')) {
    criteria.push(e0003HasServiceToNonUrbanizedArea(applicantInfo.primaryApplicant || {}));
  }
  if (criteriaCodes.includes('e0004')) {
    criteria.push(e0004HasServiceConnectingUrbanAreas(applicantInfo.primaryApplicant || {}));
  }
  if (criteriaCodes.includes('e0005')) {
    criteria.push(e0005HasServiceInNonAttainmentArea(applicantInfo.primaryApplicant || {}));
  }
  if (criteriaCodes.includes('e0006')) {
    criteria.push(e0006CanReceiveStateTransitAssistance(applicantInfo.primaryApplicant || {}));
  }
  if (criteriaCodes.includes('e0007')) {
    criteria.push(e0007HasServiceAlongFreightCorridors(applicantInfo.primaryApplicant || {}));
  }
  if (criteriaCodes.includes('e0008')) {
    criteria.push(e0008ProjectBeneficiariesEligibility(applicantInfo.projectBeneficiaries, grant.eligibleProjectBeneficiaries));
  }
  if (criteriaCodes.includes('e0009')) {
    criteria.push(e0009ProjectTypeEligibility(applicantInfo.projectTypes, grant.eligibleProjectTypes));
  }
  if (criteriaCodes.includes('e0010')) {
    criteria.push(e0010BenefitsUnderservedCommunities(applicantInfo.projectBenefitsUnderservedCommunities));
  }

  // If any criterion is false, the project is not eligible.
  if (criteria.some(c => c.determination === false)) {
    return { determination: false, criteria };
  }

  // If any criterion is undefined, we're missing some information to make a
  // determination.
  if (criteria.some(c => c.determination === undefined)) {
    return { determination: undefined, criteria };
  }

  // If any criterion is null, we've gathered all the information we can but
  // the application will need a human review.
  if (criteria.some(c => c.determination === null)) {
    return { determination: null, criteria };
  }

  // If all criteria are true, the project is eligible.
  return { determination: true, criteria };
}

export {
  papaParsePromise,
  fetchCustomers,
  fetchGrants,
  fetchCritieria,
  isCustomerEligible,
  isProjectEligible,
};
