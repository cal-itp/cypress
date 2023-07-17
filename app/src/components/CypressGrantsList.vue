<template>
  <div>
    <header>
      <h2>Grants</h2>
    </header>

    <ol>
      <cypress-grants-list-item
        v-for="grant in orderedGrants"
        :grant="grant"
        :applicant-info="applicantInfo"
        :key="grant.name"></cypress-grants-list-item>
    </ol>
  </div>
</template>

<script>
import CypressGrantsListItem from './CypressGrantsListItem.vue';
import { isProjectEligible } from '../utils';

export default {
  props: {
    grants: {
      type: Array,
      required: true,
    },
    applicantInfo: {
      type: Object,
      required: true,
    },
  },

  computed: {
    orderedGrants() {
      return this.grants.slice().sort((a, b) => {
        const eligibilityOrder = {
          true:  0,
          undefined: 1,
          null:  2,
          false: 3,
        };

        const aEligibility = eligibilityOrder[isProjectEligible(this.applicantInfo, a).determination];
        const bEligibility = eligibilityOrder[isProjectEligible(this.applicantInfo, b).determination];

        if (aEligibility !== bEligibility) {
          return aEligibility - bEligibility;
        } else {
          return a.name.localeCompare(b.name);
        }
      });
    },
  },

  components: {
    CypressGrantsListItem,
  },
};
</script>

<style scoped>
ol {
  padding: 0;
  list-style: none;
}
</style>