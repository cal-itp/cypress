<template>
  <li :class="'grant ' + eligibilityClasses()">
    <h3>{{ grant.name }}</h3>
    <span v-if="isPrimaryApplicantSelected" class="overall-determination" v-html="overallDeterminationLabel()"></span>
    <div v-if="isPrimaryApplicantSelected" class="toggle-detail-visibility">
      <button class="toggle-reasons-button" @click="toggleDetailVisibility">
        ({{ isDetailVisible ? 'Hide' : 'Show' }} reasons)
      </button>
    </div>
    <div v-if="isPrimaryApplicantSelected && isDetailVisible" class="reasons">
      <ul>
        <li class="criterion" v-for="criterion in orderedEligibilityCriteria" :key="criterion.reason">
          <span class="determination-marker"
                :aria-label="criterion.determination === true  ? 'Satisfied' :
                            criterion.determination === false ? 'Not Satisfied' :
                            criterion.determination === null  ? 'Needs Review' :
                                                                'Needs More Info'">
            {{ criterion.determination === true  ? '✓' :
              criterion.determination === false ? '✗' :
              criterion.determination === null  ? '?' :
                                                  '...' }}
          </span>
          <span class="reason">
            {{ criterion.reason }}
          </span>
        </li>
      </ul>
      <p class="feedback">See something wrong? <a href="..." target="_blank">Report it.</a></p>
    </div>
  </li>
</template>

<script>
import { isProjectEligible } from '../utils';

export default {
  props: {
    grant: {
      type: Object,
      required: true,
    },
    applicantInfo: {
      type: Object,
      required: true,
    },
    eligibilityReasons: {
      type: Array,
      required: false,
      default: () => [],
    }
  },
  data() {
    return {
      isDetailVisible: false,
    };
  },
  computed: {
    isPrimaryApplicantSelected() {
      return !!this.applicantInfo.primaryApplicant;
    },

    eligibility() {
      const e = isProjectEligible(this.applicantInfo, this.grant);
      return e;
    },

    orderedEligibilityCriteria() {
      return this.eligibility.criteria.slice().sort((a, b) => {
        const eligibilityOrder = {
          false: 0,
          undefined: 1,
          null:  2,
          true:  3,
        };
        const aEligibility = eligibilityOrder[a.determination];
        const bEligibility = eligibilityOrder[b.determination];

        if (aEligibility !== bEligibility) {
          return aEligibility - bEligibility;
        } else {
          return a.reason.localeCompare(b.reason);
        }
      });
    },
  },
  methods: {
    toggleDetailVisibility() {
      this.isDetailVisible = !this.isDetailVisible;
    },
    overallDeterminationLabel() {
      return !this.isPrimaryApplicantSelected         ? '' :
             this.eligibility.determination === true  ? 'Eligible' :
             this.eligibility.determination === false ? 'Ineligible' :
             this.eligibility.determination === null  ? 'Needs Review' :
                                                        'May be eligible;<br>more info needed...';
    },
    eligibilityClasses() {
      return !this.isPrimaryApplicantSelected         ? '' :
             this.eligibility.determination === true  ? 'eligible' :
             this.eligibility.determination === false ? 'ineligible' :
             this.eligibility.determination === null  ? 'needs-review' :
                                                        'pending';
    },
  },
};
</script>

<style scoped>
h3 {
  grid-area: name;
  margin: 0;
  font-size: 1rem;
}

.grant {
  display: grid;
  grid-template-areas:
    "name eligibility"
    "toggle toggle"
    "reasons reasons";
  grid-template-columns: 1fr auto;
  border: 1px dashed rgba(64, 64, 64, 1);
  margin: 0.5rem 0;
  padding: 0.5rem;
  width: 20rem;
  color: rgba(64 , 64, 64, 1);
  background-color: rgba(64, 64, 64, 0.1);
}

.eligible {
  background-color: rgba(0, 192, 0, 0.1);
  color: green;
  border-color: green;
  border-style: solid;
}

.ineligible {
  background-color: rgba(192, 0, 0, 0.1);
  color: darkred;
  border-color: darkred;
  border-style: solid;
}

.needs-review {
  background-color: rgba(139 100 8 / 0.1);
  color: #8a6408;
  border-color: #8a6408;
  border-style: solid;
}

.pending {
  border-style: solid;
}

.overall-determination {
  grid-area: eligibility;
  display: flex;
  align-items: center;
  font-size: 0.8rem;
}

.toggle-detail-visibility {
  grid-area: toggle;
  padding-top: 0.5rem;
}

.toggle-reasons-button {
  width: 100%;
  background-color: transparent;
  border: none;
  color: inherit;
  text-decoration: underline;
  text-transform: lowercase;
  text-align: center;
  cursor: pointer;
}

ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.criterion {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
}

.determination-marker {
  display: block;
  min-width: 1.5rem;
  text-align: left;
}

.reasons {
  grid-area: reasons;
  padding-top: 0.15rem;
  font-size: 0.8rem;
}

.feedback {
  text-align: right;
  font-size: 0.8em;
  font-style: italic;
}
</style>
