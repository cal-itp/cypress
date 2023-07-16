<template>
  <li :class="eligibilityClasses()">
    <h3>{{ grant.name }}</h3>
    <span v-if="isPrimaryApplicantSelected" class="eligiblility">{{ eligibilityLabel() }}</span>
    <div v-if="isPrimaryApplicantSelected" class="toggle-detail-visibility">
      <button @click="toggleDetailVisibility">
        {{ isDetailVisible ? 'Hide' : 'Show' }} reasons
      </button>
    </div>
    <div v-if="isPrimaryApplicantSelected && isDetailVisible" class="reasons">
      <ul>
        <li v-for="criterion in eligibility.criteria" :key="criterion.reason">
          {{ criterion.determination === true  ? '✓' :
             criterion.determination === false ? '✗' :
             criterion.determination === null  ? '?' :
                                                 '...' }}
          {{ criterion.reason }}
        </li>
      </ul>
    </div>
  </li>
</template>

<script>
import { isApplicantEligible } from '../utils';

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
      const e = isApplicantEligible(this.applicantInfo, this.grant);
      return e;
    },
  },
  methods: {
    toggleDetailVisibility() {
      this.isDetailVisible = !this.isDetailVisible;
    },
    eligibilityLabel() {
      return !this.isPrimaryApplicantSelected         ? '' :
             this.eligibility.determination === true  ? 'Eligible' :
             this.eligibility.determination === false ? 'Ineligible' :
             this.eligibility.determination === null  ? 'Needs Review' :
                                                        'Not enough information...';
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
.eligible {
  color: green;
}

.ineligible {
  color: red;
}

.needs-review {
  color: orange;
}

.pending {
  color: gray;
}
</style>
