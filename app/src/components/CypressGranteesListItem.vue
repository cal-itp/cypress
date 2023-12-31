<template>
  <li :class="'grantee ' + eligibilityClasses()" tabindex="0" @keypress.enter="toggleDetailVisibility" @click="toggleDetailVisibility">
    <h3>{{ customer.name }}</h3>
    <span v-if="isGrantSelected" class="overall-determination">{{ overallDeterminationLabel() }} {{ isDetailVisible ? '⏶' : '⏷' }}</span>
    <div v-if="isGrantSelected && isDetailVisible" class="reasons">
      <ul>
        <li class="criterion" v-for="criterion in orderedEligibilityCriteria" :key="criterion.reason">
          <span class="determination-marker">
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
import { isCustomerEligible } from '../utils';

export default {
  props: {
    grant: {
      type: [Object, null],
      required: true,
    },
    customer: {
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
    isGrantSelected() {
      return !!this.grant;
    },

    eligibility() {
      const e = isCustomerEligible(this.customer, this.grant);
      return e;
    },

    orderedEligibilityCriteria() {
      return this.eligibility.criteria.slice().sort((a, b) => {
        const eligibilityOrder = {
          undefined: 0,
          false: 1,
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
      return !this.isGrantSelected         ? '' :
             this.eligibility.determination === true  ? 'Eligible' :
             this.eligibility.determination === false ? 'Ineligible' :
             this.eligibility.determination === null  ? 'Needs Review' :
                                                        'Not enough information...';
    },
    eligibilityClasses() {
      return !this.isGrantSelected         ? '' :
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
  display: flex;
  align-items: center;
  font-size: 0.9rem;
}

.grantee {
  display: grid;
  grid-template-areas:
    "name eligibility"
    "reasons reasons";
  grid-template-columns: 1fr auto;
  border: 1px dashed rgb(64 64 64 / 1);
  border-width: 0 0 1px 0;
  margin: 0;
  padding: 0.25rem;
  width: 100%;
  color: rgb(64 64 64 / 1);
  background-color: rgb(64 64 64 / 0.1);
  cursor: pointer;
}

.eligible {
  background-color: rgba(0, 192, 0, 0.1);
  color: green;
  border-style: solid;
}

.ineligible {
  background-color: rgba(192, 0, 0, 0.1);
  color: darkred;
  border-style: solid;
}

.needs-review {
  background-color: rgba(139 100 8 / 0.1);
  color: #8a6408;
  border-style: solid;
}

.pending {
  border-style: solid;
}

.overall-determination {
  grid-area: eligibility;
  display: flex;
  align-items: center;
  font-size: 0.9rem;
}

.toggle-detail-visibility {
  grid-area: toggle;
  font-size: 0.9rem;
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
  font-size: 0.6rem;
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
  font-size: 0.9rem;
}

.feedback {
  text-align: right;
  font-size: 0.8em;
  font-style: italic;
}
</style>
