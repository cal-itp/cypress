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

/*
  All eligibility functions should return an object with the following properties:
  - determination: true (eligible), false (ineligible), null (needs human review), or undefined (needs more information)
  - reason: a string explaining the determination
*/

function e0001PrimaryApplicantTypeEligibility(applicant, eligibleTypes) {
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
  - Joint Powers Agency: transit agency
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
      determination = eligibleTypes.includes('transit agency');
      break;

    case 'Council of Governments':
      determination = eligibleTypes.includes('mpo');
      break;

    default:
      determination = null;
  }

  const reason = applicant.organization_type
    ? {
        true: `Applicant type "${applicant.organization_type}" corresponds to one of "${eligibleTypes.join('", "')}".`,
        false: `Applicant type "${applicant.organization_type}" does not correspond to any of "${eligibleTypes.join('", "')}".`,
        null: `Applicant type "${applicant.organization_type}" is not well understood.`,
      }[determination]
    : 'Applicant type is not specified.';

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
    undefined: 'Project beneficiaries are not specified.',
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
    undefined: 'Project types are not specified.',
  }[determination];
  return { determination, reason };
}

function isApplicantEligible(applicantInfo, grant) {
  /*
  An applicant is eligible if:
  - The primary applicant's entity type is in the grant's eligible entity types
  - The sub applicant's entity type is in the grant's eligible entity types
  - The project type is in the grant's eligible project types
  - The beneficiaries are in the grant's eligible beneficiaries
  - Any additional criteria are met.
  */
  const criteriaCodes = grant.eligibilityCriteria;
  const criteria = [];
  if (criteriaCodes.includes('e0001')) {
    criteria.push(e0001PrimaryApplicantTypeEligibility(applicantInfo.primaryApplicant, grant.eligiblePrimaryApplicantTypes));
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

  for (const criterion of criteria) {
    // If any criterion is false, the applicant is not eligible.
    if (criterion.determination === false) {
      return { determination: false, criteria}
    }

    // If any criterion is undefined, we're missing some information to make a
    // determination.
    if (criterion.determination === undefined) {
      return { determination: undefined, criteria}
    }

    // If any criterion is null, we've gathered all the information we can but
    // the application will need a human review.
    if (criterion.determination === null) {
      return { determination: null, criteria}
    }
  }

  // If all criteria are true, the applicant is eligible.
  return { determination: true, criteria };
}

export {
  papaParsePromise,
  isApplicantEligible,
};
