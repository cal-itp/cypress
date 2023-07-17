<template>
  <div>
    <header>
      <h2>Grantees</h2>
    </header>

    <ol>
      <cypress-grantees-list-item
        v-for="customer in orderedCustomers"
        :grant="grant"
        :customer="customer"
        :key="customer.key"></cypress-grantees-list-item>
    </ol>
  </div>
</template>

<script>
import CypressGranteesListItem from './CypressGranteesListItem.vue';
import { isCustomerEligible } from '../utils';

export default {
  props: {
    customers: {
      type: Array,
      required: true,
    },
    grant: {
      type: [Object, null],
      required: true,
    },
  },

  computed: {
    orderedCustomers() {
      return this.customers.slice().sort((a, b) => {
        const eligibilityOrder = {
          true:  0,
          undefined: 1,
          null:  2,
          false: 3,
        };

        const aEligibility = this.grant ? eligibilityOrder[isCustomerEligible(a, this.grant).determination] : undefined;
        const bEligibility = this.grant ? eligibilityOrder[isCustomerEligible(b, this.grant).determination] : undefined;

        if (aEligibility !== bEligibility) {
          return aEligibility - bEligibility;
        } else {
          return a.name.localeCompare(b.name);
        }
      });
    },
  },

  components: {
    CypressGranteesListItem,
  },
};
</script>

<style scoped>
ol {
  padding: 0;
  list-style: none;
}
</style>